import Image from "next/image";
import type { Match, MatchPlayerStat } from "@/types";
import { CHAMPIONSHIP, CHAMPIONSHIP_DESCRIPTION, isChampionshipClincher } from "@/lib/championship";
import { generateMatchDescription } from "@/lib/match-description";
import OpponentCrest from "./OpponentCrest";
import { getNickname } from "@/lib/nicknames";

export type MatchReportProps = {
  match: Match;
  season: "2026-2027" | "2025-2026";
  titleId?: string;
  standalone?: boolean;
};

type Outcome = "win" | "loss" | "draw" | "pending";
type StatValue = number | string | null | undefined;

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCount(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

function getOutcome(match: Match): Outcome {
  if (match.status !== "final" || !isCount(match.scoreUs) || !isCount(match.scoreThem)) return "pending";
  if (match.scoreUs === match.scoreThem) return "draw";
  return match.scoreUs > match.scoreThem ? "win" : "loss";
}

/** Compare durations in seconds, not parseFloat("4:59") === 4. */
function timeSeconds(value: StatValue): number | null {
  if (typeof value !== "string" || !/^\d+:[0-5]\d$/.test(value.trim())) return null;
  const [minutes, seconds] = value.trim().split(":").map(Number);
  const total = minutes * 60 + seconds;
  return Number.isFinite(total) ? total : null;
}

function MissingStat() {
  return <><span aria-hidden="true">—</span><span className="match-report__sr-only">Not available</span></>;
}

function Stat({ value, signed = false }: { value: number | null | undefined; signed?: boolean }) {
  if (!isNumber(value) || (!signed && value < 0)) return <MissingStat />;
  return <>{signed && value > 0 ? `+${value}` : value}</>;
}

function savePercentage(value: number): string | null {
  if (!isCount(value) || value > 100) return null;
  // Match sources use either a fraction or a percentage. Zero is a saved stat.
  return (value <= 1 ? value : value / 100).toFixed(3);
}

function positionLabel(player: MatchPlayerStat): string {
  if (player.isGoalie) return "G";
  const positions: Record<string, string> = {
    center: "C", leftwing: "LW", rightwing: "RW", leftdefense: "LD", rightdefense: "RD",
    leftdefenceman: "LD", rightdefenceman: "RD", defense: "D", defence: "D",
  };
  return positions[player.position?.replace(/[\s_-]/g, "").toLowerCase()] || player.position || "—";
}

function playerName(player: Pick<MatchPlayerStat, "name" | "isOurPlayer">): string {
  return player.isOurPlayer ? getNickname(player.name) : player.name;
}

function recapText(match: Match, outcome: Outcome, isClincher: boolean, archive: boolean): string {
  if (isClincher) return CHAMPIONSHIP_DESCRIPTION;
  if (match.status === "upcoming") return `Bardownski will face ${match.opponent}. The match recap will be available once a final result is recorded.`;
  if (match.status === "live") return `Bardownski and ${match.opponent} are in action. This is not a final result; the recap will follow when the match is complete.`;
  if (outcome === "pending") return `The final score for Bardownski versus ${match.opponent} isn’t available yet. We’ll show the recap when the result is complete.`;
  const factual = `Bardownski ${match.scoreUs}–${match.scoreThem} ${match.opponent}.`;
  if (match.forfeit) return `${factual} This result was recorded as a forfeit.`;
  if (outcome === "draw") return `${factual} The recorded final score is level.`;
  // The shared generator also recognizes the archive clincher. A current-season
  // ID/opponent collision must never inherit that historical championship story.
  if (!archive && isChampionshipClincher(match)) return `${factual} Final result · ${match.date}.`;

  const hasShots = isCount(match.shotsUs) && isCount(match.shotsThem);
  const hasTime = timeSeconds(match.toaUs) !== null && timeSeconds(match.toaThem) !== null;
  const hasPassing = isCount(match.passCompUs) && match.passCompUs <= 100 && isCount(match.passCompThem) && match.passCompThem <= 100;
  return generateMatchDescription({
    ...match,
    // The legacy generator defaults absent numbers to zero. Omit incomplete
    // pairs so it cannot narrate a shot/possession edge against a missing stat.
    shotsUs: hasShots ? match.shotsUs : undefined,
    shotsThem: hasShots ? match.shotsThem : undefined,
    toaUs: hasTime ? match.toaUs : undefined,
    toaThem: hasTime ? match.toaThem : undefined,
    passCompUs: hasPassing ? match.passCompUs : undefined,
    passCompThem: hasPassing ? match.passCompThem : undefined,
    players: match.players?.filter(player => player.isGoalie
      ? isCount(player.saves) && isCount(player.goalsAgainst)
      : isCount(player.goals) && isCount(player.assists) && isCount(player.hits) && isCount(player.shots)),
  });
}

function ComparisonBar({ label, valueUs, valueThem, opponent, format = "number" }: {
  label: string;
  valueUs: StatValue;
  valueThem: StatValue;
  opponent: string;
  format?: "number" | "time" | "percent";
}) {
  const numeric = (value: StatValue) => format === "time" ? timeSeconds(value)
    : isCount(value) && (format !== "percent" || value <= 100) ? value : null;
  const us = numeric(valueUs);
  const them = numeric(valueThem);
  const total = us !== null && them !== null ? us + them : 0;
  const comparable = total > 0 && Number.isFinite(total);
  const display = (value: StatValue, number: number | null) => number === null
    ? <MissingStat /> : format === "percent" ? `${number}%` : value;
  return <div className="match-report__metric">
    <dt>{label}{format === "time" && <small>mm:ss</small>}</dt>
    <dd className="match-report__metric-values">
      <span><span className="match-report__sr-only">Bardownski: </span>{display(valueUs, us)}</span>
      <span><span className="match-report__sr-only">{opponent}: </span>{display(valueThem, them)}</span>
    </dd>
    <dd className="match-report__bar" aria-hidden="true" data-comparable={comparable}>
      <span style={{ width: `${comparable ? (us! / total) * 100 : 0}%` }} />
      <span style={{ width: `${comparable ? (them! / total) * 100 : 0}%` }} />
    </dd>
  </div>;
}

function PlayerTable({ players, team, goalie = false }: { players: MatchPlayerStat[]; team: string; goalie?: boolean }) {
  const label = `${team} · ${goalie ? "Goaltending" : "Skaters"}`;
  if (!players.length) return <p className="match-report__empty match-report__empty--compact">{goalie ? "Goaltending" : "Skater"} statistics weren’t supplied for {team}.</p>;
  return <div className="match-report__table-scroll" role="region" aria-label={`${label} statistics, scroll horizontally if needed`} tabIndex={0}>
    <table className={goalie ? "match-report__table match-report__table--goalies" : "match-report__table"}>
      <caption>{label}</caption>
      <thead><tr>
        <th scope="col">Player</th>
        {goalie ? <>
          <th scope="col">Saves</th>
          <th scope="col"><abbr title="Goals against">GA</abbr></th>
          <th scope="col"><abbr title="Save percentage, expressed as a decimal">SV%</abbr></th>
        </> : <>
          <th scope="col"><abbr title="Position">Pos</abbr></th>
          <th scope="col"><abbr title="Goals">G</abbr></th>
          <th scope="col"><abbr title="Assists">A</abbr></th>
          <th scope="col"><abbr title="Points">PTS</abbr></th>
          <th scope="col"><abbr title="Plus/minus">+/−</abbr></th>
          <th scope="col"><abbr title="Shots on goal">SOG</abbr></th>
          <th scope="col">Hits</th>
          <th scope="col"><abbr title="Penalty minutes">PIM</abbr></th>
        </>}
      </tr></thead>
      <tbody>{players.map((player, index) => <tr key={`${player.name}-${index}`}>
        <th scope="row">{playerName(player)}</th>
        {goalie ? <>
          <td><Stat value={player.saves} /></td>
          <td><Stat value={player.goalsAgainst} /></td>
          <td>{savePercentage(player.savePct) ?? <MissingStat />}</td>
        </> : <>
          <td className="match-report__position">{positionLabel(player)}</td>
          <td><Stat value={player.goals} /></td>
          <td><Stat value={player.assists} /></td>
          <td className="match-report__points"><Stat value={isCount(player.goals) && isCount(player.assists) ? player.goals + player.assists : undefined} /></td>
          <td><Stat value={player.plusMinus} signed /></td>
          <td><Stat value={player.shots} /></td>
          <td><Stat value={player.hits} /></td>
          <td><Stat value={player.pim} /></td>
        </>}
      </tr>)}</tbody>
    </table>
  </div>;
}

export default function MatchReport({ match, season, titleId, standalone = false }: MatchReportProps) {
  const Title = standalone ? "h1" : "h2";
  const SectionTitle = standalone ? "h2" : "h3";
  const TeamTitle = standalone ? "h3" : "h4";
  const archive = season === "2025-2026";
  const outcome = getOutcome(match);
  const isClincher = archive && outcome === "win" && isChampionshipClincher(match);
  const status = match.status === "final" ? "Final" : match.status === "live" ? "In progress" : "Upcoming";
  const outcomeLabel = outcome === "win" ? "Bardownski win" : outcome === "loss" ? "Bardownski loss" : outcome === "draw" ? "Draw" : match.status === "final" ? "Score unavailable" : status;
  const matchType = match.matchType === "finals" ? "Club finals" : match.matchType === "private" ? "Private game" : "Club match";
  const recap = recapText(match, outcome, isClincher, archive);
  const ourPlayers = match.players?.filter(player => player.isOurPlayer) ?? [];
  const opposition = match.players?.filter(player => !player.isOurPlayer) ?? [];
  const stars = match.threeStars?.slice(0, 3) ?? [];
  const completeTeamStats = isCount(match.shotsUs) && isCount(match.shotsThem)
    && timeSeconds(match.toaUs) !== null && timeSeconds(match.toaThem) !== null
    && isCount(match.passCompUs) && match.passCompUs <= 100 && isCount(match.passCompThem) && match.passCompThem <= 100;

  return <article className={`match-report${standalone ? " match-report--standalone" : " match-report--embedded"}${archive ? " match-report--archive" : ""}${isClincher ? " match-report--championship" : ""}`} aria-labelledby={titleId}>
    <header className="match-report__hero">
      <div className="match-report__edition">
        <p>{archive ? "From the archive" : "The match centre"} <span aria-hidden="true">/</span> {season.replace("-", "–")}</p>
        <p>{match.date || "Date unavailable"}</p>
      </div>
      <div className="match-report__title-row">
        <Title id={titleId} className="match-report__title">Match report<span className="match-report__title-dot" aria-hidden="true">.</span><span className="match-report__sr-only"> Bardownski versus {match.opponent}</span></Title>
        <span className="match-report__outcome" data-outcome={outcome}>{outcomeLabel}</span>
      </div>
      <div className="match-report__scoreboard">
        <div className="match-report__team match-report__team--ours">
          <div className="match-report__crest"><Image data-brand-mark src="/images/logo/B-logo.png" alt="" width={80} height={80} /></div>
          <strong>Bardownski</strong>
          <span>{match.homeAway === "home" ? "Home ice" : "On the road"}</span>
        </div>
        <div className="match-report__score-block">
          <span className="match-report__score-status">{status}{match.forfeit ? " · Forfeit" : ""}</span>
          <p className="match-report__score" role="img" aria-label={`${status} score: Bardownski ${isCount(match.scoreUs) ? match.scoreUs : "not available"}, ${match.opponent} ${isCount(match.scoreThem) ? match.scoreThem : "not available"}`}>
            <span aria-hidden="true" data-winner={outcome === "win"}><Stat value={match.scoreUs} /></span>
            <span className="match-report__score-dash" aria-hidden="true">–</span>
            <span aria-hidden="true" data-winner={outcome === "loss"}><Stat value={match.scoreThem} /></span>
          </p>
          <span className="match-report__match-type">{matchType}</span>
        </div>
        <div className="match-report__team match-report__team--opposition">
          <OpponentCrest opponent={match.opponent} crest={match.opponentCrest} className="match-report__opponent-crest" />
          <strong>{match.opponent}</strong>
          <span>Opposition · {match.homeAway === "home" ? "Away" : "Home"}</span>
        </div>
      </div>
      {isClincher && <p className="match-report__championship-banner"><span aria-hidden="true">★</span> Championship clincher <span>{CHAMPIONSHIP.season} / {CHAMPIONSHIP.division}</span></p>}
    </header>

    <div className="match-report__body">
      <section className="match-report__recap" aria-label="Match recap">
        <div className="match-report__section-heading"><span className="match-report__section-number" aria-hidden="true">01</span><div><p className="match-report__eyebrow">{isClincher ? "A night for the history books" : "The story of the game"}</p><SectionTitle>{isClincher ? "The title is ours." : "The recap."}</SectionTitle></div></div>
        <div className="match-report__recap-copy">{recap.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          {!isClincher && <p className="match-report__source-note">{outcome === "win" || outcome === "loss" ? "Recap generated from the recorded match result and available statistics." : "Match information reflects the latest recorded data."}</p>}
        </div>
      </section>

      <div className="match-report__analysis">
        <section className="match-report__comparison" aria-label="Team comparison">
          <div className="match-report__section-heading"><span className="match-report__section-number" aria-hidden="true">02</span><div><p className="match-report__eyebrow">Side by side</p><SectionTitle>By the numbers.</SectionTitle></div></div>
          <div className="match-report__comparison-teams"><span>Bardownski</span><span>{match.opponent}</span></div>
          <dl className="match-report__metrics">
            <ComparisonBar label="Goals" valueUs={match.scoreUs} valueThem={match.scoreThem} opponent={match.opponent} />
            <ComparisonBar label="Shots on goal" valueUs={match.shotsUs} valueThem={match.shotsThem} opponent={match.opponent} />
            <ComparisonBar label="Time on attack" valueUs={match.toaUs} valueThem={match.toaThem} opponent={match.opponent} format="time" />
            <ComparisonBar label="Pass completion" valueUs={match.passCompUs} valueThem={match.passCompThem} opponent={match.opponent} format="percent" />
          </dl>
          {!completeTeamStats && <p className="match-report__data-note">Some team statistics weren’t supplied for this match. A dash means unavailable, not zero; bars appear only when both values are recorded.</p>}
        </section>

        <section className="match-report__stars" aria-label="Three stars">
          <div className="match-report__section-heading"><span className="match-report__section-number" aria-hidden="true">03</span><div><p className="match-report__eyebrow">The standouts</p><SectionTitle>Three stars.</SectionTitle></div></div>
          {stars.length ? <ol className="match-report__star-list">{stars.map((star, index) => <li key={`${star.name}-${index}`} data-ours={star.isOurPlayer}>
            <span className="match-report__star-rank" aria-hidden="true">0{index + 1}</span>
            <div><p className="match-report__star-label">{["First", "Second", "Third"][index]} star <span aria-hidden="true">★</span></p><p className="match-report__star-name">{playerName(star)}</p><p className="match-report__star-team">{star.isOurPlayer ? "Bardownski" : match.opponent}{star.isGoalie ? " · Goalie" : ""}</p><p className="match-report__star-score">{isNumber(star.score) ? <><strong>{star.score.toFixed(1)}</strong> star score</> : "Star score unavailable"}</p></div>
          </li>)}</ol> : <p className="match-report__empty">The three stars weren’t supplied for this match. Check the player statistics below for the recorded performances.</p>}
        </section>
      </div>

      <section className="match-report__players" aria-label="Player performance">
        <div className="match-report__section-heading"><span className="match-report__section-number" aria-hidden="true">04</span><div><p className="match-report__eyebrow">Every name on the sheet</p><SectionTitle>Player performance.</SectionTitle></div></div>
        <p className="match-report__table-note">Statistics are separated by team. On smaller screens, scroll each table to see every column. A dash means a stat wasn’t supplied. SV% is shown as a decimal (1.000 = 100%).</p>
        {[{ team: "Bardownski", players: ourPlayers, ours: true }, { team: match.opponent, players: opposition, ours: false }].map(({ team, players, ours }) => <section className="match-report__player-team" data-ours={ours} key={ours ? "bardownski" : "opposition"} aria-label={`${ours ? "Bardownski" : "Opposition"} player statistics`}>
          <div className="match-report__player-team-heading"><TeamTitle>{team}</TeamTitle><span>{ours ? "Bardownski" : "Opposition"} roster</span></div>
          {players.length ? <>
            <PlayerTable players={players.filter(player => !player.isGoalie)} team={team} />
            <PlayerTable players={players.filter(player => player.isGoalie)} team={team} goalie />
          </> : <p className="match-report__empty">Player statistics weren’t supplied for {team} in this match. The recorded result is still available above.</p>}
        </section>)}
      </section>
      <footer className="match-report__footer"><span>Bardownski Hockey <span aria-hidden="true">/</span> Match report</span><span>{season.replace("-", "–")} · {archive ? "Season archive" : "Current season"}</span></footer>
    </div>
  </article>;
}
