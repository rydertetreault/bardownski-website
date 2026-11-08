"use client";
import { useEffect, useRef, useState } from "react";
import SubscribeForm from "./SubscribeForm";

export const PROMPT_NEVER_KEY = "bd-subscribe-prompt"; // localStorage: "never" or "subscribed"
export const PROMPT_SESSION_KEY = "bd-subscribe-prompt-closed"; // sessionStorage: closed this visit
export const PROMPT_DELAY_MS = 8000; // after the splash opener (max 6 s) has cleared

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
    const timer = setTimeout(() => {
      const dialog = ref.current;
      if (dialog && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
    }, PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
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
