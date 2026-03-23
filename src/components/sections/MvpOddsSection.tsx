import type { MvpOddsEntry } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";
import { MvpOddsAnimations, MvpOddsSpin, MvpOddsTable, MvpInfoButton } from "./MvpOddsClient";

/** Compact banner for the homepage — sits right under Top Players */
export function MvpOddsBanner({ odds }: { odds: MvpOddsEntry[] }) {
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
export default function MvpOddsSection({ odds }: { odds: MvpOddsEntry[] }) {
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
            Live from EA
          </span>
          <MvpInfoButton />
        </div>

        <MvpOddsTable odds={odds} />

        <p className="text-[10px] text-muted mt-2 text-center">
          — Odds calculated from live EA stats using points, goals, efficiency, and clutch metrics —
        </p>
      </MvpOddsAnimations>
    </div>
  );
}
