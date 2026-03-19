"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GalleryPhoto, GalleryVideo } from "./page";

function getYouTubeId(src: string): string | null {
  const m = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&]+)/);
  return m ? m[1] : null;
}

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

// ─── Section heading ────────────────────────────────────────────────────────────
function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-6 mt-4">
      <div className="flex items-center gap-4 mb-2">
        <div
          className="h-px flex-1 rounded-full"
          style={{ background: "linear-gradient(to right, rgba(204,21,51,0.6), rgba(204,21,51,0.2), transparent)" }}
        />
        <span
          className="text-sm font-black uppercase tracking-[0.25em] whitespace-nowrap"
          style={{ color: "#cc1533" }}
        >
          {label}
        </span>
        <div
          className="h-px flex-1 rounded-full"
          style={{ background: "linear-gradient(to left, rgba(204,21,51,0.6), rgba(204,21,51,0.2), transparent)" }}
        />
      </div>
      <p className="text-center text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
        {count} {label.toLowerCase()}
      </p>
    </div>
  );
}

// ─── Photo lightbox ─────────────────────────────────────────────────────────────
function PhotoLightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      {index > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-colors z-10"
          style={{ color: "rgba(255,255,255,0.6)" }}
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {index < items.length - 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-colors z-10"
          style={{ color: "rgba(255,255,255,0.6)" }}
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

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
        key={index}
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative max-w-5xl w-full mx-16"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={items[index].src}
          alt={items[index].alt}
          width={1400}
          height={900}
          className="w-full h-auto max-h-[82vh] object-contain rounded"
          style={{ borderRadius: "4px" }}
        />
        <p
          className="text-center text-xs mt-3 uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {items[index].alt} · {index + 1} / {items.length}
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Video modal ─────────────────────────────────────────────────────────────────
function VideoModal({ video, onClose }: { video: GalleryVideo; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
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
        {getYouTubeId(video.src) ? (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${getYouTubeId(video.src)}?autoplay=1`}
              allow="autoplay; fullscreen"
              allowFullScreen
              className="absolute inset-0 w-full h-full rounded bg-black"
              style={{ borderRadius: "4px" }}
            />
          </div>
        ) : (
          <video
            src={video.src}
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
          {video.label}
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Bento span patterns ────────────────────────────────────────────────────────
const PHOTO_SPANS: [number, number][] = [
  [2, 2], [1, 1], [1, 2], [1, 1], [1, 1], [1, 1], [2, 1], [1, 1],
  [1, 2], [1, 1], [2, 1], [1, 1], [1, 1],
];

const VIDEO_SPANS: [number, number][] = [
  [2, 2], [1, 1], [1, 2], [1, 1], [1, 1], [1, 1], [2, 1], [1, 1],
  [1, 1], [1, 1], [2, 1], [1, 1], [1, 2], [1, 1], [1, 1], [2, 1],
  [1, 1], [1, 1],
];

// ─── Card shared styles ─────────────────────────────────────────────────────────
const cardBase =
  "relative overflow-hidden cursor-pointer group transition-[border-color,box-shadow] duration-200";

const cardStyle = {
  borderRadius: "3px",
  backgroundColor: "rgba(8,12,20,0.82)",
  border: "1px solid rgba(125,211,252,0.15)",
};

// ─── Photo bento (CSS only, no Framer Motion on grid items) ──────────────────
function PhotoBento({ photos }: { photos: GalleryPhoto[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const onPrev = useCallback(
    () => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1)),
    []
  );
  const onNext = useCallback(
    () => setLightboxIndex((i) => Math.min(photos.length - 1, (i ?? 0) + 1)),
    [photos.length]
  );

  return (
    <>
      <SectionHeading label="Photos" count={photos.length} />

      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-16"
        style={{ gridAutoRows: "clamp(140px, 18vw, 240px)", gridAutoFlow: "dense" }}
      >
        {photos.map((photo, i) => {
          const [col, row] = PHOTO_SPANS[i] ?? [1, 1];
          return (
            <div
              key={photo.src}
              className={cardBase}
              style={{
                ...cardStyle,
                gridColumn: `span ${col}`,
                gridRow: `span ${row}`,
              }}
              onClick={() => setLightboxIndex(i)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(204,21,51,0.55)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(204,21,51,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(125,211,252,0.12)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />

              <div
                className="absolute inset-0 flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(to top, rgba(11,15,26,0.85) 0%, transparent 60%)" }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
                  {photo.alt}
                </span>
              </div>

              <div
                className="absolute top-0 left-0 w-5 h-5 pointer-events-none"
                style={{
                  borderTop: "2px solid rgba(125,211,252,0.35)",
                  borderLeft: "2px solid rgba(125,211,252,0.35)",
                }}
              />
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <PhotoLightbox
            items={photos}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onPrev={onPrev}
            onNext={onNext}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Video card ──────────────────────────────────────────────────────────────────
function VideoCard({ video, style, onClick }: { video: GalleryVideo; style?: React.CSSProperties; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const ytId = getYouTubeId(video.src);

  return (
    <div
      className={cardBase}
      style={{ ...cardStyle, ...style }}
      onClick={onClick}
      onMouseEnter={(e) => {
        setHovered(true);
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(204,21,51,0.55)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(204,21,51,0.2)";
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(125,211,252,0.12)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {ytId ? (
        <Image
          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
          alt="YouTube thumbnail"
          fill
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <ThumbnailVideo
          src={video.src}
          playing={hovered}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Scrim */}
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(11,15,26,0.45)" }} />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: "rgba(120,120,120,0.7)" }}
        >
          <svg
            className="w-5 h-5 text-white"
            style={{ marginLeft: "2px" }}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Label */}
      {video.label && (
        <div
          className="absolute bottom-0 left-0 right-0 p-3"
          style={{ background: "linear-gradient(to top, rgba(11,15,26,0.9) 0%, transparent 100%)" }}
        >
          <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
            {video.label}
          </p>
        </div>
      )}

      {/* Powder blue corner bracket */}
      <div
        className="absolute top-0 left-0 w-5 h-5 pointer-events-none"
        style={{
          borderTop: "2px solid rgba(125,211,252,0.35)",
          borderLeft: "2px solid rgba(125,211,252,0.35)",
        }}
      />
    </div>
  );
}

// ─── Video bento (CSS only, no Framer Motion on grid items) ──────────────────
function VideoBento({ videos }: { videos: GalleryVideo[] }) {
  const [activeVideo, setActiveVideo] = useState<GalleryVideo | null>(null);

  return (
    <>
      <SectionHeading label="Videos" count={videos.length} />

      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        style={{ gridAutoRows: "clamp(140px, 18vw, 240px)", gridAutoFlow: "dense" }}
      >
        {videos.map((video, i) => {
          const [col, row] = VIDEO_SPANS[i] ?? [1, 1];
          return (
            <VideoCard
              key={video.src}
              video={video}
              style={{
                gridColumn: `span ${col}`,
                gridRow: `span ${row}`,
              }}
              onClick={() => setActiveVideo(video)}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {activeVideo && (
          <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Root export ─────────────────────────────────────────────────────────────────
export default function GalleryClient({
  photos,
  videos,
}: {
  photos: GalleryPhoto[];
  videos: GalleryVideo[];
}) {
  return (
    <>
      <PhotoBento photos={photos} />
      <VideoBento videos={videos} />
    </>
  );
}
