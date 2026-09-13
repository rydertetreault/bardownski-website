import Image from "next/image";
import Link from "next/link";
import "./roster.css";
import { FROZEN_CHELSTATS } from "@/lib/chelstats-frozen";
import { SEASON_REVEAL } from "@/lib/season-reveal";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "2026–2027 Roster | Bardownski Hockey", description: "Meet the 2026–2027 Bardownski roster: forwards, defense, goalies, captain Xavier Laflamme and assistant captain Matt Hut. One room. All in." };
import { getNickname } from "@/lib/nicknames";
import RosterClient from "./RosterClient";
import { getScoutingReport, type ScoutingReport } from "./scouting";

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

// Keep the established captain and assistant consistent with the club’s shared leadership data.
const ROSTER_LEADERS = [
  SEASON_REVEAL.leadership.captain,
  ...SEASON_REVEAL.leadership.assistants,
];

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
  number: number | null;
  leadership: "C" | "A" | null;
  positionGroup: "forward" | "defense" | "goalie";
  nickname: string;
  scouting: ScoutingReport;
};

export default async function RosterPage() {
  // Identities and scouting evidence come from the saved 2025–2026 directory.
  // Performance appears only in explicitly labeled last-season reports.
  const chelstats = FROZEN_CHELSTATS;
  const members = chelstats?.members ?? [];

  const players: RosterPlayer[] = members.map((m) => {
    const name = resolveName(m.username);
    const position = POSITION_OVERRIDES[name] ?? m.position;

    return {
      name,
      position,
      number: JERSEY_NUMBERS[name] ?? null,
      leadership: ROSTER_LEADERS.find((leader) => leader.profileName === name)?.letter ?? null,
      positionGroup: getPositionGroup(position),
      nickname: getNickname(name),
      scouting: getScoutingReport(m, name),
    };
  });

  const forwards = players.filter((p) => p.positionGroup === "forward");
  const defense = players.filter((p) => p.positionGroup === "defense");
  const goalies = players.filter((p) => p.positionGroup === "goalie");

  return (
    <div className="roster-edition">
      <header className="roster-hero" aria-labelledby="roster-title">
        <div className="roster-hero-image">
          <Image src="/images/homepage/team-teal.webp" alt="Bardownski players together in a post-game huddle" fill priority sizes="100vw" />
        </div>
        <div className="roster-hero-content roster-inner">
          <p className="roster-eyebrow">Bardownski hockey / 2026–2027</p>
          <p className="roster-season-marker"><span aria-hidden="true" /> Mid-season. All in.</p>
          <h1 id="roster-title">One room.<br /><em>All in.</em></h1>
          <p className="roster-hero-description">
            The players behind every goal, every stop, and every hard-earned point.
            This is Bardownski, night after night.
          </p>
          <div className="roster-hero-actions">
            <a className="roster-text-link" href="#squad">Meet the roster <span aria-hidden="true">↓</span></a>
            <a href="#leadership">Our leadership <span aria-hidden="true">↗</span></a>
          </div>
          <nav className="roster-position-nav" aria-label="Jump to roster position">
            {[
              { id: "forwards", label: "Forwards", count: forwards.length },
              { id: "defense", label: "Defense", count: defense.length },
              { id: "goalies", label: "Goalies", count: goalies.length },
            ].filter(group => group.count > 0).map(group => (
              <a href={`#${group.id}`} key={group.id}>
                <span>{group.label}</span><span className="roster-nav-count">{String(group.count).padStart(2, "0")}</span><span aria-hidden="true">↘</span>
              </a>
            ))}
          </nav>
          <p className="roster-hero-caption">Newfoundland roots. Bardownski forever.</p>
        </div>
      </header>

      <section id="squad" className="roster-squad" aria-labelledby="squad-title">
        <div className="roster-squad-heading roster-inner">
          <div><p className="roster-eyebrow">The 2026–2027 roster</p><h2 id="squad-title">The names on the sweaters.</h2></div>
          <p>Different roles. One room.<br />Every shift takes all of us.</p>
        </div>
        {players.length === 0 ? (
          <div className="roster-empty roster-inner"><h3>The room is loading.</h3><p>Roster data is unavailable right now. Please check back soon.</p></div>
        ) : (
          <RosterClient forwards={forwards} defense={defense} goalies={goalies} />
        )}
      </section>

      <section id="leadership" className="roster-leaders" aria-labelledby="leadership-title">
        <div className="roster-inner">
          <div className="roster-leaders-heading">
            <div><p className="roster-eyebrow">04 / Leadership</p><h2 id="leadership-title">The standard.<br /><em>Every night.</em></h2></div>
            <p>Leading the room. Setting the tone.<br />Our captain and assistant, on the ice and behind the crest.</p>
          </div>
          <div className="roster-leader-list">
            {ROSTER_LEADERS.map(({ name, letter, role }) => (
              <article className="roster-leader" key={letter}>
                <span className="roster-leader-letter" aria-hidden="true">{letter}</span>
                <div className="roster-leader-name">
                  <p className="roster-eyebrow">{role} / 2026–2027</p>
                  <h3>{name}</h3>
                </div>
                <p className="roster-leader-description">
                  {letter === "C"
                    ? "Xavier Laflamme captains Bardownski. The playmaker at the heart of the attack, wearing the C and setting the standard every shift."
                    : "Matt Hut wears the A. A scorer with a lethal release, helping lead the room and keeping the pressure on in the offensive zone."}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="roster-outro club-mark-panel" aria-labelledby="roster-outro-title">
        <div className="roster-inner">
          <p className="roster-eyebrow">The season keeps moving.</p>
          <h2 id="roster-outro-title">Same room.<br /><em>Back to work.</em></h2>
          <div className="roster-outro-links">
            <Link className="roster-text-link" href="/matches">Follow the games <span aria-hidden="true">↗</span></Link>
            <Link href="/stats">Player stats <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
