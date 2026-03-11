"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GalleryItem, JerseyCard } from "./page";

/* ── Jersey Wall ── */
function JerseyWall({ jerseys }: { jerseys: JerseyCard[] }) {
  const current = jerseys.filter((j) => j.current);
  const past = jerseys.filter((j) => !j.current);

  return (
    <div className="mb-20">
      {/* Section heading */}
      <div className="flex items-center gap-4 mb-10">
        <div className="h-[2px] flex-1 bg-gradient-to-r from-red/60 via-red/30 to-transparent rounded-full" />
        <span className="text-sm font-black uppercase tracking-[0.25em] text-red whitespace-nowrap">
          Jersey Wall
        </span>
        <div className="h-[2px] flex-1 bg-gradient-to-l from-red/60 via-red/30 to-transparent rounded-full" />
      </div>

      {/* Current jerseys — 3 column, prominent */}
      {current.length > 0 && (
        <>
          <p className="text-xs text-muted uppercase tracking-widest mb-4 font-semibold">
            Current Set
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
            {current.map((jersey, i) => (
              <motion.div
                key={`${jersey.year}-${jersey.name}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="relative rounded-xl border border-border overflow-hidden bg-gradient-to-b from-navy-light/30 to-navy group"
              >
                {/* Current badge */}
                <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded bg-red text-white text-[9px] font-black uppercase tracking-wider">
                  Current
                </div>

                {/* Jersey video */}
                <div className="relative h-72 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden">
                  {/* Year watermark */}
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8rem] font-black text-white/[0.03] font-mono select-none leading-none pointer-events-none z-10">
                    {jersey.year}
                  </span>
                  <video
                    src={jersey.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute top-[-15%] left-[-20%] w-[140%] h-[130%] object-cover object-[60%_15%] group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-navy to-transparent" />
                </div>

                {/* Info */}
                <div className="px-5 py-4 border-t border-border/50">
                  <p className="text-sm font-black uppercase tracking-wide">
                    {jersey.name}
                  </p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {jersey.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Past jerseys — smaller grid */}
      {past.length > 0 && (
        <>
          <p className="text-xs text-muted uppercase tracking-widest mb-4 font-semibold">
            Past Jerseys
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {past.map((jersey, i) => (
              <motion.div
                key={`${jersey.year}-${jersey.name}`}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                whileHover={{ y: -3 }}
                className="relative rounded-lg border border-border overflow-hidden bg-navy group"
              >
                {/* Jersey video */}
                <div className="relative h-44 overflow-hidden">
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black text-white/[0.04] font-mono select-none leading-none pointer-events-none z-10">
                    {jersey.year}
                  </span>
                  <video
                    src={jersey.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute top-[-15%] left-[-20%] w-[140%] h-[130%] object-cover object-[60%_15%] group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-navy to-transparent" />
                </div>

                {/* Info overlay */}
                <div className="px-3 py-2.5 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide truncate">
                      {jersey.name}
                    </p>
                    <span className="text-[10px] text-red font-black font-mono shrink-0 ml-2">
                      {jersey.year}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Contact Sheet / Tiled Photo Gallery ── */
function PhotoGrid({ items }: { items: GalleryItem[] }) {
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  return (
    <>
      {/* Section heading */}
      <div className="flex items-center gap-4 mb-2">
        <div className="h-[2px] flex-1 bg-gradient-to-r from-red/60 via-red/30 to-transparent rounded-full" />
        <span className="text-sm font-black uppercase tracking-[0.25em] text-red whitespace-nowrap">
          All Photos
        </span>
        <div className="h-[2px] flex-1 bg-gradient-to-l from-red/60 via-red/30 to-transparent rounded-full" />
      </div>
      <p className="text-center text-muted text-xs uppercase tracking-widest mb-8">
        {items.length} images
      </p>

      {/* Dense 4-column grid — contact sheet style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
        {items.map((item, i) => (
          <motion.div
            key={item.src}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            className="relative aspect-square bg-navy overflow-hidden cursor-pointer group"
            onClick={() => setLightbox(item)}
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-navy-dark/0 group-hover:bg-navy-dark/70 transition-colors duration-300 flex items-end">
              <div className="p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-xs font-semibold leading-tight">
                  {item.alt}
                </p>
              </div>
            </div>
            {/* Thin border visible on hover */}
            <div className="absolute inset-0 border border-transparent group-hover:border-red/40 transition-colors duration-300 pointer-events-none" />
          </motion.div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-24 bg-navy border border-border rounded-xl">
          <p className="text-muted text-lg">No photos yet.</p>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative max-w-5xl w-full max-h-[85vh] aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={lightbox.src}
                alt={lightbox.alt}
                fill
                className="object-contain rounded-xl"
              />
              <button
                onClick={() => setLightbox(null)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <div className="absolute -bottom-10 left-0 right-0 text-center">
                <p className="text-sm text-muted">{lightbox.alt}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function GalleryClient({
  photos,
  jerseys,
}: {
  photos: GalleryItem[];
  jerseys: JerseyCard[];
}) {
  return (
    <>
      <JerseyWall jerseys={jerseys} />
      <PhotoGrid items={photos} />
    </>
  );
}
