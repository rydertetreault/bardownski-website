"use client";

import { getMonochromePoster } from "@/lib/photo-posters";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { PlayerHighlights, PlayerClip } from "./highlights-data";

function getYouTubeId(src: string): string | null {
  const match = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})(?:[?&#/]|$)/);
  return match?.[1] ?? null;
}

/** Native top-layer modal with inert background, Escape and explicit focus wrapping. */
function VideoModal({ clip, onClose }: { clip: PlayerClip; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);
  const youtubeId = getYouTubeId(clip.src);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={dialog} className="film-dialog" aria-labelledby="film-dialog-title" onCancel={onClose} onKeyDown={event => {
      if (event.key !== "Tab") return;
      const stops = event.currentTarget.querySelectorAll<HTMLElement>("button, a[href], video[controls], iframe");
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
      <div className="film-dialog-heading"><p className="film-eyebrow">Now playing / Bardownski</p><button type="button" className="film-dialog-close" onClick={onClose} aria-label="Close video">Close <span aria-hidden="true">×</span></button></div>
      <div className="film-dialog-media">
        {youtubeId ? (
          <iframe title={clip.title} src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : failed ? (
          <div className="film-video-error" role="status"><p>This clip could not be loaded.</p><p>You can open the original file below, or try again.</p><button type="button" onClick={() => setFailed(false)}>Try again ↗</button></div>
        ) : (
          <video src={clip.src} poster={getMonochromePoster(clip.poster)} controls autoPlay playsInline aria-label={clip.title} onError={() => setFailed(true)} />
        )}
      </div>
      <div className="film-dialog-footer"><h2 id="film-dialog-title">{clip.title}</h2><a href={clip.src} target="_blank" rel="noopener noreferrer">{youtubeId ? "Watch on YouTube" : "Open video file"} <span aria-hidden="true">↗</span></a></div>
    </dialog>
  );
}

function PlayerSection({ player, index, onPlay }: { player: PlayerHighlights; index: number; onPlay: (clip: PlayerClip) => void }) {
  const [selectedId, setSelectedId] = useState(player.clips[0]?.id);
  const selected = player.clips.find(clip => clip.id === selectedId) ?? player.clips[0];
  if (!selected) return null;

  return (
    <section id={`highlights-${player.id}`} className={`film-player film-player--${player.theme}`} aria-labelledby={`film-player-${player.id}`}>
      <div className="film-inner">
        <div className="film-chapter-meta"><p className="film-eyebrow">{String(index + 1).padStart(2, "0")} / {player.role}</p><span>{String(player.clips.length).padStart(2, "0")} {player.clips.length === 1 ? "clip" : "clips"}</span></div>
        <div className="film-player-heading"><h2 id={`film-player-${player.id}`}>{player.name}</h2><p>{player.statement}</p></div>
        <div className="film-player-layout">
          <div className="film-feature">
            <a className="film-screen" href={selected.src} aria-label={`Play ${selected.title}`} onClick={event => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onPlay(selected);
            }}>
              <Image src={selected.poster} alt="" fill sizes="(max-width: 800px) 88vw, 58vw" />
              <span className="film-screen-label">{getYouTubeId(selected.src) ? "YouTube / Player edit" : "From the collection"}</span>
              <span className="film-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
              <span className="film-screen-action" aria-hidden="true">Play film <span>↗</span></span>
            </a>
            <div className="film-feature-caption" aria-live="polite"><h3>{selected.title}</h3><span>{String(player.clips.indexOf(selected) + 1).padStart(2, "0")} / {String(player.clips.length).padStart(2, "0")}</span></div>
          </div>
          <div className="film-playlist">
            <p className="film-playlist-label">{player.clips.length > 1 ? "The collection / Choose a clip" : "The collection / Player edit"}</p>
            <ol>
              {player.clips.map((clip, clipIndex) => <li key={clip.id}>
                <a href={clip.src} className="film-clip" aria-current={clip.id === selected.id ? "true" : undefined} aria-label={`Select ${clip.title}`} onClick={event => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  setSelectedId(clip.id);
                }}>
                  <span className="film-clip-index">{String(clipIndex + 1).padStart(2, "0")}</span>
                  <span className="film-clip-copy"><span>{clip.title}</span><small>{getYouTubeId(clip.src) ? "YouTube film" : "Club clip"}</small></span>
                  <span className="film-clip-arrow" aria-hidden="true">{clip.id === selected.id ? "↖" : "↗"}</span>
                </a>
              </li>)}
            </ol>
            <p className="film-playlist-note">Select a clip. Press play.<br />The rest of the room can wait.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HighlightsClient({ players }: { players: PlayerHighlights[] }) {
  const [activeClip, setActiveClip] = useState<PlayerClip | null>(null);
  return (
    <div className="film-collections">
      {players.filter(player => player.clips.length > 0).map((player, index) => <PlayerSection key={player.id} player={player} index={index} onPlay={setActiveClip} />)}
      {activeClip && <VideoModal key={activeClip.id} clip={activeClip} onClose={() => setActiveClip(null)} />}
    </div>
  );
}
