"use client";

import { useEffect, useRef, useState } from "react";
import type { Match } from "@/types";
import type { MatchSeason } from "../hub-utils";
import MatchReport from "./MatchReport";

export type SelectedMatch = { match: Match; season: MatchSeason };

/** Native modal keeps the board, filters, pagination and scroll position in
 * place. Its links retain real URLs for open-in-new-tab and no-JS readers. */
export default function MatchDialog({ selected, onClose }: { selected: SelectedMatch; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ status: "loading" | "error" | "ready"; match: Match | null }>({ status: "loading", match: null });
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      returnFocus?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    fetch(`/api/matches/${encodeURIComponent(selected.match.id)}?season=${selected.season}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Report unavailable");
        const detail = await response.json();
        if (detail.season !== selected.season || detail.match?.id !== selected.match.id) throw new Error("Unexpected report");
        if (active) setState({ status: "ready", match: detail.match });
      })
      .catch(() => { if (active) setState({ status: "error", match: null }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [selected.match.id, selected.season, attempt]);

  return <dialog ref={dialog} className="hub-dialog" aria-labelledby="hub-dialog-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <div className="hub-dialog-toolbar"><span>Inside the match / {selected.season.replace("-", "–")}</span><button ref={closeButton} type="button" onClick={onClose} aria-label="Close match report">Back to matches <span aria-hidden="true">×</span></button></div>
    {state.status === "ready" && state.match ? <MatchReport match={state.match} season={selected.season} titleId="hub-dialog-title" /> : <div className="hub-dialog-message" aria-busy={state.status === "loading"}>
      <p className="hub-eyebrow">Bardownski vs {selected.match.opponent}</p><h2 id="hub-dialog-title">{state.status === "loading" ? "Opening the match report…" : "The report couldn’t be loaded."}</h2><p role="status">{state.status === "loading" ? "Getting the recap, team stats and player performances." : "Your place on the match board is saved. Try again or close this report to keep browsing."}</p>
      {state.status === "error" && <button type="button" className="hub-button hub-button-outline" onClick={() => { setState({ status: "loading", match: null }); setAttempt(value => value + 1); }}>Try again ↗</button>}
    </div>}
  </dialog>;
}
