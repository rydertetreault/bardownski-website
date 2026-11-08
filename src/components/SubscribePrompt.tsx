"use client";
import { useEffect, useRef, useState } from "react";
import SubscribeForm from "./SubscribeForm";
import { isSplashDone, SPLASH_DONE_EVENT } from "./layout/splash-config";

export const PROMPT_NEVER_KEY = "bd-subscribe-prompt"; // localStorage: "never" or "subscribed"
export const PROMPT_SESSION_KEY = "bd-subscribe-prompt-closed"; // sessionStorage: closed this visit
export const PROMPT_DELAY_MS = 1200; // after the splash opener has cleared
export const PROMPT_FALLBACK_MS = 7000; // if the opener never reports in

function store(kind: "local" | "session", key: string, value?: string): string | null {
  try {
    const s = kind === "local" ? localStorage : sessionStorage;
    if (value !== undefined) s.setItem(key, value);
    return s.getItem(key);
  } catch { return null; }
}

/** Homepage signup prompt. × / Esc hides it for this visit; "Don't ask again" or subscribing hides it for good. */
export default function SubscribePrompt() {
  const ref = useRef<HTMLDialogElement>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (store("local", PROMPT_NEVER_KEY) || store("session", PROMPT_SESSION_KEY)) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let shown = false; // opens once per page load, even if the fallback timer fires later
    const open = () => {
      if (shown) return;
      shown = true;
      const dialog = ref.current;
      if (dialog && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
    };
    const afterSplash = () => { timers.push(setTimeout(open, PROMPT_DELAY_MS)); };
    if (isSplashDone()) afterSplash();
    else {
      window.addEventListener(SPLASH_DONE_EVENT, afterSplash, { once: true });
      timers.push(setTimeout(open, PROMPT_FALLBACK_MS));
    }
    return () => { timers.forEach(clearTimeout); window.removeEventListener(SPLASH_DONE_EVENT, afterSplash); };
  }, []);

  const close = (forever = false) => {
    store("session", PROMPT_SESSION_KEY, "1");
    if (forever) store("local", PROMPT_NEVER_KEY, "never");
    ref.current?.close();
  };

  return <dialog ref={ref} className="subscribe-prompt" aria-labelledby="subscribe-prompt-title"
    onCancel={e => { e.preventDefault(); close(); }}
    onClick={e => { if (e.target === ref.current) close(); }}>
    <div className="subscribe-prompt-card">
      <button type="button" className="subscribe-prompt-x" aria-label="Close" onClick={() => close()}>×</button>
      <p className="subscribe-prompt-eyebrow">Bardownski Hockey Club</p>
      <h2 id="subscribe-prompt-title">Never miss a story.</h2>
      <p className="subscribe-prompt-text">Get an email when a new article drops, the Player of the Week is crowned, the MVP race gets a new leader or a club record falls.</p>
      <SubscribeForm onSent={() => { setSent(true); store("local", PROMPT_NEVER_KEY, "subscribed"); }} />
      {sent
        ? <button type="button" className="subscribe-prompt-never" onClick={() => close()}>Close</button>
        : <button type="button" className="subscribe-prompt-never" onClick={() => close(true)}>Don&apos;t ask again</button>}
    </div>
  </dialog>;
}
