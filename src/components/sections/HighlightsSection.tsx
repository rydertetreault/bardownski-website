"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Clip {
  id: string;
  title: string;
  src: string;
}

const clips: Clip[] = [
  { id: "g1", title: "GottaBe — Trap Edition", src: "/videos/GottaBe - Trap Edition.mov" },
  { id: "g2", title: "Slobby Robby 2026", src: "/videos/Slobby Robby 2026.mov" },

  { id: "g4", title: "Ryder — Clip 1", src: "/videos/Ryder1.mp4" },
  { id: "g5", title: "Ryder — Clip 2", src: "/videos/Ryder2.mp4" },
  { id: "g6", title: "Kaden — Clip 1", src: "/videos/Kaden1.mp4" },
  { id: "g7", title: "Dylan", src: "/videos/Dylan1.mp4" },
];

function ThumbCard({ clip }: { clip: Clip }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.src = clip.src;
          video.play().catch(() => {});
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [clip.src]);

  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      transition={{ duration: 0.18, ease: "easeOut" as const }}
      className="flex-shrink-0 w-48 sm:w-56 group cursor-pointer"
    >
      <div className="rounded-lg overflow-hidden aspect-video bg-[#1a2744] relative ring-1 ring-white/5 group-hover:ring-[#cc1533]/40 transition-all duration-200">
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors duration-200">
          <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-[#cc1533]/60 border border-white/20 group-hover:border-[#cc1533]/60 flex items-center justify-center transition-all duration-200">
            <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      el.style.cursor = "grabbing";
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onMouseUp = () => {
      isDown = false;
      el.style.cursor = "grab";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft - (x - startX);
    };

    el.style.cursor = "grab";
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mousemove", onMouseMove);
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return ref;
}

export default function HighlightsSection() {
  const scrollRef = useDragScroll();

  return (
    <section id="highlights" className="py-10 bg-[#0f172a] scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-5"
        >
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest text-white">Highlights</h2>
            <div className="mt-1 h-0.5 w-10 bg-[#cc1533] rounded-full" />
          </div>
          <Link
            href="/gallery"
            className="text-xs font-bold text-[#cc1533] hover:text-red-400 transition-colors uppercase tracking-wider"
          >
            Watch All →
          </Link>
        </motion.div>

        {/* Scroll row with fade edges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative"
        >
          {/* Left fade */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-10 z-10 bg-gradient-to-r from-[#0f172a] to-transparent" />
          {/* Right fade */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10 bg-gradient-to-l from-[#0f172a] to-transparent" />

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide select-none"
          >
            {clips.map((clip) => (
              <ThumbCard key={clip.id} clip={clip} />
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
