"use client";

import { type ReactNode, useState, useEffect, useCallback } from "react";
import { FadeUp } from "@/components/ui/Animate";

export function MvpOddsAnimations({ children }: { children: ReactNode }) {
  return <FadeUp>{children}</FadeUp>;
}

export interface BannerEntry {
  name: string;
  nickname: string;
  isGoalie: boolean;
  probability: number;
  americanOdds: string;
}

export function MvpOddsSpin({ entries }: { entries: BannerEntry[] }) {
  const [active, setActive] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const advance = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActive((prev) => (prev + 1) % entries.length);
      setIsTransitioning(false);
    }, 300);
  }, [entries.length]);

  useEffect(() => {
    const interval = setInterval(advance, 3000);
    return () => clearInterval(interval);
  }, [advance]);

  if (entries.length === 0) return null;

  const entry = entries[active];
  const isFavorite = active === 0;

  return (
    <div className="bg-navy border border-border rounded-xl px-4 sm:px-6 py-3 overflow-hidden">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#cc1533] whitespace-nowrap">
          MVP Odds
        </span>
        <div className="h-px w-3 bg-border" />

        <div
          className={`flex items-center gap-2 flex-1 min-w-0 transition-all duration-300 ${
            isTransitioning
              ? "opacity-0 -translate-y-4"
              : "opacity-100 translate-y-0"
          }`}
        >
          <span className={`text-xs font-bold ${isFavorite ? "text-[#cc1533]" : "text-muted/40"}`}>
            {active + 1}.
          </span>
          <span className={`text-sm font-semibold truncate ${isFavorite ? "text-white" : "text-white/80"}`}>
            {entry.nickname}
            {entry.isGoalie && <span className="text-[10px] text-muted ml-1">(G)</span>}
          </span>
          <span className="text-xs text-muted">
            {(entry.probability * 100).toFixed(1)}%
          </span>
          <span className={`text-sm font-mono font-bold ${
            isFavorite
              ? "text-[#cc1533]"
              : entry.americanOdds.startsWith("+")
              ? "text-emerald-400"
              : "text-white/60"
          }`}>
            {entry.americanOdds}
          </span>
        </div>

        {/* Dot indicators */}
        <div className="flex gap-1">
          {entries.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIsTransitioning(true); setTimeout(() => { setActive(i); setIsTransitioning(false); }, 300); }}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === active ? "bg-[#cc1533]" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
