import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

// Test the runtime itself, including callbacks that resolve AFTER disposal.
// Browser navigation alone usually misses the delayed document.fonts.ready race.
test("homepage runtime cannot revive observers, listeners or frames after disposal", () => {
  const source = readFileSync("src/components/homepage/runtime.js", "utf8");
  const counts = { observed: 0, disconnected: 0, callbacks: 0, canceled: 0, frames: 0 };
  const observers: FakeObserver[] = [];
  class FakeObserver {
    callback: () => void;
    constructor(callback: () => void) { this.callback = callback; observers.push(this); }
    observe(target: unknown) { if (target) counts.observed++; }
    disconnect() { counts.disconnected++; }
  }
  const target = new EventTarget();
  const pendingFrames = new Map<number, () => void>();
  const root = {
    matches: () => false,
    querySelector: () => null,
    querySelectorAll: () => [],
    getAnimations: () => [{ cancel() { counts.canceled++; } }],
    classList: { remove() {} },
  };
  const context = vm.createContext({
    document: { documentElement: {}, fonts: {} },
    window: {
      IntersectionObserver: FakeObserver,
      ResizeObserver: FakeObserver,
      MutationObserver: FakeObserver,
      requestAnimationFrame(callback: () => void) { const id = ++counts.frames; pendingFrames.set(id, callback); return id; },
      cancelAnimationFrame(id: number) { pendingFrames.delete(id); },
      matchMedia: () => target,
    },
  });
  vm.runInContext(source.replace("export function", "function"), context);
  const runtime = context.createHomeRuntime(root);
  const callback = () => counts.callbacks++;
  for (const name of ["IntersectionObserver", "ResizeObserver", "MutationObserver"]) {
    const observer = new runtime[name](callback);
    observer.observe(root);
  }
  runtime.listen(target, "click", callback);
  runtime.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", callback);
  runtime.requestAnimationFrame(callback);
  const lateFrame = [...pendingFrames.values()][0];
  assert.equal(runtime.active, true);
  target.dispatchEvent(new Event("click"));
  assert.equal(counts.callbacks, 1);
  runtime.dispose();
  assert.equal(runtime.active, false);
  assert.equal(counts.disconnected, 3);
  assert.equal(pendingFrames.size, 0);
  assert.equal(counts.canceled, 1);

  // Simulate a fonts.ready continuation seeing replacement DOM in the old root.
  for (const observer of observers) { observer.observe(root); observer.callback(); }
  lateFrame();
  runtime.listen(target, "click", callback);
  target.dispatchEvent(new Event("click"));
  target.dispatchEvent(new Event("change"));
  assert.equal(runtime.requestAnimationFrame(callback), 0);
  assert.equal(counts.observed, 3, "Disposed observers cannot observe replacement DOM");
  assert.equal(counts.callbacks, 1, "Stale callbacks and listeners do not run");
  assert.equal(counts.frames, 1, "Disposed runtime schedules no new frames");
  runtime.dispose();
  assert.equal(counts.disconnected, 3, "Cleanup is idempotent");
});
