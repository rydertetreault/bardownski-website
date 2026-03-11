"use client";

import { useRef, useEffect } from "react";
import { FadeUp, StaggerContainer, StaggerItem, GlowCard } from "@/components/ui/Animate";

function LazyVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.src = src;
          video.play();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);

  return <video ref={ref} loop muted playsInline className={className} />;
}

const jerseys = [
  {
    label: "Home",
    description: "Navy with red & white trim",
    video: "/videos/BD - Home.mp4",
    bg: "from-navy to-navy-dark",
  },
  {
    label: "Away",
    description: "White with navy & red trim",
    video: "/videos/BD - Away.mp4",
    bg: "from-gray-400 to-gray-600",
  },
  {
    label: "Alternate",
    description: "Red with eagle crest",
    video: "/videos/BD - Alt.mp4",
    bg: "from-red-dark to-[#6b0a18]",
  },
];

export default function JerseyShowcase() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold uppercase tracking-wider mb-3">
              Our Jerseys
            </h2>
            <p className="text-muted">Home, away, and alternate kits.</p>
          </div>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8" stagger={0.15}>
          {jerseys.map((jersey) => (
            <StaggerItem key={jersey.label}>
              <GlowCard className="relative rounded-xl overflow-hidden border border-border">
                <div className={`bg-gradient-to-b ${jersey.bg} p-6 pb-0`}>
                  <h3 className="text-center text-sm font-bold uppercase tracking-[0.2em] text-white/80 mb-1">
                    {jersey.label}
                  </h3>
                  <p className="text-center text-xs text-white/40 mb-4">
                    {jersey.description}
                  </p>
                  <div className="flex justify-center">
                    <div className="relative w-52 h-64 overflow-hidden rounded-t-lg">
                      <LazyVideo
                        src={jersey.video}
                        className="absolute top-[-15%] left-[-20%] w-[140%] h-[130%] object-cover object-[60%_15%]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
                    </div>
                  </div>
                </div>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
