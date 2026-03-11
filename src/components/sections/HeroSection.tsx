"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";

const highlightVideos = [
  "/videos/JRT IV - 2026.mp4",
  "/videos/GottaBe - Trap Edition.mov",
  "/videos/Slobby Robby 2026.mov",
];

export default function HeroSection() {
  const [currentVideo, setCurrentVideo] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const pickRandomVideo = useCallback(() => {
    const next = highlightVideos[Math.floor(Math.random() * highlightVideos.length)];
    setCurrentVideo(next);
  }, []);

  useEffect(() => {
    pickRandomVideo();
  }, [pickRandomVideo]);

  return (
    <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Blurred highlight video background */}
      {currentVideo && (
        <div className="absolute inset-0 z-[1] overflow-hidden">
          <video
            ref={videoRef}
            key={currentVideo}
            src={currentVideo}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover blur-xl scale-110 opacity-35"
            loop
          />
        </div>
      )}

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Logo — animate in */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-36 h-36 mx-auto mb-8 relative overflow-hidden rounded-2xl"
        >
          <Image
            src="/images/logo/BD - logo.png"
            alt="Bardownski Logo"
            fill
            className="object-contain"
            priority
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-6xl md:text-8xl font-black tracking-tighter mb-2"
        >
          BARDOWNSKI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-lg md:text-xl text-muted tracking-[0.3em] uppercase mb-2"
        >
          Hockey Club
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-sm text-muted/70 tracking-widest uppercase mb-10"
        >
          Newfoundland
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/roster"
            className="px-10 py-3.5 bg-red hover:bg-red-dark text-white font-bold rounded transition-colors uppercase tracking-wider text-sm"
          >
            View Roster
          </Link>
          <Link
            href="/stats"
            className="px-10 py-3.5 bg-navy-light hover:bg-navy text-white font-bold rounded border border-border transition-colors uppercase tracking-wider text-sm"
          >
            Player Stats
          </Link>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-5 h-8 border-2 border-muted/40 rounded-full flex justify-center pt-1.5"
        >
          <motion.div className="w-1 h-2 bg-muted/60 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
