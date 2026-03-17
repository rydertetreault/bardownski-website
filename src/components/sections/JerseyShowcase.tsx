"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/Animate";

function Snow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const flakes = Array.from({ length: 280 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.5 + 0.3,
      speed: Math.random() * 5 + 2,
      drift: Math.random() * 2 - 1,
      opacity: Math.random() * 0.6 + 0.2,
    }));

    let lastTime = performance.now();

    const draw = (now: number) => {
      const delta = (now - lastTime) / 16.67; // Normalize to 60fps baseline
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const f of flakes) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${f.opacity})`;
        ctx.fill();
        f.y += f.speed * delta;
        f.x += f.drift * delta;
        if (f.y > canvas.height) { f.y = -f.r; f.x = Math.random() * canvas.width; }
        if (f.x > canvas.width) f.x = 0;
        if (f.x < 0) f.x = canvas.width;
      }
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}

function LazyVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

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
  borderHover: string;
  cardBg: string;
}

const jerseys: JerseyData[] = [
  {
    label: "HOME",
    description: "Navy with red & white trim",
    video: "/videos/BD - Home.mp4",
    accentColor: "#5b9bd5",
    glowColor: "rgba(91, 155, 213, 0.35)",
    borderHover: "rgba(91, 155, 213, 0.8)",
    cardBg: "#152840",
  },
  {
    label: "AWAY",
    description: "White with navy & red trim",
    video: "/videos/BD - Away.mp4",
    accentColor: "#c8d8e8",
    glowColor: "rgba(200, 216, 232, 0.3)",
    borderHover: "rgba(255, 255, 255, 0.8)",
    cardBg: "#152840",
  },
  {
    label: "ALTERNATE",
    description: "Red with eagle crest",
    video: "/videos/BD - Alt.mp4",
    accentColor: "#9b0c23",
    glowColor: "rgba(155, 12, 35, 0.4)",
    borderHover: "rgba(204, 21, 51, 0.9)",
    cardBg: "#152840",
  },
];

export default function JerseyShowcase() {
  return (
    <section
      className="relative pt-44 pb-32 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #2a5278 0%, #152840 50%, #0a1220 100%)",
      }}
    >
      {/* Falling snow */}
      <Snow />

      {/* TOP DIVIDER */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          zIndex: 2,
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
          zIndex: 2,
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
          zIndex: 2,
          height: "108px",
          backgroundColor: "#0b0f1a",
          clipPath: "polygon(0 0, 100% 0, 0 100%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ zIndex: 3 }}>
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
              <div className={i === 1 ? "md:-translate-y-7" : i === 2 ? "md:-translate-y-14" : ""}>
              <motion.div
                whileHover="hovered"
                initial="rest"
                animate="rest"
                variants={{
                  rest: { y: 0 },
                  hovered: { y: -4 },
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative overflow-hidden cursor-pointer"
                style={{
                  height: "480px",
                  backgroundColor: jersey.cardBg,
                  clipPath: "polygon(0 20px, 100% 0, 100% calc(100% - 20px), 0 100%)",
                }}
              >
                <LazyVideo
                  src={jersey.video}
                  className="absolute inset-0 w-full h-full object-cover scale-[1.2] object-[70%_50%]"
                />

                {/* Hover border overlay — inside clipPath so it follows the angled shape */}
                <motion.div
                  variants={{
                    rest: { opacity: 0 },
                    hovered: { opacity: 1 },
                  }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-20 pointer-events-none"
                  style={{ border: `2px solid ${jersey.borderHover}` }}
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

      {/* BOTTOM DIVIDER */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          zIndex: 2,
          height: "140px",
          background:
            "linear-gradient(90deg, #ff1a3d 0%, rgba(255, 40, 70, 0.6) 50%, transparent 100%)",
          clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
          filter: "blur(14px)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          zIndex: 2,
          height: "122px",
          background:
            "linear-gradient(90deg, #ffffff 0%, #ff2244 8%, rgba(255, 40, 70, 0.4) 55%, transparent 100%)",
          clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
          filter: "blur(2px)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          zIndex: 2,
          height: "108px",
          backgroundColor: "#0b0f1a",
          clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
        }}
      />
    </section>
  );
}
