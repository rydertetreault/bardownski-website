"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const left = "BARDO".split("");
const right = "WNSKI".split("");

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
    }
    const timer = setTimeout(() => setVisible(false), 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ backgroundColor: "#06080e" }}
        >
          <video
            ref={videoRef}
            src="/videos/team clip.mp4"
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover opacity-10"
          />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(circle, transparent 10%, rgba(6,8,14,0.9) 60%)",
            }}
          />
          <div className="relative z-10 flex items-center gap-0">
            {/* Left line */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-[2px] w-8 sm:w-14 bg-[#cc1533] rounded-full origin-right mr-3 sm:mr-4"
            />

            {/* Left half — slides in from left */}
            <div className="flex">
              {left.map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: (left.length - 1 - i) * 0.03,
                    ease: "easeOut",
                  }}
                  className="text-3xl sm:text-5xl font-black tracking-tight text-white"
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            {/* Right half — slides in from right */}
            <div className="flex">
              {right.map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: i * 0.03,
                    ease: "easeOut",
                  }}
                  className="text-3xl sm:text-5xl font-black tracking-tight text-white"
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            {/* Right line */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-[2px] w-8 sm:w-14 bg-[#cc1533] rounded-full origin-left ml-3 sm:ml-4"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
