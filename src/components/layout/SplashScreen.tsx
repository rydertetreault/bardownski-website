"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPLASH_SRC, SPLASH_SESSION_KEY } from "./splash-config";

/**
 * Site opener: the tail of the "loading flash" ident plays once per browser
 * session, then fades into the site.
 *
 * Web copy: /public/videos/splash/loading-flash.mp4 (≈0.6 MB, 720p30, silent) —
 * media/team/b-roll/loading-flash.mov from 16.6s to the end (≈2.4s):
 * streaks → flash → puck → BARDOWNSKI → out.
 *
 * Tap / click / any key skips. Timers cap the whole thing in case the video
 * never plays (autoplay blocked, slow network, error). The inline gate script
 * in app/layout.tsx hides the overlay before first paint when it has already
 * been seen this session, so reloads don't flash black.
 */
const START_GRACE_MS = 2500; // give up if playback hasn't started by then
const MAX_TOTAL_MS = 6000; // never hold the site longer than this

/* Decide once per page load whether the opener plays. Server render says
 * "undecided" (overlay present, matching the pre-paint gate); the client
 * snapshot is cached so later re-renders can't flip it mid-play. */
let decision: boolean | null = null;
const shouldPlay = (): boolean => {
  if (decision === null) {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SPLASH_SESSION_KEY) === "1";
    } catch {
      /* storage blocked — just play it */
    }
    decision = !seen && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return decision;
};
const noSubscribe = () => () => {};

export default function SplashScreen() {
  const enabled = useSyncExternalStore(noSubscribe, shouldPlay, () => null);
  const [done, setDone] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }

    const video = videoRef.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setDone(true);
    };

    // Lock scroll under the overlay so the page is where the user left it.
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    window.addEventListener("keydown", finish);
    window.addEventListener("pointerdown", finish);

    let started = false;
    const onPlaying = () => {
      started = true;
    };

    if (video) {
      video.addEventListener("playing", onPlaying);
      video.addEventListener("ended", finish);
      video.addEventListener("error", finish);
      video.muted = true;
      if (!video.paused && video.currentTime > 0) {
        started = true; // native autoplay already running before hydration
      } else {
        video.play().catch(() => {
          /* autoplay blocked → START_GRACE_MS lets the site through */
        });
      }
      later(() => {
        if (!started) finish();
      }, START_GRACE_MS);
    }
    later(finish, video ? MAX_TOTAL_MS : 0);

    return () => {
      timers.forEach(clearTimeout);
      video?.removeEventListener("playing", onPlaying);
      video?.removeEventListener("ended", finish);
      video?.removeEventListener("error", finish);
      window.removeEventListener("keydown", finish);
      window.removeEventListener("pointerdown", finish);
      html.style.overflow = prevOverflow;
    };
  }, [enabled]);

  useEffect(() => {
    if (done) document.documentElement.style.overflow = "";
  }, [done]);

  // Already seen / reduced motion: drop straight out, no exit animation.
  if (enabled === false) return null;

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="site-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="site-splash fixed inset-0 z-[200] flex items-center justify-center"
          aria-hidden="true"
        >
          <video
            ref={videoRef}
            src={SPLASH_SRC}
            autoPlay
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            className="site-splash__video h-full w-full object-contain landscape:object-cover"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
