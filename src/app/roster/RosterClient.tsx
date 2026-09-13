import type { RosterPlayer } from "./page";
import PositionScene, { type PositionSceneKind } from "./PositionScene";

function PlayerCard({ player }: { player: RosterPlayer }) {
  return (
    <article className="roster-player">
      <div className="player-topline">
        <span>BARDOWNSKI / RETURNING PROFILE</span>
        <span className="player-position">{player.position}</span>
      </div>
      <div className="player-identity">
        <span className="player-number" aria-label={`Jersey number ${player.number}`}>{String(player.number).padStart(2, "0")}</span>
        <div>
          <h3>{player.name}</h3>
          {player.nickname !== player.name && <p className="player-nickname">“{player.nickname}”</p>}
        </div>
      </div>
      <p className="player-role">{player.scouting?.role ?? (player.positionGroup === "goalie" ? "Goaltender" : player.positionGroup === "defense" ? "Defenseman" : "Forward")}</p>
      {player.scouting ? (
        <details className="player-scouting">
          <summary>Scouting report <span aria-hidden="true">↗</span></summary>
          <p>{player.scouting.description}</p>
        </details>
      ) : <p className="player-no-report">Part of the room. Part of the story.</p>}
    </article>
  );
}

export default function RosterClient({ forwards, defense, goalies }: {
  forwards: RosterPlayer[];
  defense: RosterPlayer[];
  goalies: RosterPlayer[];
}) {
  const groups = [
    { id: "forwards", label: "Forwards", caption: "Create. Finish. Repeat.", players: forwards },
    { id: "defense", label: "Defense", caption: "Hold the line.", players: defense },
    { id: "goalies", label: "Goalies", caption: "The last line. The first belief.", players: goalies },
  ];
  return (
    <div className="roster-groups">
      {groups.filter(group => group.players.length > 0).map(group => (
        <section key={group.id} aria-labelledby={`group-${group.id}`}>
          <PositionScene kind={group.id as PositionSceneKind} label={group.label} caption={group.caption} count={group.players.length} />
          <div className="roster-player-list">
            {[...group.players].sort((a, b) => a.number - b.number).map(player => <PlayerCard key={player.name} player={player} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
