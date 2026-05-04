import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchChelstatsData } from "@/lib/chelstats";
import { getMatchHistory } from "@/lib/match-history";
import { generateMatchDescription } from "@/lib/match-description";
import { isChampionshipClincher, CHAMPIONSHIP_DESCRIPTION } from "@/lib/championship";
import ChampionshipDescription from "../components/ChampionshipDescription";
import { getNickname } from "@/lib/nicknames";
import type { Match, MatchPlayerStat } from "@/types";
import MatchesBackground from "../MatchesBackground";

/* ── Helpers ── */

function getResult(match: Match): "W" | "L" | null {
  if (
    match.status !== "final" ||
    match.scoreUs === null ||
    match.scoreThem === null
  )
    return null;
  return match.scoreUs > match.scoreThem ? "W" : "L";
}

/* ── Stat Bar ── */

function StatBar({
  label,
  valueUs,
  valueThem,
  format,
  gold,
}: {
  label: string;
  valueUs: number | string;
  valueThem: number | string;
  format?: "number" | "time";
  gold?: boolean;
}) {
  const numUs = typeof valueUs === "number" ? valueUs : parseFloat(valueUs) || 0;
  const numThem = typeof valueThem === "number" ? valueThem : parseFloat(valueThem) || 0;
  const total = numUs + numThem || 1;
  const pctUs = (numUs / total) * 100;
  const displayUs = format === "time" ? valueUs : valueUs;
  const displayThem = format === "time" ? valueThem : valueThem;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-sm font-bold tabular-nums ${numUs > numThem ? "text-white" : "text-muted"}`}>
          {displayUs}
        </span>
        <span className="text-[10px] text-muted uppercase tracking-widest">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${numThem > numUs ? "text-white" : "text-muted"}`}>
          {displayThem}
        </span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-navy-dark">
        <div
          className={`rounded-l-full transition-all duration-500 ${gold ? "" : "bg-red"}`}
          style={{
            width: `${pctUs}%`,
            ...(gold && { backgroundColor: "#f4d35e" }),
          }}
        />
        <div className="bg-muted/40 rounded-r-full transition-all duration-500" style={{ width: `${100 - pctUs}%` }} />
      </div>
    </div>
  );
}

/* ── Player Row ── */

