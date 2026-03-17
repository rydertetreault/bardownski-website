import { computeMvpOdds, type MvpOddsEntry } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";
import { MvpOddsAnimations, MvpOddsSpin } from "./MvpOddsClient";

function OddsRow({ entry, index, isLast }: { entry: MvpOddsEntry; index: number; isLast: boolean }) {
  const isFavorite = index === 0;
  return (
    <div
      className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 px-4 sm:px-6 py-4 items-center transition-colors ${
        !isLast ? "border-b border-border/50" : ""
      } ${isFavorite ? "bg-[#cc1533]/5" : "hover:bg-surface-light/30"}`}
    >
      <span className={`text-lg font-black w-6 text-center ${isFavorite ? "text-[#cc1533]" : "text-muted/40"}`}>
        {index + 1}
      </span>

      <div className="min-w-0">
        <p className={`font-bold text-sm sm:text-base truncate ${isFavorite ? "text-white" : "text-white/90"}`}>
          {getNickname(entry.name)}
        </p>
        <p className="text-[10px] text-muted uppercase tracking-wider">
          {entry.position}
        </p>
      </div>

      <div className="hidden sm:flex gap-2">
        {entry.highlights.map((h) => (
          <span
            key={h}
            className="text-xs text-muted bg-surface-light/50 rounded px-2 py-0.5 whitespace-nowrap"
          >
            {h}
          </span>
        ))}
      </div>

      <div className="w-14 text-right text-sm text-muted">
        {(entry.probability * 100).toFixed(1)}%
      </div>

      <div className={`w-20 text-right font-mono font-bold text-lg ${
        isFavorite
          ? "text-[#cc1533]"
          : entry.americanOdds.startsWith("+")
          ? "text-emerald-400"
          : "text-white"
      }`}>
        {entry.americanOdds}
      </div>
    </div>
  );
}

/** Compact banner for the homepage — sits right under Top Players */
export function MvpOddsBanner({ messages }: { messages: unknown[] }) {
  const odds = computeMvpOdds(messages);

  if (odds.length === 0) return null;

  const bannerEntries = odds.map((entry) => ({
    name: entry.name,
    nickname: getNickname(entry.name),
    isGoalie: entry.isGoalie,
    probability: entry.probability,
    americanOdds: entry.americanOdds,
  }));

  return (
    <div className="mt-6">
      <MvpOddsAnimations>
        <MvpOddsSpin entries={bannerEntries} />
      </MvpOddsAnimations>
    </div>
  );
}

/** Full table for the stats page */
export default function MvpOddsSection({ messages }: { messages: unknown[] }) {
  const odds = computeMvpOdds(messages);

  if (odds.length === 0) return null;

  return (
    <div className="mb-12">
      <MvpOddsAnimations>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-7 bg-[#cc1533] rounded-full" />
          <h2 className="text-xl font-bold uppercase tracking-wider">
            MVP Odds
          </h2>
          <span className="text-xs text-muted uppercase tracking-wider">
            Based on current stats
          </span>
        </div>

        <div className="bg-navy border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 px-4 sm:px-6 py-3 border-b border-border text-[10px] sm:text-xs uppercase tracking-wider text-muted">
            <span className="w-6" />
            <span>Player</span>
            <span className="text-right hidden sm:block">Stats</span>
            <span className="text-right w-14">Prob</span>
            <span className="text-right w-20">Odds</span>
          </div>

          {odds.map((entry, i) => (
            <OddsRow
              key={`${entry.name}-${entry.isGoalie ? "g" : "s"}`}
              entry={entry}
              index={i}
              isLast={i === odds.length - 1}
            />
          ))}
        </div>

        <p className="text-[10px] text-[#cc1533] mt-2 text-center">
          — Odds are calculated using the top 5 leaders in each stat category — some player stats may be incomplete —
        </p>
        <p className="text-[10px] text-white mt-1 text-center pl-4">
          — Fix in progress —
        </p>
      </MvpOddsAnimations>
    </div>
  );
}
