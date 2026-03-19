"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

function getYouTubeId(src: string): string | null {
  const m = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&]+)/);
  return m ? m[1] : null;
}

interface Clip {
  id: string;
  title: string;
  src: string;
}

const clips: Clip[] = [
  { id: "g0", title: "JRT IV — 2026", src: "https://youtu.be/aGrVfM6HsO0" },
  { id: "g1", title: "GottaBe — Trap Edition", src: "/videos/GottaBe - Trap Edition.mp4" },
  { id: "g2", title: "Slobby Robby 2026", src: "/videos/Slobby Robby 2026.mp4" },
  { id: "g4", title: "JRT IV — Clip 1", src: "/videos/Ryder1.mp4" },
  { id: "g5", title: "JRT IV — Clip 2", src: "/videos/Ryder2.mp4" },
  { id: "g6", title: "Gotta Be — Clip 1", src: "/videos/Kaden1.mp4" },
  { id: "g7", title: "Xavier Laflamme", src: "/videos/Dylan1.mp4" },
  { id: "g8", title: "Xavier Laflamme — 2026", src: "/videos/dylan - 2026.mp4" },
];

// ─── Lazy thumbnail video (loads metadata only when in view, plays on hover) ─
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

// ─── Clip card (CSS only, no Framer Motion) ──────────────────────────────────
function ThumbCard({ clip }: { clip: Clip }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex-shrink-0 w-48 sm:w-56 cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.04]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="rounded-lg overflow-hidden aspect-video bg-[#1a2744] relative transition-shadow duration-200"
        style={{
          boxShadow: hovered
            ? "inset 0 0 0 1px rgba(204,21,51,0.4)"
            : "inset 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {getYouTubeId(clip.src) ? (
          <Image
            src={`https://img.youtube.com/vi/${getYouTubeId(clip.src)}/hqdefault.jpg`}
            alt={clip.title}
            fill
            className="object-cover"
          />
        ) : (
          <ThumbnailVideo
            src={clip.src}
            playing={hovered}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center border border-white/20 transition-transform duration-200 hover:scale-110"
            style={{ backgroundColor: "rgba(120,120,120,0.7)" }}
          >
            <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
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

export default function HighlightsSection() {
  const { ref: scrollRef, canScrollLeft, canScrollRight, scroll } = useScrollArrows();

  return (
    <section id="highlights" className="py-10 bg-[#0f172a] scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest text-white">Highlights</h2>
            <div className="mt-1 h-0.5 w-10 bg-[#cc1533] rounded-full" />
          </div>
          <Link
            href="/highlights"
            className="text-xs font-bold text-[#cc1533] hover:text-red-400 transition-colors uppercase tracking-wider"
          >
            Watch All →
          </Link>
        </div>

        {/* Scroll row with fade edges + arrows */}
        <div className="relative">
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 h-full w-10 z-10 bg-gradient-to-r from-[#0f172a] to-transparent" />
          )}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10 bg-gradient-to-l from-[#0f172a] to-transparent" />
          )}

          {canScrollLeft && <ScrollArrow direction="left" onClick={() => scroll("left")} />}
          {canScrollRight && <ScrollArrow direction="right" onClick={() => scroll("right")} />}

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide select-none"
          >
            {clips.map((clip) => (
              <ThumbCard key={clip.id} clip={clip} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
