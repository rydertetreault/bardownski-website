import { parseStats, type ParsedStats } from "@/lib/discord";
import { chelstatsToSeasonData, type ClubMember } from "@/lib/chelstats";
import { getNickname } from "@/lib/nicknames";

const STATIC_ITEMS = [
  "BARDOWNSKI HC",
  "EST. 2020",
  "NEWFOUNDLAND",
  "2026 SEASON",
];

const SEPARATOR = <span className="mx-4 text-white/60 text-xs">◆</span>;

const LOOP_DIVIDER = (
  <span className="mx-6 flex items-center gap-2">
    <span className="w-16 h-px bg-white/40" />
    <span className="text-white text-xs opacity-60">★</span>
    <span className="w-16 h-px bg-white/40" />
  </span>
);

function buildStatItems(stats: ParsedStats): string[] {
  const statItems: string[] = [];

  if (stats.points[0])
    statItems.push(`PTS LEADER: ${getNickname(stats.points[0].name)} ${stats.points[0].value}`);
  if (stats.goals[0])
    statItems.push(`GOALS LEADER: ${getNickname(stats.goals[0].name)} ${stats.goals[0].value}`);
  if (stats.assists[0])
    statItems.push(`ASSISTS LEADER: ${getNickname(stats.assists[0].name)} ${stats.assists[0].value}`);
  if (stats.hits[0])
    statItems.push(`HITS LEADER: ${getNickname(stats.hits[0].name)} ${stats.hits[0].value}`);
  if (stats.plusMinus[0]) {
    const pm = stats.plusMinus[0];
    statItems.push(`+/- LEADER: ${getNickname(pm.name)} ${pm.value > 0 ? "+" : ""}${pm.value}`);
  }
  if (stats.pim?.[0])
    statItems.push(`PIM LEADER: ${getNickname(stats.pim[0].name)} ${stats.pim[0].value}`);
  if (stats.shots?.[0])
    statItems.push(`SOG LEADER: ${getNickname(stats.shots[0].name)} ${stats.shots[0].value}`);
  if (stats.gwg?.[0])
    statItems.push(`GWG LEADER: ${getNickname(stats.gwg[0].name)} ${stats.gwg[0].value}`);
  if (stats.takeaways?.[0])
    statItems.push(`TK LEADER: ${getNickname(stats.takeaways[0].name)} ${stats.takeaways[0].value}`);
  if (stats.giveaways?.[0])
    statItems.push(`GV LEADER: ${getNickname(stats.giveaways[0].name)} ${stats.giveaways[0].value}`);
  if (stats.blockedShots?.[0])
    statItems.push(`BS LEADER: ${getNickname(stats.blockedShots[0].name)} ${stats.blockedShots[0].value}`);
  if (stats.saves[0]?.secondary != null)
    statItems.push(`SV% LEADER: ${getNickname(stats.saves[0].name)} ${stats.saves[0].secondary!.toFixed(1)}%`);
  if (stats.shutouts[0])
    statItems.push(`SHUTOUTS LEADER: ${getNickname(stats.shutouts[0].name)} ${stats.shutouts[0].value}`);

  return statItems;
}

export default function StatsTicker({ messages, members }: { messages: unknown[]; members?: ClubMember[] }) {
  let items = STATIC_ITEMS;

  // Prefer chelstats data (has all stat categories) over Discord-parsed data
  const chelstatsStats = members?.length ? chelstatsToSeasonData(members).stats : null;
  const discordStats = parseStats(messages);
  const stats = chelstatsStats || discordStats;

  if (stats) {
    const statItems = buildStatItems(stats);
    if (statItems.length > 0) items = [...STATIC_ITEMS, ...statItems];
  }

  const doubled = [...items, ...items];

  return (
    <div className="w-full h-12 bg-[#cc1533] overflow-hidden flex items-center">
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: ticker-scroll 40s linear infinite;
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
      `}</style>

      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center">
            {i === items.length && LOOP_DIVIDER}
            <span className="uppercase tracking-widest text-sm font-mono font-bold text-white whitespace-nowrap">
              {item}
            </span>
            {SEPARATOR}
          </span>
        ))}
      </div>
    </div>
  );
}
