"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { FcHighlightVideo } from "./page";

const GOLD = "#c9a227";

function VideoPlayer({ video }: { video: FcHighlightVideo }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
      setStarted(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8 items-start">
      {/* Phone-frame player (portrait reel) */}
      <div className="lg:col-span-2 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-[360px] aspect-[9/16] rounded-3xl overflow-hidden group cursor-pointer"
          style={{
            border: "1px solid var(--fc-border)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          }}
          onClick={toggle}
        >
          <video
            ref={ref}
            src={video.src}
            poster={video.poster}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            controls={started}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
          {/* Play overlay */}
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/20 pointer-events-none">
              <span
                className="w-20 h-20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: GOLD }}
              >
                <svg className="w-9 h-9 ml-1" fill="#141414" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Info panel */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="lg:col-span-3"
      >
        <div
          className="rounded-2xl p-8"
          style={{ backgroundColor: "var(--fc-card)", border: "1px solid var(--fc-border)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span
              className="px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-[0.15em]"
              style={{ backgroundColor: GOLD, color: "#141414" }}
            >
              Official Reel
            </span>
            <span className="text-xs text-white/40 tabular-nums">{video.duration}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3">
            {video.title}
          </h2>
          <p className="text-white/50 leading-relaxed mb-6">{video.description}</p>
          <button
            onClick={toggle}
            className="inline-flex items-center gap-2 px-6 py-3 rounded text-xs font-bold uppercase tracking-widest transition-all hover:brightness-110 cursor-pointer"
            style={{ backgroundColor: GOLD, color: "#141414" }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              {playing ? (
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              ) : (
                <path d="M8 5v14l11-7z" />
              )}
            </svg>
            {playing ? "Pause" : "Play Reel"}
          </button>
        </div>

        {/* Coming soon strip */}
        <div
          className="rounded-2xl p-6 mt-5 flex items-center gap-5"
          style={{
            backgroundColor: "var(--fc-card)",
            border: "1px dashed rgba(255,255,255,0.12)",
          }}
        >
          <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 opacity-50">
            <Image
              src="/fc/images/gallery/fc-still-14.webp"
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
          <div>
            <h3 className="font-bold text-white/70">More reels on the way</h3>
            <p className="text-sm text-white/35">
              New highlight packages drop as the club racks up wins. Check back soon.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function HighlightsClient({ videos }: { videos: FcHighlightVideo[] }) {
  return (
    <div className="flex flex-col gap-14">
      {videos.map((v) => (
        <VideoPlayer key={v.id} video={v} />
      ))}
    </div>
  );
}
