import type { RosterPlayer } from "./page";
import { getNickname } from "@/lib/nicknames";
import PositionScene, { type PositionSceneKind } from "./PositionScene";

function PlayerCard({ player }: { player: RosterPlayer }) {
  const name = getNickname(player.nickname || player.name);
  return (
    <article className="roster-player" aria-label={name}>
      <details className="player-scouting">
        <summary className="player-summary">
          <span className="player-topline"><span>BARDOWNSKI / HOCKEY</span><span className="player-position">{player.position}</span></span>
          <span className="player-identity">
            <span className="player-number" aria-label={player.number === null ? "Jersey number unlisted" : `Jersey number ${player.number}`}>{player.number === null ? "—" : String(player.number).padStart(2, "0")}</span>
            <span className="player-name-line">
              <strong className="player-name">{name}</strong>
              {player.leadership && <span className="player-letter" aria-label={player.leadership === "C" ? "Captain" : "Assistant captain"}>{player.leadership}</span>}
            </span>
          </span>
          <span className="player-role">{player.scouting.role}</span>
          <span className="player-report-toggle">
            <span className="report-label-open">Read scouting report</span>
            <span className="report-label-close">Close scouting report</span>
            <span className="report-toggle-icon" aria-hidden="true"><span className="report-label-open">+</span><span className="report-label-close">−</span></span>
          </span>
        </summary>
        <div className="player-report">
          <p className="player-report-season">Scouting report <span>/</span> {player.scouting.season} season review</p>
          <div className="player-report-body">
            <div className="player-report-read"><h4>The read.</h4><p>{player.scouting.description}</p></div>
            <div className="player-report-focus"><h4>The next step.</h4><p>{player.scouting.focus}</p></div>
          </div>
          <dl className="player-report-stats" aria-label={`${player.scouting.season} archived statistics for ${name}`}>
            {player.scouting.stats.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}
          </dl>
          <p className="player-report-source">Last season’s performance · Saved {player.scouting.season} club statistics. Not current-season totals.</p>
          {player.scouting.sampleNote && <p className="player-report-sample">{player.scouting.sampleNote}</p>}
        </div>
      </details>
    </article>
  );
}

export default function RosterClient({ forwards, defense, goalies }: {
  forwards: RosterPlayer[];
  defense: RosterPlayer[];
  goalies: RosterPlayer[];
}) {
  const groups: { id: PositionSceneKind; label: string; caption: string; players: RosterPlayer[] }[] = [
    { id: "forwards", label: "Forwards", caption: "Create. Finish. Repeat.", players: forwards },
    { id: "defense", label: "Defense", caption: "Hold the line.", players: defense },
    { id: "goalies", label: "Goalies", caption: "The last line. The first belief.", players: goalies },
  ];
  return (
    <div className="roster-groups">
      {groups.filter(group => group.players.length > 0).map(group => (
        <section id={group.id} className={`roster-position roster-position--${group.id}`} key={group.id} aria-labelledby={`group-${group.id}`}>
          <div className="roster-inner">
            <PositionScene kind={group.id} label={group.label} caption={group.caption} count={group.players.length} />
            <div className="roster-player-list">
              {[...group.players].sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity)).map(player => <PlayerCard key={player.name} player={player} />)}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
