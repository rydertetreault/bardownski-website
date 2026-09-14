// All imperative enhancements are scoped to one homepage mount and disposed
// on navigation/Strict Mode remount. They never patch the real document/window.
export function createHomeRuntime(root) {
  let active = true;
  const disposers = [];
  const frames = new Set();
  const listeners = [];
  const listen = (target, type, callback, options) => {
    if (!active || !target) return;
    const handler = (...args) => { if (active) callback(...args); };
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  };
  const documentScope = {
    body: root,
    documentElement: document.documentElement,
    querySelector: selector => root.matches(selector) ? root : root.querySelector(selector),
    querySelectorAll: selector => root.querySelectorAll(selector),
    getElementById: id => root.querySelector(`#${CSS.escape(id)}`),
    createElement: tag => document.createElement(tag),
    createElementNS: (ns, tag) => document.createElementNS(ns, tag),
    createTextNode: text => document.createTextNode(text),
    createDocumentFragment: () => document.createDocumentFragment(),
    createTreeWalker: (...args) => document.createTreeWalker(...args),
    get activeElement() { return document.activeElement; },
    get fonts() { return document.fonts; },
    addEventListener: (type, fn, options) => listen(root, type, fn, options),
    // Whole-document view transitions are intentionally unavailable: Chrome
    // snapshots the fixed site header and flashes it during the swap.
    startViewTransition: undefined,
  };
  function observerClass(Base) {
    return class extends Base {
      constructor(callback, options) {
        super((...args) => { if (active) callback(...args); }, options);
        disposers.push(() => this.disconnect());
      }
      observe(...args) {
        // A late fonts.ready continuation must not revive a disposed mount.
        if (active) return super.observe(...args);
      }
    };
  }
  const runtime = {
    get active() { return active; },
    document: documentScope,
    IntersectionObserver: observerClass(window.IntersectionObserver),
    ResizeObserver: observerClass(window.ResizeObserver),
    MutationObserver: observerClass(window.MutationObserver),
    requestAnimationFrame(callback) {
      if (!active) return 0;
      const id = window.requestAnimationFrame(time => { frames.delete(id); if (active) callback(time); });
      frames.add(id); return id;
    },
    matchMedia(query) {
      const media = window.matchMedia(query);
      return { get matches() { return media.matches; }, addEventListener: (type, fn) => listen(media, type, fn) };
    },
    addEventListener: (type, fn, options) => listen(window, type, fn, options),
    listen,
    onDispose: callback => disposers.push(callback),
    dispose() {
      if (!active) return;
      active = false;
      listeners.forEach(dispose => dispose());
      disposers.forEach(dispose => dispose());
      frames.forEach(id => window.cancelAnimationFrame(id));
      root.getAnimations({ subtree:true }).forEach(animation => animation.cancel());
      root.querySelectorAll('video').forEach(video => { video.pause(); video.removeAttribute('src'); video.querySelectorAll('source').forEach(el => el.remove()); video.load(); });
      root.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
      root.classList.remove('motion-enabled','motion-off','title-motion-ready','content-motion-enabled');
    },
  };
  return runtime;
}
