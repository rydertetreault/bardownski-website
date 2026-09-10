"use client";

import { useEffect } from "react";

/** Native scrolling only: no wheel interception, and all content is visible without JS. */
export default function SeasonMotion() {
  useEffect(() => {
    const root = document.getElementById("season-recap");
    if (!root) return;
    const stage = root.querySelector<HTMLElement>("#mvp-stage")!;
    const toggle = root.querySelector<HTMLButtonElement>(".motion-toggle")!;
    const replay = root.querySelector<HTMLButtonElement>(".replay-curtain")!;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>(".hero,.stats,.story,#awards,.next"),
    );
    const cards = Array.from(
      root.querySelectorAll<HTMLElement>(
        ".stats>div,.awards>article,.award-stack article,.standouts article,.next-grid article",
      ),
    );
    const reveals = root.querySelectorAll(
      ".story-image,.story>article,#awards .section-head,.next .section-head",
    );
    [...cards, ...reveals].forEach((el) => el.classList.add("scroll-reveal"));
    let paused = false;
    let enabled = false;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observer: IntersectionObserver | undefined;
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    const progress = document.createElement("div");
    progress.className = "film-progress";
    progress.setAttribute("aria-hidden", "true");
    root.append(progress);
    // Measure untransformed layout so scroll transforms never feed back into progress.
    function layoutTop(el: HTMLElement) {
      let top = 0;
      let node: HTMLElement | null = el;
      while (node) {
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return top;
    }
    function paint() {
      frame = 0;
      if (!root || !enabled) return;
      const vh = innerHeight;
      progress.style.setProperty(
        "--film-progress",
        String(
          clamp(
            scrollY / Math.max(1, document.documentElement.scrollHeight - vh),
          ),
        ),
      );
      sections.forEach((el) => {
        const top = layoutTop(el) - scrollY;
        el.style.setProperty(
          "--entry",
          String(clamp((vh * 0.94 - top) / (vh * 0.66))),
        );
        el.style.setProperty(
          "--through",
          String(clamp((vh - top) / (vh + el.offsetHeight))),
        );
        if (el.matches(".hero"))
          el.style.setProperty(
            "--exit",
            String(clamp((72 - top) / (el.offsetHeight * 0.95))),
          );
      });
      cards.forEach((el, i) => {
        el.style.setProperty(
          "--card",
          String(
            clamp(
              (vh * 0.96 - (layoutTop(el) - scrollY)) /
                Math.min(vh * 0.55, 360),
            ),
          ),
        );
        el.style.setProperty("--direction", i % 2 ? "-1" : "1");
      });
      root.querySelectorAll<HTMLElement>(".film-interlude").forEach((el) => {
        el.style.setProperty(
          "--pass",
          String(clamp((vh * 0.9 - (layoutTop(el) - scrollY)) / (vh * 0.75))),
        );
      });
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(paint);
    }
    function configure() {
      enabled = !paused && !media.matches;
      root!.classList.toggle("motion-enabled", enabled);
      toggle.textContent = media.matches
        ? "Reduced motion enabled"
        : enabled
          ? "Pause animations"
          : "Enable animations";
      toggle.disabled = media.matches;
      toggle.setAttribute("aria-pressed", String(!enabled));
      replay.hidden = !enabled;
      progress.hidden = !enabled;
      observer?.disconnect();
      clearTimeout(timer);
      replay.disabled = false;
      if (enabled) {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              stage.classList.add("revealed");
              observer?.disconnect();
            }
          },
          { threshold: 0.12 },
        );
        observer.observe(stage);
      } else stage.classList.add("revealed");
      schedule();
    }
    function pause() {
      paused = !paused;
      configure();
    }
    function replayReveal() {
      if (!enabled) return;
      stage.scrollIntoView({ behavior: "smooth", block: "start" });
      observer?.disconnect();
      stage.classList.remove("revealed");
      replay.disabled = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        stage.classList.add("revealed");
        replay.disabled = false;
      }, 1900);
    }
    // Keyboard users must never focus a link in an unrevealed/translated section.
    function focusReveal() {
      if (!enabled) return;
      root!.classList.add("keyboard-reading");
    }
    toggle.addEventListener("click", pause);
    replay.addEventListener("click", replayReveal);
    root.addEventListener("focusin", focusReveal);
    media.addEventListener("change", configure);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    configure();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      observer?.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", configure);
      toggle.removeEventListener("click", pause);
      replay.removeEventListener("click", replayReveal);
      root.removeEventListener("focusin", focusReveal);
      root.classList.remove("motion-enabled", "keyboard-reading");
      progress.remove();
    };
  }, []);
  return null;
}
