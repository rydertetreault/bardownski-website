"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { PlayerHighlights, PlayerClip } from "./page";

function getYouTubeId(src: string): string | null {
  const m = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&]+)/);
  return m ? m[1] : null;
}

// ─── Thumbnail video (lazy-loads metadata only when in view) ─────────────────
function ThumbnailVideo({
  src,
  className,
  playing,
}: {
  src: string;
  className?: string;
  playing: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "200px" }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (visible) {
      if (!video.getAttribute("src")) video.src = src;
    } else {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, [visible, src]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !visible) return;
    if (playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing, visible]);

  return (
    <video
      ref={ref}
      loop
      muted
      playsInline
      preload="metadata"
      className={className}
    />
  );
}

// ─── Full-screen video modal ──────────────────────────────────────────────────
function VideoModal({ clip, onClose }: { clip: PlayerClip; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 transition-colors"
        style={{ color: "rgba(255,255,255,0.5)" }}
        onClick={onClose}
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="relative max-w-5xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {getYouTubeId(clip.src) ? (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${getYouTubeId(clip.src)}?autoplay=1`}
              allow="autoplay; fullscreen"
              allowFullScreen
              className="absolute inset-0 w-full h-full rounded bg-black"
              style={{ borderRadius: "4px" }}
            />
          </div>
        ) : (
          <video
            src={clip.src}
            controls
            autoPlay
            className="w-full max-h-[82vh] rounded bg-black"
            style={{ borderRadius: "4px" }}
          />
        )}
        <p
          className="text-center text-xs mt-3 uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {clip.title}
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Scroll with arrows ──────────────────────────────────────────────────────
function useScrollArrows() {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = ref.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === "right" ? amount : -amount, behavior: "smooth" });
  };

  return { ref, canScrollLeft, canScrollRight, scroll };
}

function ScrollArrow({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
      style={{
        [direction === "right" ? "right" : "left"]: "6px",
        backgroundColor: "rgba(204,21,51,0.85)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
      }}
    >
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={direction === "right" ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
      </svg>
    </button>
  );
}

// ─── Clip card (CSS only, no Framer Motion) ──────────────────────────────────
function ClipCard({ clip, onClick }: { clip: PlayerClip; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex-shrink-0 w-52 sm:w-64 cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.04]"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="rounded overflow-hidden aspect-video relative transition-colors duration-200"
        style={{
          backgroundColor: "#0b0f1a",
          border: `1px solid ${hovered ? "rgba(204,21,51,0.5)" : "rgba(125,211,252,0.12)"}`,
        }}
      >
        {getYouTubeId(clip.src) ? (
          <Image
            src={`https://img.youtube.com/vi/${getYouTubeId(clip.src)}/hqdefault.jpg`}
            alt={clip.title}
            fill
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <ThumbnailVideo
            src={clip.src}
            playing={hovered}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Scrim */}
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(11,15,26,0.4)" }} />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
            style={{ backgroundColor: "rgba(120,120,120,0.7)" }}
          >
            <svg className="w-4 h-4 text-white" style={{ marginLeft: "2px" }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Powder blue corner bracket */}
        <div
          className="absolute top-0 left-0 w-5 h-5 pointer-events-none"
          style={{
            borderTop: "2px solid rgba(125,211,252,0.35)",
            borderLeft: "2px solid rgba(125,211,252,0.35)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Player section (CSS fade-in, no Framer Motion) ──────────────────────────
function PlayerSection({ player }: { player: PlayerHighlights }) {
  const [activeClip, setActiveClip] = useState<PlayerClip | null>(null);
  const { ref: scrollRef, canScrollLeft, canScrollRight, scroll } = useScrollArrows();
  const isTeam = player.id === "team";

  return (
    <>
      <div className="mb-14">
        {/* Player header */}
        <div className="flex items-center gap-5 mb-5">
          <div
            className="w-1 self-stretch rounded-full flex-shrink-0"
            style={{ backgroundColor: isTeam ? "#cc1533" : "#7dd3fc", minHeight: "48px" }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              {player.number && (
                <span
                  className="text-xs font-black uppercase tracking-widest"
                  style={{ color: "#cc1533" }}
                >
                  {player.number}
                </span>
              )}
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-none">
                {player.name}
              </h2>
              {player.position && (
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {player.position}
                </span>
              )}
            </div>
          </div>

          <div
            className="flex-shrink-0 px-3 py-1 rounded text-xs font-black uppercase tracking-wider"
            style={{
              backgroundColor: "rgba(204,21,51,0.12)",
              border: "1px solid rgba(204,21,51,0.25)",
              color: "#cc1533",
            }}
          >
            {player.clips.length} {player.clips.length === 1 ? "clip" : "clips"}
          </div>
        </div>

        {/* Divider */}
        <div
          className="mb-5 h-px"
          style={{ background: "linear-gradient(to right, rgba(255,255,255,0.08), transparent)" }}
        />

        {/* Scrollable clip row */}
        <div className="relative">
          {canScrollLeft && (
            <div
              className="pointer-events-none absolute left-0 top-0 h-full w-16 z-10"
              style={{ background: "linear-gradient(to right, #06080e, transparent)" }}
            />
          )}
          {canScrollRight && (
            <div
              className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10"
              style={{ background: "linear-gradient(to left, #06080e, transparent)" }}
            />
          )}

          {canScrollLeft && <ScrollArrow direction="left" onClick={() => scroll("left")} />}
          {canScrollRight && <ScrollArrow direction="right" onClick={() => scroll("right")} />}

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide select-none"
          >
            {player.clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} onClick={() => setActiveClip(clip)} />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeClip && (
          <VideoModal clip={activeClip} onClose={() => setActiveClip(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function HighlightsClient({ players }: { players: PlayerHighlights[] }) {
  return (
    <div>
      {players.map((player) => (
        <PlayerSection key={player.id} player={player} />
      ))}
    </div>
  );
}
