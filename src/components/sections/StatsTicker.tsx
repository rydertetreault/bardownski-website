import { parseStats } from "@/lib/discord";
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

export default function StatsTicker({ messages }: { messages: unknown[] }) {
  let items = STATIC_ITEMS;

  const stats = parseStats(messages);
  if (stats) {
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
    if (stats.saves[0]?.secondary != null)
      statItems.push(`SV% LEADER: ${getNickname(stats.saves[0].name)} ${stats.saves[0].secondary!.toFixed(1)}%`);
    if (stats.shutouts[0])
      statItems.push(`SHUTOUTS LEADER: ${getNickname(stats.shutouts[0].name)} ${stats.shutouts[0].value}`);

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
