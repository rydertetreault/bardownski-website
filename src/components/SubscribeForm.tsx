"use client";
import { useId, useState } from "react";

export default function SubscribeForm({ onSent }: { onSent?: () => void } = {}) {
  const emailId = useId();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), topics: form.getAll("topics"), website: form.get("website") }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok) { setState("sent"); onSent?.(); return; }
    setState("error");
    setMessage(body?.error ?? "Something went wrong. Try again.");
  }

  if (state === "sent") return <p className="subscribe-done" role="status">Check your inbox for a confirmation link to finish signing up.</p>;
  return <form className="subscribe-form" onSubmit={submit}>
    <p className="subscribe-title">Get updates by email</p>
    <div className="subscribe-row">
      <label className="subscribe-sr" htmlFor={emailId}>Email address</label>
      <input id={emailId} name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      <button type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Subscribe"}</button>
    </div>
    <fieldset className="subscribe-topics">
      <legend className="subscribe-sr">Send me</legend>
      <label><input type="checkbox" name="topics" value="articles" defaultChecked /> New articles</label>
      <label><input type="checkbox" name="topics" value="potw" defaultChecked /> Player of the Week</label>
      <label><input type="checkbox" name="topics" value="mvp" defaultChecked /> MVP race lead changes</label>
      <label><input type="checkbox" name="topics" value="records" defaultChecked /> Broken club records</label>
    </fieldset>
    <input className="subscribe-trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    {state === "error" && <p className="subscribe-error" role="alert">{message}</p>}
  </form>;
}
