// Shared by the server layout (pre-paint gate script) and the client SplashScreen.
// Kept free of "use client" so the values are real strings on both sides.

/** Web copy of media/team/b-roll/loading-flash.mov — see SplashScreen.tsx. */
export const SPLASH_SRC = "/videos/splash/loading-flash.mp4";

/** sessionStorage flag: the opener has played in this browser session. */
export const SPLASH_SESSION_KEY = "bardownski:splash-seen";