function PlayerRow({ player }: { player: MatchPlayerStat }) {
  if (player.isGoalie) {
    return (
      <div className="flex items-center gap-3 py-3 border-t border-border/20 first:border-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{getNickname(player.name)}</p>
          <p className="text-[10px] text-muted uppercase tracking-widest">Goalie</p>
        </div>
        <div className="flex gap-4 text-xs font-mono">
          <div className="text-center">
            <p className="text-[9px] text-muted uppercase">SVS</p>
            <p className="font-bold">{player.saves}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted uppercase">GA</p>
            <p className="font-bold">{player.goalsAgainst}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted uppercase">SV%</p>
            <p className="font-bold">
              {player.savePct > 0
                ? (player.savePct <= 1 ? player.savePct : player.savePct / 100).toFixed(3)
                : "\u2014"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const points = player.goals + player.assists;
  return (
    <div className="flex items-center gap-3 py-3 border-t border-border/20 first:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{getNickname(player.name)}</p>
        <p className="text-[10px] text-muted uppercase tracking-widest capitalize">
          {player.position.replace("left", "L").replace("right", "R").replace("Wing", "W").replace("Defense", "D").replace("center", "C")}
        </p>
      </div>
      <div className="flex gap-4 text-xs font-mono">
        <div className="text-center">
          <p className="text-[9px] text-muted uppercase">G</p>
          <p className={`font-bold ${player.goals > 0 ? "text-red" : ""}`}>{player.goals}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted uppercase">A</p>
          <p className={`font-bold ${player.assists > 0 ? "text-light-blue" : ""}`}>{player.assists}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted uppercase">PTS</p>
          <p className={`font-bold ${points > 0 ? "text-white" : ""}`}>{points}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted uppercase">+/-</p>
          <p className={`font-bold ${player.plusMinus > 0 ? "text-emerald-400" : player.plusMinus < 0 ? "text-red" : ""}`}>
            {player.plusMinus > 0 ? `+${player.plusMinus}` : player.plusMinus}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted uppercase">SOG</p>
          <p className="font-bold">{player.shots}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted uppercase">HIT</p>
          <p className="font-bold">{player.hits}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chelstats = await fetchChelstatsData();
  if (!chelstats) notFound();

  // Search accumulated Redis history so older matches are still accessible
  const allMatches = await getMatchHistory(chelstats);
  const raw = allMatches.find((m) => m.id === id);
  if (!raw) notFound();

  const match: Match = {
    id: raw.id,
    timestamp: raw.timestamp,
    date: raw.date,
    opponent: raw.opponent,
    homeAway: raw.homeAway,
    scoreUs: raw.scoreUs,
    scoreThem: raw.scoreThem,
    status: "final",
    matchType: raw.matchType,
    shotsUs: raw.shotsUs,
    shotsThem: raw.shotsThem,
    toaUs: raw.toaUs,
    toaThem: raw.toaThem,
    passCompUs: raw.passCompUs,
    passCompThem: raw.passCompThem,
    players: raw.players,
    threeStars: raw.threeStars,
  };

  const result = getResult(match);
  const isWin = result === "W";
  const hasStats = match.shotsUs !== undefined && match.shotsThem !== undefined;
  const isClincher = isChampionshipClincher(match);

  return (
    <div className="min-h-screen relative">
      <MatchesBackground />

      {/* Rivalry header */}
      <div className="relative pt-16">
        <div className="relative h-48 md:h-56 overflow-hidden">
          {/* Split background */}
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                background: isWin
                  ? isClincher
                    ? "linear-gradient(135deg, rgba(244,211,94,0.20) 0%, rgba(244,211,94,0.07) 40%, transparent 50%, rgba(255,255,255,0.02) 60%, rgba(255,255,255,0.04) 100%)"
                    : "linear-gradient(135deg, rgba(204,21,51,0.18) 0%, rgba(204,21,51,0.06) 40%, transparent 50%, rgba(255,255,255,0.02) 60%, rgba(255,255,255,0.04) 100%)"
                  : "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 40%, transparent 50%, rgba(204,21,51,0.06) 60%, rgba(204,21,51,0.12) 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, transparent 49.5%, rgba(255,255,255,0.06) 49.5%, rgba(255,255,255,0.06) 50.5%, transparent 50.5%)",
              }}
            />
          </div>
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 40%, #070a12 100%)" }}
          />

          {/* VS content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-4 md:gap-8">
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative w-12 h-12 md:w-16 md:h-16">
                  <Image src="/images/logo/BD - logo.png" alt="BD" fill className="object-contain drop-shadow-lg" />
                </div>
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white">BD</span>
              </div>

              <div className="flex items-center gap-3 md:gap-5">
                <span className={`text-4xl md:text-6xl font-black tabular-nums ${isWin ? "text-white" : "text-muted"}`}>
                  {match.scoreUs}
                </span>
                <span className="text-sm text-white/15 font-bold">–</span>
                <span className={`text-4xl md:text-6xl font-black tabular-nums ${!isWin ? "text-white" : "text-muted"}`}>
                  {match.scoreThem}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                  <span className="text-xl md:text-2xl font-black text-white/15">{match.opponent.charAt(0)}</span>
                </div>
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted truncate max-w-[80px] text-center">
                  {match.opponent}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 inset-x-0 flex flex-col items-center pb-3">
            <div className="flex items-center gap-3">
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded ${
                  isWin
                    ? isClincher
                      ? "text-amber-300 bg-amber-500/10"
                      : "text-emerald-400 bg-emerald-500/10"
                    : "text-red bg-red/10"
                }`}
              >
                {isWin ? "Victory" : "Defeat"}
              </span>
              <span className="text-[10px] text-muted/40 tracking-widest">{match.date}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/matches"
          className="inline-flex items-center gap-2 text-muted hover:text-white text-xs uppercase tracking-widest mb-6 transition-colors"
        >
          <span>←</span> Back to Scores
        </Link>

        {/* Description — gold callout with custom recap for the championship clincher */}
        {isChampionshipClincher(match) ? (
          <ChampionshipDescription description={CHAMPIONSHIP_DESCRIPTION} />
        ) : (
          <p className="text-sm text-muted leading-relaxed mb-6">
            {generateMatchDescription(match)}
          </p>
        )}

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
          {/* Left column — stats + players */}
          <div className="space-y-4">
            {/* Team Stats */}
            {hasStats && (
              <div className="bg-navy/70 border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${isClincher ? "" : "text-red"}`}
                    style={isClincher ? { color: "#f4d35e" } : undefined}
                  >
                    BD
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-0.5 h-3 rounded-full ${isClincher ? "" : "bg-red"}`}
                      style={isClincher ? { backgroundColor: "#f4d35e" } : undefined}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                      Team Stats
                    </span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    {match.opponent.length > 15 ? match.opponent.slice(0, 15) + "..." : match.opponent}
                  </span>
                </div>
                <div className="space-y-4">
                  <StatBar label="Goals" valueUs={match.scoreUs ?? 0} valueThem={match.scoreThem ?? 0} gold={isClincher} />
                  <StatBar label="Shots" valueUs={match.shotsUs ?? 0} valueThem={match.shotsThem ?? 0} gold={isClincher} />
                  {match.toaUs && match.toaThem && (
                    <StatBar label="Time on Attack" valueUs={match.toaUs} valueThem={match.toaThem} format="time" gold={isClincher} />
                  )}
                  {match.passCompUs !== undefined && match.passCompThem !== undefined && (
                    <StatBar label="Pass %" valueUs={`${match.passCompUs}%`} valueThem={`${match.passCompThem}%`} gold={isClincher} />
                  )}
                </div>
              </div>
            )}

            {/* Player Performance */}
            {match.players && match.players.length > 0 && (
              <div className="bg-navy/70 border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`w-0.5 h-4 rounded-full ${isClincher ? "" : "bg-red"}`}
                    style={isClincher ? { backgroundColor: "#f4d35e" } : undefined}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    Player Performance
                  </span>
                </div>
                <div className="bg-navy-dark/50 rounded-lg px-4 py-1">
                  {match.players.map((player) => (
                    <PlayerRow key={player.name} player={player} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — Three Stars */}
          {match.threeStars && (
            <div className="md:w-52">
              <div className="bg-navy/70 border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-0.5 h-4 bg-amber-400 rounded-full" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    Three Stars
                  </span>
                </div>
                <div className="space-y-3">
                  {match.threeStars.map((star, i) => (
                    <div
                      key={star.name}
                      className={`rounded-lg p-3 border ${
                        star.isOurPlayer
                          ? "bg-red/5 border-red/20"
                          : "bg-surface-light/30 border-border/30"
                      }`}
                    >
                      <p className="text-amber-400 text-xs font-bold mb-1">
                        {i === 0 ? "1st Star" : i === 1 ? "2nd Star" : "3rd Star"}
                      </p>
                      <p
                        className={`text-sm font-bold truncate ${
                          star.isOurPlayer ? "text-white" : "text-muted"
                        }`}
                      >
                        {star.isOurPlayer ? getNickname(star.name) : star.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-amber-400/70 font-mono">
                          {star.score.toFixed(1)} pts
                        </span>
                        {star.isGoalie && (
                          <span className="text-[9px] text-muted uppercase bg-navy-dark/50 px-1.5 py-0.5 rounded">
                            G
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
