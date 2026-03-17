"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PlayerHighlights, PlayerClip } from "./page";

// ─── Lazy video thumbnail ─────────────────────────────────────────────────────
function LazyVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.src) video.src = src;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);
  return <video ref={ref} loop muted playsInline preload="none" className={className} />;
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
        <video
          src={clip.src}
          controls
          autoPlay
          className="w-full max-h-[82vh] rounded bg-black"
          style={{ borderRadius: "4px" }}
        />
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

// ─── Drag-to-scroll ───────────────────────────────────────────────────────────
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    const onDown = (e: MouseEvent) => { isDown = true; el.style.cursor = "grabbing"; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; };
    const onUp = () => { isDown = false; el.style.cursor = "grab"; };
    const onMove = (e: MouseEvent) => { if (!isDown) return; e.preventDefault(); el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX); };
    el.style.cursor = "grab";
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    el.addEventListener("mousemove", onMove);
    return () => { el.removeEventListener("mousedown", onDown); window.removeEventListener("mouseup", onUp); el.removeEventListener("mousemove", onMove); };
  }, []);
  return ref;
}

// ─── Clip card ────────────────────────────────────────────────────────────────
function ClipCard({ clip, onClick }: { clip: PlayerClip; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex-shrink-0 w-52 sm:w-64 group cursor-pointer"
      onClick={onClick}
    >
      <div
        className="rounded overflow-hidden aspect-video relative"
        style={{
          backgroundColor: "#0b0f1a",
          border: "1px solid rgba(125,211,252,0.12)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(204,21,51,0.5)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(125,211,252,0.12)";
        }}
      >
        <LazyVideo src={clip.src} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />

        {/* Scrim */}
        <div className="absolute inset-0 transition-opacity duration-300" style={{ backgroundColor: "rgba(11,15,26,0.4)" }} />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
            style={{ backgroundColor: "rgba(204,21,51,0.85)" }}
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
    </motion.div>
  );
}

// ─── Player section ───────────────────────────────────────────────────────────
function PlayerSection({ player, index }: { player: PlayerHighlights; index: number }) {
  const [activeClip, setActiveClip] = useState<PlayerClip | null>(null);
  const scrollRef = useDragScroll();
  const isTeam = player.id === "team";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        className="mb-14"
      >
        {/* Player header */}
        <div className="flex items-center gap-5 mb-5">
          {/* Left accent bar */}
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

          {/* Clip count badge */}
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
          <div
            className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10"
            style={{ background: "linear-gradient(to left, #06080e, transparent)" }}
          />
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide select-none"
          >
            {player.clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} onClick={() => setActiveClip(clip)} />
            ))}
          </div>
        </div>
      </motion.div>

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
      {players.map((player, i) => (
        <PlayerSection key={player.id} player={player} index={i} />
      ))}
    </div>
  );
}