import Image from "next/image";
import Link from "next/link";
import "@/components/season/season-recap.css";
import "./roster.css";
import { fetchChelstatsData } from "@/lib/chelstats";
import { getNickname, getDisplayName } from "@/lib/nicknames";
import RosterClient from "./RosterClient";

// Gamertag → real name (for looking up nicknames, jersey numbers, etc.)
// Fill in the empty ones with the player's real name
const GAMERTAG_TO_NAME: Record<string, string> = {
  Rydayro: "RYDER",
  S1obbyRobby: "ROB",
  Mhut8: "MATT",
  "u4 Pablo": "DYLAN",
  "oP wet": "COLIN",
  "u4 Hood": "KADEN",
  "Julio 3026": "JIMMY",
  "oP Ding1633": "LOGAN",
};

function resolveName(gamertag: string): string {
  return GAMERTAG_TO_NAME[gamertag] || gamertag;
}

// Roster roles can differ from the archived stats feed (Ryder is tagged SKTR).
const POSITION_OVERRIDES: Record<string, string> = {
  RYDER: "G",
};

// Jersey numbers (by real name or gamertag)
const JERSEY_NUMBERS: Record<string, number> = {
  RYDER: 14,
  DYLAN: 4,
  MATT: 8,
  ROB: 1,
  COLIN: 2,
  KADEN: 9,
  JIMMY: 69,
  LOGAN: 6,
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
    role: "Two-Way Winger",
    description:
      "Two-way winger who plays both ends of the ice. Backchecks hard, breaks up plays through the neutral zone, then turns defense into offense with a sniper's release. Also doubles as the team's backup goaltender when called upon.",
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

function getPositionGroup(
  position: string
): "forward" | "defense" | "goalie" {
  const pos = position.toUpperCase();
  if (pos === "G" || pos === "GK") return "goalie";
  if (pos === "D") return "defense";
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
  overallRating?: number;
};

export default async function RosterPage() {
  const chelstats = await fetchChelstatsData();
  const members = chelstats?.members ?? [];

  const players: RosterPlayer[] = members.map((m) => {
    const name = resolveName(m.username);
    const position = POSITION_OVERRIDES[name] ?? m.position;
    const svPct =
      m.savePct > 1 ? m.savePct : m.savePct * 100;

    return {
      name,
      position,
      number: JERSEY_NUMBERS[name] ?? 0,
      // Next season’s captain and assistants have not been announced.
      leadership: null,
      positionGroup: getPositionGroup(position),
      nickname: getNickname(name),
      displayName: getDisplayName(name),
      scouting: PLAYER_SCOUTING[name],
      gamesPlayed: m.gamesPlayed,
      points: m.points,
      goals: m.goals,
      assists: m.assists,
      plusMinus: m.plusMinus,
      hits: m.hits,
      saves: m.goalieGP > 0 ? m.goalieSaves : undefined,
      savePercentage: m.goalieGP > 0 ? svPct : undefined,
      goalieGamesPlayed: m.goalieGP > 0 ? m.goalieGP : undefined,
      shutouts: m.goalieGP > 0 ? m.shutouts : undefined,
      overallRating: m.overallRating,
    };
  });

  const forwards = players.filter((p) => p.positionGroup === "forward");
  const defense = players.filter((p) => p.positionGroup === "defense");
  const goalies = players.filter((p) => p.positionGroup === "goalie");

  return (
    <div className="legacy-home concept-1 roster-edition">
      <section className="hero roster-hero">
        <div className="hero-copy">
          <p className="eyebrow">THE LEGACY EDITION / OUR PEOPLE</p>
          <h1>ONE CLUB.<br /><em>EVERY SHIFT.</em></h1>
          <p className="hero-description">
            The names behind the season. The teammates behind the first banner.
            A room that made Bardownski history.
          </p>
          <div className="actions">
            <a className="button" href="#squad">Meet the squad ↗</a>
            <a href="#leadership">Leadership pending ↓</a>
          </div>
          <span className="season-label">NHL 26 <span>/</span> SEASON COMPLETE</span>
        </div>
        <figure>
          <Image src="/images/gallery/screenshots/team2.webp" alt="Bardownski players gathering in a post-game huddle" fill priority sizes="(max-width: 850px) 100vw, 50vw" />
          <figcaption>NEWFOUNDLAND ROOTS. BARDOWNSKI FOREVER.</figcaption>
          <div className="photo-stamp">THE<br /><b>ROOM.</b><small>ONE CLUB / EVERY NAME</small></div>
        </figure>
      </section>

      <div className="stats roster-counts" aria-label="Roster by position">
        <div><strong>{String(forwards.length).padStart(2, "0")}</strong><small>FORWARDS</small></div>
        <div><strong>{String(defense.length).padStart(2, "0")}</strong><small>DEFENSEMEN</small></div>
        <div><strong>{String(goalies.length).padStart(2, "0")}</strong><small>GOALTENDERS</small></div>
      </div>

      <section id="squad" className="section roster-squad" aria-labelledby="squad-title">
        <div className="section-head">
          <div><p className="eyebrow">01 / THE SQUAD</p><h2 id="squad-title">The names on the sweaters.</h2></div>
          <p>The completed season’s squad.<br />Offseason positions. Next season’s lineup is not final.</p>
        </div>
        {players.length === 0 ? (
          <div className="roster-empty"><h3>The room is loading.</h3><p>Roster data is unavailable right now. Please check back soon.</p></div>
        ) : (
          <RosterClient forwards={forwards} defense={defense} goalies={goalies} />
        )}
      </section>

      <section id="leadership" className="section roster-leadership" aria-labelledby="leadership-title">
        <div className="section-head">
          <div><p className="eyebrow">02 / THE NEXT CHAPTER</p><h2 id="leadership-title">Who wears the letters?</h2></div>
          <p>Same club. New era.<br />No selections announced yet.</p>
        </div>
        <div className="roster-letters">
          {[{ letter: "C", role: "Captain" }, { letter: "A", role: "Assistant captain" }, { letter: "A", role: "Assistant captain" }].map(({ letter, role }, index) => (
            <article key={index}>
              <span className="letter-index">0{index + 1} / {role}</span>
              <b aria-hidden="true">{letter}</b>
              <h3>To be announced.</h3>
              <p>Next season’s {role.toLowerCase()} has not been selected publicly.</p>
              <span className="roster-tag">LEADERSHIP · PENDING</span>
            </article>
          ))}
        </div>
        <p className="roster-fine">A fresh leadership chapter. The letters stay unassigned until selections are official.</p>
      </section>

      <section className="roster-closing">
        <p className="eyebrow">THE SEASON ENDS. THE CLUB CONTINUES.</p>
        <h2>Same club.<br /><em>Next chapter.</em></h2>
        <Link className="button" href="/">Revisit the season ↗</Link>
      </section>
    </div>
  );
}
