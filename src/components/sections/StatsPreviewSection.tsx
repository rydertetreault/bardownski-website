import Link from "next/link";
import { computeTopPlayers, type ClubMember } from "@/lib/chelstats";
import { getNickname } from "@/lib/nicknames";
import {
  StatsPreviewAnimated,
  StatsGrid,
  StatsCard,
} from "./StatsPreviewWrapper";
import type { MvpOddsEntry } from "@/lib/discord";
import { MvpOddsBanner } from "./MvpOddsSection";

type StatStyle = "default" | "blue" | "red";

export default function StatsPreviewSection({
  members,
  mvpOdds,
}: {
  members: ClubMember[];
  mvpOdds: MvpOddsEntry[];
}) {
  const topPlayers = computeTopPlayers(members, 3);

  if (topPlayers.length === 0) {
    return (
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StatsPreviewAnimated>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-7 bg-[#cc1533] rounded-full" />
              <h2 className="text-2xl font-bold uppercase tracking-wider">
                Top Players
              </h2>
            </div>
            <div className="text-center py-16 bg-navy border border-border rounded-xl">
              <p className="text-muted">Stats coming soon.</p>
            </div>
          </StatsPreviewAnimated>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StatsPreviewAnimated>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-7 bg-[#cc1533] rounded-full" />
            <h2 className="text-2xl font-bold uppercase tracking-wider">
              Top Players
            </h2>
          </div>
        </StatsPreviewAnimated>

        <StatsGrid>
          {topPlayers.map((player, i) => {
            const stats: { label: string; value: string | number; style: StatStyle }[] =
              player.isGoalie
                ? [
                    { label: "GP", value: player.goalieGP ?? "-", style: "default" },
                    {
                      label: "SV%",
                      value:
                        player.savePct !== undefined
                          ? player.savePct.toFixed(1)
                          : "-",
                      style: "blue",
                    },
                    { label: "SO", value: player.shutouts ?? "-", style: "default" },
                    {
                      label: "GAA",
                      value:
                        player.gaa !== undefined ? player.gaa.toFixed(2) : "-",
                      style: "red",
                    },
                  ]
                : [
                    { label: "GP", value: player.gamesPlayed ?? "-", style: "default" },
                    { label: "G", value: player.goals ?? "-", style: "default" },
                    { label: "A", value: player.assists ?? "-", style: "blue" },
                    { label: "PTS", value: player.points ?? "-", style: "red" },
                  ];

            return (
              <StatsCard key={`${player.name}-${player.isGoalie ? "g" : "s"}`}>
                <div className="flex flex-col p-6 gap-4">
                  <div className="flex items-center gap-4">
                    <span
                      className="text-5xl font-black leading-none select-none"
                      style={{ color: "rgba(91,155,213,0.18)" }}
                    >
                      #{i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-xl text-white">
                        {getNickname(player.name)}
                      </p>
                      <p className="text-sm text-muted uppercase tracking-wider">
                        {player.position}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {stats.map(({ label, value, style }) => (
                      <div
                        key={label}
                        className={`flex-1 text-center rounded-lg py-3 px-2 ${
                          style === "red"
                            ? "bg-red/10 border border-red/20"
                            : style === "blue"
                            ? "border border-[#5b9bd5]/20"
                            : "bg-surface-light"
                        }`}
                        style={
                          style === "blue"
                            ? { backgroundColor: "rgba(91,155,213,0.07)" }
                            : undefined
                        }
                      >
                        <p
                          className={`text-[10px] uppercase tracking-wider ${
                            style === "red"
                              ? "text-red"
                              : style === "blue"
                              ? "text-[#5b9bd5]"
                              : "text-muted"
                          }`}
                        >
                          {label}
                        </p>
                        <p
                          className={`font-bold text-lg ${
                            style === "red"
                              ? "text-red"
                              : style === "blue"
                              ? "text-[#5b9bd5]"
                              : "text-white"
                          }`}
                        >
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </StatsCard>
            );
          })}
        </StatsGrid>

        <div className="flex justify-end mt-4">
          <Link
            href="/stats"
            className="text-sm text-[#cc1533] hover:text-red-light transition-colors font-medium uppercase tracking-wider"
          >
            View Full Stats →
          </Link>
        </div>

        <MvpOddsBanner odds={mvpOdds} />
      </div>
    </section>
  );
}