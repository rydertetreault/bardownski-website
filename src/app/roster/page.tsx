import Image from "next/image";
import {
  fetchChannelMessages,
  parseStats,
  getEnrichedPlayers,
  type EnrichedPlayer,
} from "@/lib/discord";
import { getDisplayName, getNickname } from "@/lib/nicknames";
import RosterClient from "./RosterClient";

// Captain and assistant captains
const CAPTAIN = "ROB";
const ASSISTANTS = ["KADEN", "COLIN"];

// Position overrides (when Discord data doesn't reflect the correct position)
const POSITION_OVERRIDES: Record<string, string> = {
  KADEN: "D",
  JIMMY: "D",
};

// Jersey numbers
const JERSEY_NUMBERS: Record<string, number> = {
  RYDER: 14,
  DYLAN: 4,
  MATT: 8,
  KADEN: 9,
  JIMMY: 69,
  LOGAN: 6,
  ROB: 1,
  COLIN: 2,
};

// Scouting reports / play style descriptions
const PLAYER_SCOUTING: Record<string, { role: string; description: string }> = {
  DYLAN: {
    role: "Playmaker",
    description:
      "Precise facilitator with elite skill moves. Creates space and finds teammates with surgical passing — a true playmaker who makes everyone around him better.",
  },
  MATT: {
    role: "Sniper",
    description:
      "Pure goal scorer with an elite bag of tricks. When he has the puck in the offensive zone, defenders are on notice. Lethal release from anywhere.",
  },
  KADEN: {
    role: "Offensive Defenseman",
    description:
      "End-to-end playmaking defenseman with a pass-first mentality. Quarterbacks the breakout and isn't afraid to jump into the rush. Sees the ice like a forward.",
  },
  JIMMY: {
    role: "Two-Way Threat",
    description:
      "Defensive-minded sniper with a dual threat — shuts down the opposition's best from the blue line, then makes them pay on the scoresheet. Also doubles as the team's backup goaltender when called upon.",
  },
  ROB: {
    role: "Shutdown Defenseman",
    description:
      "A brick wall on the blue line. Extremely conservative and positional, never out of place. Locks down the defensive zone with calm authority and nothing gets through.",
  },
  RYDER: {
    role: "Goaltender",
    description:
      "Post-to-post netminder who covers every angle. Quick lateral movement and textbook positioning make him a wall. Reads the play before the shot even comes.",
  },
  LOGAN: {
    role: "Big Game Player",
    description:
      "Lives for the moment. When the lights are brightest and the pressure is on, that's when he shows up. A big-time play guy who can flip a game on its head when it matters most.",
  },
  COLIN: {
    role: "Utility",
    description:
      "The ultimate utility player. Can plug in anywhere the team needs him and hold his own. Versatile, reliable, and always ready when his number is called.",
  },
};

function getLeadershipRole(name: string): "C" | "A" | null {
  const upper = name.toUpperCase();
  if (upper === CAPTAIN) return "C";
  if (ASSISTANTS.includes(upper)) return "A";
  return null;
}

function getPositionGroup(
  position: string
): "forward" | "defense" | "goalie" {
  const pos = position.toUpperCase();
  if (pos.includes("GK") || pos === "G") return "goalie";
  if (pos.includes("D") && !pos.includes("W") && !pos.includes("C"))
    return "defense";
  return "forward";
}

export type RosterPlayer = {
  name: string;
  position: string;
  number: number;
  leadership: "C" | "A" | null;
  positionGroup: "forward" | "defense" | "goalie";
  nickname: string;
  displayName: string;
  scouting?: { role: string; description: string };
  gamesPlayed?: number;
  points?: number;
  goals?: number;
  assists?: number;
  plusMinus?: number;
  hits?: number;
  saves?: number;
  savePercentage?: number;
  goalieGamesPlayed?: number;
  shutouts?: number;
};

export default async function RosterPage() {
  const messages = await fetchChannelMessages();
  const stats = parseStats(messages);
  const enriched = stats
    ? getEnrichedPlayers(stats).map((p) => {
        const override = POSITION_OVERRIDES[p.name.toUpperCase()];
        return override ? { ...p, position: override } : p;
      })
    : [];

  const players: RosterPlayer[] = enriched.map((p) => ({
    name: p.name,
    position: p.position,
    number: JERSEY_NUMBERS[p.name.toUpperCase()] ?? 0,
    leadership: getLeadershipRole(p.name),
    positionGroup: getPositionGroup(p.position),
    nickname: getNickname(p.name),
    displayName: getDisplayName(p.name),
    scouting: PLAYER_SCOUTING[p.name.toUpperCase()],
    gamesPlayed: p.gamesPlayed,
    points: p.points,
    goals: p.goals,
    assists: p.assists,
    plusMinus: p.plusMinus,
    hits: p.hits,
    saves: p.saves,
    savePercentage: p.savePercentage,
    goalieGamesPlayed: p.goalieGamesPlayed,
    shutouts: p.shutouts,
  }));

  const forwards = players.filter((p) => p.positionGroup === "forward");
  const defense = players.filter((p) => p.positionGroup === "defense");
  const goalies = players.filter((p) => p.positionGroup === "goalie");

  return (
    <div className="min-h-screen relative">
      {/* Red diagonal streak background */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: -1 }}
      >
        {/* Wide diffuse beam — left */}
        <div
          style={{
            position: "absolute",
            width: "220px",
            height: "300%",
            left: "10%",
            top: "-100%",
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(90deg, transparent, rgba(200,16,46,0.04) 40%, rgba(200,16,46,0.06) 50%, rgba(200,16,46,0.04) 60%, transparent)",
          }}
        />
        {/* Thin sharp streak — left */}
        <div
          style={{
            position: "absolute",
            width: "1px",
            height: "300%",
            left: "18%",
            top: "-100%",
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(200,16,46,0.2) 25%, rgba(200,16,46,0.35) 50%, rgba(200,16,46,0.2) 75%, transparent 100%)",
          }}
        />
        {/* Wide diffuse beam — right */}
        <div
          style={{
            position: "absolute",
            width: "300px",
            height: "300%",
            left: "58%",
            top: "-100%",
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(90deg, transparent, rgba(200,16,46,0.03) 40%, rgba(200,16,46,0.05) 50%, rgba(200,16,46,0.03) 60%, transparent)",
          }}
        />
        {/* Thin sharp streak — right */}
        <div
          style={{
            position: "absolute",
            width: "1px",
            height: "300%",
            left: "74%",
            top: "-100%",
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(200,16,46,0.18) 25%, rgba(200,16,46,0.3) 50%, rgba(200,16,46,0.18) 75%, transparent 100%)",
          }}
        />
      </div>

      {/* Page title */}
      <div className="pt-24 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="h-px w-8 bg-red/40" />
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-[0.15em]">
              Roster
            </h1>
          </div>
          <p className="text-muted text-sm uppercase tracking-widest mt-1 ml-12">
            The Bardownski Squad
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {players.length === 0 ? (
          <div className="text-center py-24 bg-navy border border-border rounded-xl">
            <div className="w-20 h-20 mx-auto mb-6 relative overflow-hidden rounded-xl opacity-20">
              <Image
                src="/images/logo/BD - logo.png"
                alt="Bardownski"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-muted text-lg">Roster coming soon.</p>
            <p className="text-muted/50 text-sm mt-2">
              Player data will be synced from Discord.
            </p>
          </div>
        ) : (
          <RosterClient
            forwards={forwards}
            defense={defense}
            goalies={goalies}
          />
        )}
      </div>
    </div>
  );
}
