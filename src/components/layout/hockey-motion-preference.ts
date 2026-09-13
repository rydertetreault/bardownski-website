"use client";

import { useSyncExternalStore } from "react";

export const HOCKEY_MOTION_KEY = "bd-home-motion";
export const HOCKEY_MOTION_EVENT = "bardownski-motion-change";
const query = "(prefers-reduced-motion: reduce)";
let fallback: "paused" | "playing" | null = null;
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  const storage = () => { fallback = null; callback(); };
  window.addEventListener("storage", storage);
  window.addEventListener(HOCKEY_MOTION_EVENT, callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(HOCKEY_MOTION_EVENT, callback);
    media.removeEventListener("change", callback);
  };
}
function snapshot() {
  if (window.matchMedia(query).matches) return "reduced";
  if (fallback) return fallback;
  try { return localStorage.getItem(HOCKEY_MOTION_KEY) === "paused" ? "paused" : "playing"; }
  catch { return "playing"; }
}
/** Storage is best-effort. Blocking it must never disable the pause control. */
export function setHockeyMotionPaused(paused: boolean) {
  fallback = paused ? "paused" : "playing";
  try { localStorage.setItem(HOCKEY_MOTION_KEY, fallback); fallback = null; } catch {}
  window.dispatchEvent(new Event(HOCKEY_MOTION_EVENT));
}
export function useHockeyMotionPreference() {
  return useSyncExternalStore(subscribe, snapshot, () => "playing");
}
export function useHockeyMotionPaused() {
  return useHockeyMotionPreference() !== "playing";
}
