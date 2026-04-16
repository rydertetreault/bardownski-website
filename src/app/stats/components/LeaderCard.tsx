"use client";

import { motion } from "framer-motion";
import type { StatEntry } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

export function TrendArrow({ trend }: { trend?: "up" | "down" | null }) {
  if (!trend) return null;
  if (trend === "up") return <span className="text-green-500 ml-1">↑</span>;
  return <span className="text-red-light ml-1">↓</span>;
}

export function LeaderCard({
  title,
  entries,
  formatValue,
  secondaryLabel,
  secondaryIsPercent,
}: {
  title: string;
  entries: StatEntry[];
  formatValue?: (v: number) => string;
  secondaryLabel?: string;
  secondaryIsPercent?: boolean;
}) {
  const top5 = entries.slice(0, 5);
  if (top5.length === 0) return null;
  const fmt = formatValue || ((v: number) => v.toString());

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-navy border border-border rounded-xl overflow-hidden h-full"
    >
      {/* Header */}
      <div className="relative">
        <div className="h-0.5 bg-gradient-to-r from-red via-red/50 to-transparent" />
        <div className="px-4 py-2.5 border-b border-border bg-navy-dark/80 flex items-center justify-between">
          <h3 className="font-black uppercase tracking-wider text-xs">
            {title}
          </h3>
          {secondaryLabel && (
            <span className="text-[10px] text-muted uppercase tracking-widest">
              {secondaryLabel}
            </span>
          )}
        </div>
      </div>

      {/* Top 5 entries */}
      <div className="px-4 py-1">
        {top5.map((entry, i) => (
          <div
            key={entry.name}
            className={`flex items-center py-2.5 ${i > 0 ? "border-t border-border/20" : ""}`}
          >
            {/* Rank */}
            <span
              className={`w-6 text-xs font-mono font-bold shrink-0 ${
                i === 0 ? "text-red" : "text-muted"
              }`}
            >
              {entry.rank}.
            </span>
            {/* Name */}
            <p
              className={`flex-1 min-w-0 max-w-[130px] text-sm font-semibold truncate ${
                i === 0 ? "text-red" : ""
              }`}
            >
              {getNickname(entry.name)}
              <TrendArrow trend={entry.trend} />
            </p>
            {/* Value */}
            <span
              className={`w-10 text-right font-bold text-sm font-mono shrink-0 ${
                i === 0 ? "text-red" : "text-foreground"
              }`}
            >
              {fmt(entry.value)}
            </span>
            {/* Secondary */}
            {secondaryLabel && (
              <span className="w-14 text-right text-muted text-xs font-mono shrink-0">
                {entry.secondary !== undefined ? `${entry.secondary}${secondaryIsPercent ? "%" : ""}` : ""}
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
