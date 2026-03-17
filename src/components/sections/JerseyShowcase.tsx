"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/Animate";

function LazyVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  // Load src + seek to first frame when scrolled into view
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.src = src;
          video.load();
          const onLoaded = () => { video.currentTime = 0; };
          video.addEventListener("loadedmetadata", onLoaded, { once: true });
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      muted
      playsInline
      preload="metadata"
      className={className}
      onMouseEnter={() => ref.current?.play().catch(() => {})}
      onMouseLeave={() => {
        const v = ref.current;
        if (!v) return;
        v.pause();
        v.currentTime = 0;
      }}
    />
  );
}

interface JerseyData {
  label: string;
  description: string;
  video: string;
  accentColor: string;
  glowColor: string;
  cardBg: string;
}

const jerseys: JerseyData[] = [
  {
    label: "HOME",
    description: "Navy with red & white trim",
    video: "/videos/BD - Home.mp4",
    accentColor: "#5b9bd5",
    glowColor: "rgba(91, 155, 213, 0.35)",
    cardBg: "#1a3a6e",
  },
  {
    label: "AWAY",
    description: "White with navy & red trim",
    video: "/videos/BD - Away.mp4",
    accentColor: "#c8d8e8",
    glowColor: "rgba(200, 216, 232, 0.3)",
    cardBg: "#1b2a4a",
  },
  {
    label: "ALTERNATE",
    description: "Red with eagle crest",
    video: "/videos/BD - Alt.mp4",
    accentColor: "#9b0c23",
    glowColor: "rgba(155, 12, 35, 0.4)",
    cardBg: "#1a080e",
  },
];

export default function JerseyShowcase() {
  return (
    <section
      className="relative pt-44 pb-32"
      style={{
        background:
          "radial-gradient(ellipse at 50% 45%, #ddedf5 0%, #a8c5d8 45%, #7a9fb8 100%)",
      }}
    >
      {/* TOP DIVIDER: same 3-layer stadium light — mirrors the bottom */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "140px",
          background:
            "linear-gradient(90deg, #ff1a3d 0%, rgba(255, 40, 70, 0.6) 50%, transparent 100%)",
          clipPath: "polygon(0 0, 100% 0, 0 100%)",
          filter: "blur(14px)",
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "122px",
          background:
            "linear-gradient(90deg, #ffffff 0%, #ff2244 8%, rgba(255, 40, 70, 0.4) 55%, transparent 100%)",
          clipPath: "polygon(0 0, 100% 0, 0 100%)",
          filter: "blur(2px)",
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "108px",
          backgroundColor: "#0b0f1a",
          clipPath: "polygon(0 0, 100% 0, 0 100%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black uppercase tracking-widest text-white mb-3">
              THE GEAR
            </h2>
            <p className="text-muted text-sm tracking-wider uppercase">
              Home, away, and alternate kits
            </p>
          </div>
        </FadeUp>

        <StaggerContainer
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          stagger={0.15}
        >
          {jerseys.map((jersey, i) => (
            <StaggerItem key={jersey.label}>
              {/* translateY cascades cards upward left→right to follow the diagonal divider (desktop only) */}
              <div className={i === 1 ? "md:-translate-y-7" : i === 2 ? "md:-translate-y-14" : ""}>
              <motion.div
                whileHover={{
                  y: -4,
                  boxShadow: `0 16px 48px ${jersey.glowColor}`,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="group relative overflow-hidden border border-border cursor-pointer"
                style={{
                  height: "480px",
                  backgroundColor: jersey.cardBg,
                  // Slashed top & bottom edges — same / angle as the section dividers
                  clipPath: "polygon(0 20px, 100% 0, 100% calc(100% - 20px), 0 100%)",
                }}
              >
                {/* Jersey video — plays immediately, zoomed in to crop to player */}
                <LazyVideo
                  src={jersey.video}
                  className="absolute inset-0 w-full h-full object-cover scale-[1.2] object-[70%_50%]"
                />

                {/* Bottom gradient + label */}
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-20 pb-6 px-6">
                  <h3 className="text-white font-black text-xl uppercase tracking-[0.25em] mb-1">
                    {jersey.label}
                  </h3>
                  <p className="text-white/50 text-xs tracking-wide">
                    {jersey.description}
                  </p>
                </div>
              </motion.div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* SECTION DIVIDER: angled cut — stadium light glow */}
      {/* Swap clipPath or colors on any layer to change the style */}

      {/* Wide diffuse outer glow */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "140px",
          background:
            "linear-gradient(90deg, #ff1a3d 0%, rgba(255, 40, 70, 0.6) 50%, transparent 100%)",
          clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
          filter: "blur(14px)",
        }}
      />
      {/* Tight bright core line */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "122px",
          background:
            "linear-gradient(90deg, #ffffff 0%, #ff2244 8%, rgba(255, 40, 70, 0.4) 55%, transparent 100%)",
          clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
          filter: "blur(2px)",
        }}
      />
      {/* Bg fill — sits on top, slightly smaller to expose the glow edge */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "108px",
          backgroundColor: "#0b0f1a",
          clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
        }}
      />
    </section>
  );
}
