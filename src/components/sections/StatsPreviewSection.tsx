import Link from "next/link";
import {
  fetchChannelMessages,
  parseStats,
  getEnrichedPlayers,
} from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";
import {
  StatsPreviewAnimated,
  StatsGrid,
  StatsCard,
} from "./StatsPreviewWrapper";

export default async function StatsPreviewSection() {
  const messages = await fetchChannelMessages();
  const stats = parseStats(messages);

  if (!stats) {
    return (
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StatsPreviewAnimated>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold uppercase tracking-wider">
                Top Players
              </h2>
              <Link
                href="/stats"
                className="text-sm text-red hover:text-red-light transition-colors font-medium"
              >
                Full Stats →
              </Link>
            </div>
            <div className="text-center py-16 bg-navy border border-border rounded-xl">
              <p className="text-muted">Stats coming soon.</p>
            </div>
          </StatsPreviewAnimated>
        </div>
      </section>
    );
  }

  const players = getEnrichedPlayers(stats);
  const topPlayers = players
    .filter((p) => p.points !== undefined)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, 3);

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StatsPreviewAnimated>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold uppercase tracking-wider">
              Top Players
            </h2>
            <Link
              href="/stats"
              className="text-sm text-red hover:text-red-light transition-colors font-medium"
            >
              Full Stats →
            </Link>
          </div>
        </StatsPreviewAnimated>

        <StatsGrid>
          {topPlayers.map((player, i) => (
            <StatsCard key={player.name}>
              <div className="relative p-6 pb-4">
                <span className="absolute top-4 right-4 text-5xl font-black text-white/5">
                  #{i + 1}
                </span>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-red/10 rounded-full flex items-center justify-center border border-red/30">
                    <span className="text-red font-bold text-lg">
                      {player.position}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-lg">{getNickname(player.name)}</p>
                    <p className="text-sm text-muted">{player.position}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center px-6 pb-6">
                <div className="bg-surface-light rounded-lg py-3">
                  <p className="text-[10px] text-muted uppercase tracking-wider">GP</p>
                  <p className="font-bold text-lg">{player.gamesPlayed ?? "-"}</p>
                </div>
                <div className="bg-surface-light rounded-lg py-3">
                  <p className="text-[10px] text-muted uppercase tracking-wider">G</p>
                  <p className="font-bold text-lg">{player.goals ?? "-"}</p>
                </div>
                <div className="bg-surface-light rounded-lg py-3">
                  <p className="text-[10px] text-muted uppercase tracking-wider">A</p>
                  <p className="font-bold text-lg">{player.assists ?? "-"}</p>
                </div>
                <div className="bg-red/10 border border-red/20 rounded-lg py-3">
                  <p className="text-[10px] text-red uppercase tracking-wider">PTS</p>
                  <p className="font-bold text-lg text-red">{player.points ?? "-"}</p>
                </div>
              </div>
            </StatsCard>
          ))}
        </StatsGrid>
      </div>
    </section>
  );
}
