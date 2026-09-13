"use client";

import { useEffect, useRef } from "react";

import { useHockeyMotionPreference, setHockeyMotionPaused } from "./hockey-motion-preference";

/** Finite text entrances only. Content remains visible before enhancement;
 * observers discover filtered/dynamically mounted headings and all work is
 * disposed on navigation. No images, hit targets, scrolling or layout moves. */
export default function HockeyMotion() {
  const button = useRef<HTMLButtonElement>(null);
  const preference = useHockeyMotionPreference();
  const paused = preference !== "playing";
  useEffect(() => {
    const shell = button.current?.closest<HTMLElement>(".hockey-interior");
    const main = shell?.querySelector("main");
    if (!shell || !main) return;
    shell.classList.toggle("hockey-motion-off", paused);
    const animations = new Map<Element, Animation>();
    const seen = new WeakSet<Element>();
    if (paused || !window.IntersectionObserver) return () => shell.classList.remove("hockey-motion-off");
    const settle = (target: Element) => {
      animations.get(target)?.cancel();
      animations.delete(target);
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (entry.target.contains(document.activeElement)) continue;
        const animation = entry.target.animate([
          { opacity: .4, transform: "translateY(18px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration: 620, easing: "cubic-bezier(.22,1,.36,1)" });
        animations.set(entry.target, animation);
        animation.finished.then(() => settle(entry.target)).catch(() => {});
      }
    }, { threshold: .15 });
    const discover = () => {
      main.querySelectorAll("h1,h2,h3").forEach(title => {
        if (seen.has(title) || title.closest("dialog,[role=dialog],.position-scene,button,summary")) return;
        seen.add(title);
        observer.observe(title);
      });
    };
    const finishOnFocus = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      for (const heading of animations.keys()) if (heading.contains(target)) settle(heading);
    };
    main.addEventListener("focusin", finishOnFocus);
    main.addEventListener("pointerover", finishOnFocus);
    const changes = new MutationObserver(discover);
    changes.observe(main, { subtree: true, childList: true });
    discover();
    return () => {
      observer.disconnect();
      changes.disconnect();
      animations.forEach(animation => animation.cancel());
      main.removeEventListener("focusin", finishOnFocus);
      main.removeEventListener("pointerover", finishOnFocus);
      shell.classList.remove("hockey-motion-off");
    };
  }, [paused]);
  function toggle() { setHockeyMotionPaused(!paused); }
  return <button ref={button} type="button" className="hockey-motion-toggle" onClick={toggle} disabled={preference === "reduced"} aria-pressed={paused} aria-label={preference === "reduced" ? "Reduced motion enabled" : paused ? "Resume page animations" : "Pause page animations"}>{preference === "reduced" ? "Reduced motion" : paused ? "Resume motion" : "Pause motion"}</button>;
}
