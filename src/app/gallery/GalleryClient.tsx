"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GalleryPhoto, GalleryVideo } from "./page";

// Loads only video metadata (first frame) when scrolled into view — no playback.
function VideoThumb({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.src = src;
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);
  return <video ref={ref} preload="metadata" muted playsInline className={className} />;
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
      {/* Prev */}
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

      {/* Next */}
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

      {/* Close */}
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
        <video
          src={video.src}
          controls
          autoPlay
          className="w-full max-h-[82vh] rounded bg-black"
          style={{ borderRadius: "4px" }}
        />
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
// Each entry: [colSpan, rowSpan] for a 4-column grid
const PHOTO_SPANS: [number, number][] = [
  [2, 2], // 0 — hero
  [1, 1], // 1
  [1, 2], // 2 — tall
  [1, 1], // 3
  [1, 1], // 4
  [2, 1], // 5 — wide
  [1, 1], // 6
  [1, 2], // 7 — tall
  [1, 1], // 8
  [2, 1], // 9 — wide
  [1, 1], // 10
];

const VIDEO_SPANS: [number, number][] = [
  [2, 2], // 0 — hero
  [1, 1], // 1
  [1, 2], // 2 — tall
  [1, 1], // 3
  [1, 1], // 4
  [1, 1], // 5
  [2, 1], // 6 — wide
  [1, 1], // 7
  [1, 2], // 8 — tall
  [1, 1], // 9
  [2, 1], // 10 — wide
];

// ─── Card shared styles ─────────────────────────────────────────────────────────
const cardBase =
  "relative overflow-hidden cursor-pointer group transition-[border-color,box-shadow] duration-300";

const cardStyle = {
  borderRadius: "3px",
  backgroundColor: "rgba(8,12,20,0.82)",
  border: "1px solid rgba(125,211,252,0.15)",
};

// ─── Photo bento ────────────────────────────────────────────────────────────────
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
            <motion.div
              key={photo.src}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.3, delay: i * 0.025 }}
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

              {/* Hover overlay */}
              <div
                className="absolute inset-0 flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(to top, rgba(11,15,26,0.85) 0%, transparent 60%)" }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
                  {photo.alt}
                </span>
              </div>

              {/* Powder blue corner bracket */}
              <div
                className="absolute top-0 left-0 w-5 h-5 pointer-events-none transition-colors duration-300"
                style={{
                  borderTop: "2px solid rgba(125,211,252,0.35)",
                  borderLeft: "2px solid rgba(125,211,252,0.35)",
                }}
              />
            </motion.div>
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

// ─── Video bento ─────────────────────────────────────────────────────────────────
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
            <motion.div
              key={video.src}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.3, delay: i * 0.025 }}
              className={cardBase}
              style={{
                ...cardStyle,
                gridColumn: `span ${col}`,
                gridRow: `span ${row}`,
              }}
              onClick={() => setActiveVideo(video)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(204,21,51,0.55)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(204,21,51,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(125,211,252,0.12)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              {/* First-frame thumbnail — no playback */}
              <VideoThumb
                src={video.src}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Scrim */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{ backgroundColor: "rgba(11,15,26,0.45)" }}
              />

              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{ backgroundColor: "rgba(204,21,51,0.85)" }}
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
              <div
                className="absolute bottom-0 left-0 right-0 p-3"
                style={{ background: "linear-gradient(to top, rgba(11,15,26,0.9) 0%, transparent 100%)" }}
              >
                <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
                  {video.label}
                </p>
              </div>

              {/* Powder blue corner bracket */}
              <div
                className="absolute top-0 left-0 w-5 h-5 pointer-events-none"
                style={{
                  borderTop: "2px solid rgba(125,211,252,0.35)",
                  borderLeft: "2px solid rgba(125,211,252,0.35)",
                }}
              />
            </motion.div>
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
