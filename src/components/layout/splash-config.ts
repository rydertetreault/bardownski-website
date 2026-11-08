// Shared by the server layout (pre-paint gate script) and the client SplashScreen.
// Kept free of "use client" so the values are real strings on both sides.

/** Web copy of media/team/b-roll/loading-flash.mov — see SplashScreen.tsx. */
export const SPLASH_SRC = "/videos/splash/loading-flash.mp4";

/** sessionStorage flag: the opener has played in this browser session. */
export const SPLASH_SESSION_KEY = "bardownski:splash-seen";

/** Window event (and flag) fired once the opener is gone, played or skipped. */
export const SPLASH_DONE_EVENT = "bardownski:splash-done";
export function signalSplashDone(): void {
  (window as Window & { __bdSplashDone?: boolean }).__bdSplashDone = true;
  window.dispatchEvent(new Event(SPLASH_DONE_EVENT));
}
export const isSplashDone = (): boolean => !!(window as Window & { __bdSplashDone?: boolean }).__bdSplashDone;
