"use client";

import { useRef, useState, useEffect } from "react";
import { FadeUp, StaggerContainer, StaggerItem, GlowCard } from "@/components/ui/Animate";

interface Highlight {
  id: string;
  title: string;
  src?: string; // path relative to public/, e.g. "/videos/clip1.mp4"
  youtube?: string; // YouTube embed ID
}

// Drop your video files into public/videos/ and add entries here
const highlights: Highlight[] = [
  {
    id: "1",
    title: "JRT IV - 2026",
    youtube: "aGrVfM6HsO0",
  },
  {
    id: "2",
    title: "GottaBe - Trap Edition",
    src: "/videos/GottaBe - Trap Edition.mov",
  },
  {
    id: "3",
    title: "Slobby Robby 2026",
    src: "/videos/Slobby Robby 2026.mov",
  },
];

function HighlightCard({ clip }: { clip: Highlight }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !clip.src) return;
    const src = clip.src;
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
  }, [clip.src]);

  const handleClick = () => {
    const video = videoRef.current;
    if (!video) return;
    if (expanded) {
      video.muted = true;
      video.controls = false;
      setExpanded(false);
    } else {
      video.muted = false;
      video.controls = true;
      setExpanded(true);
    }
  };

  return (
    <GlowCard className="bg-surface border border-border rounded-xl overflow-hidden h-full">
      {clip.youtube ? (
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${clip.youtube}?rel=0`}
            title={clip.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      ) : (
        <div className="aspect-video relative cursor-pointer" onClick={handleClick}>
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
          {!expanded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
              <svg className="w-12 h-12 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <h3 className="text-sm font-bold line-clamp-2">
          {clip.title}
        </h3>
      </div>
    </GlowCard>
  );
}

export default function HighlightsSection() {
  return (
    <section id="highlights" className="py-20 bg-background scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold uppercase tracking-wider mb-3">
              Highlights
            </h2>
            <p className="text-muted">
              Top plays and moments from Bardownski gameplay.
            </p>
          </div>
        </FadeUp>

        <StaggerContainer
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          stagger={0.1}
        >
          {highlights.map((clip) => (
            <StaggerItem key={clip.id}>
              <HighlightCard clip={clip} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
