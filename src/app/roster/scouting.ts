import type { ClubMember } from "../../lib/chelstats";

export type ScoutingReport = {
  role: string;
  description: string;
  focus: string;
  season: string;
  stats: { label: string; value: string }[];
  sampleNote?: string;
};

const SEASON = "2025–2026";
const count = new Intl.NumberFormat("en-US");
const decimal = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const number = (value: number) => count.format(value);
const percent = (value: number) => `${decimal.format(value)}%`;
const signed = (value: number) => `${value > 0 ? "+" : ""}${number(value)}`;

/** Archived-season copy; established roles are editorial traits, not statistical findings. */
export function getScoutingReport(member: ClubMember, name: string): ScoutingReport {
  const games = number(member.gamesPlayed);
  const goals = number(member.goals);
  const assists = number(member.assists);
  const points = number(member.points);
  const goalieGames = number(member.goalieGP);
  const goalieWins = number(member.goalieWins);
  const saves = number(member.goalieSaves);
  const savePct = percent(member.savePct);
  const skaterStats = [
    { label: "Skater GP", value: games },
    { label: "Goals", value: goals },
    { label: "Assists", value: assists },
    { label: "Points", value: points },
  ];
  const goalieStats = [
    { label: "Goalie GP", value: goalieGames },
    { label: "Goalie wins", value: goalieWins },
    { label: "Saves", value: saves },
    { label: "Save %", value: savePct },
  ];
  const report = (
    role: string,
    description: string,
    focus: string,
    stats = skaterStats,
    sampleNote?: string,
  ): ScoutingReport => ({
    role,
    description,
    focus,
    season: SEASON,
    stats,
    ...(sampleNote ? { sampleNote } : {}),
  });

  // Internal identity keys are never interpolated into public copy.
  switch (name) {
    case "DYLAN":
      return report(
        "Playmaker",
        `Xavier Laflamme combines the precise passing and space-creating skill of a playmaker with a finisher's production. In ${SEASON}, he put up ${goals} goals and ${assists} assists for ${points} points in ${games} skater games. The passing remains a major part of his game, but last season showed why defenders cannot simply take away the outlet: he is just as much a threat to finish the play himself.`,
        "Keep both options available: find the open teammate without passing up a clear shot.",
      );
    case "MATT":
      return report(
        "Sniper",
        `Matt Hut's game starts with a lethal release and the skill to find a shooting lane. His ${SEASON} season delivered ${goals} goals, ${assists} assists and ${points} points in ${games} skater games, shooting ${percent(member.shotPct)}. That is a sniper's scoring line with a substantial passing contribution alongside it. He gives the attack a direct finishing option without needing every possession to end on his own stick.`,
        "Pair the shooting threat with a quick outlet when the shooting lane closes.",
      );
    case "KADEN":
      return report(
        "Offensive Defenseman",
        `Gotta Be brings a forward's eye to the blue line: pass-first on the breakout and willing to carry the attack up ice. In ${SEASON}, that approach produced ${goals} goals and ${assists} assists for ${points} points in ${games} skater games. His ${signed(member.plusMinus)} plus/minus reflects shared on-ice results, not an individual defensive verdict. The challenge is to keep that offensive involvement while staying connected to the coverage behind the rush.`,
        "Coordinate rush support with a clear coverage handoff before joining the attack.",
      );
    case "JIMMY":
      return report(
        "Two-Way Winger",
        `Jimmy Lemons connects the two ends of the ice with backchecking effort, neutral-zone support and a quick shooting option in transition. In ${SEASON}, he recorded ${goals} goals and ${assists} assists for ${points} points in ${games} skater games, adding ${number(member.blockedShots)} blocked shots. More assists than goals gives his two-way role a clear support-play dimension. He also covered backup duties in a separate ${goalieGames}-game goalie sample.`,
        "Keep the backcheck connected to a simple first pass on the next possession.",
      );
    case "ROB":
      return report(
        "Shutdown Defenseman",
        `Slobby Robby builds his defensive game around calm positioning and a conservative approach, but last season's contribution went beyond holding the line. His ${SEASON} return was ${goals} goals, ${assists} assists and ${points} points in ${games} skater games, with ${number(member.blockedShots)} blocked shots. That passing output adds a useful outlet to the shutdown profile. His ${signed(member.plusMinus)} plus/minus is shared on-ice context rather than a measure of individual defense alone.`,
        "Maintain the positional approach while making the first outlet a deliberate choice.",
      );
    case "RYDER":
      return report(
        "Goaltender",
        `Jene Rene Tetreau IV brings a post-to-post style built around lateral movement, positioning and reading the next chance. Across ${goalieGames} goalie appearances in ${SEASON}, he recorded ${goalieWins} wins, ${saves} saves, a ${savePct} save percentage and ${number(member.shutouts)} shutouts. It was a substantial workload between the pipes. The next layer is repeatability: arriving set after moving across the crease and helping the defense manage the second chance.`,
        "Prioritize a set position after lateral movement and clear rebound communication.",
        goalieStats,
      );
    case "LOGAN":
      return report(
        "Impact Winger",
        `Top G brings the direct, impact-minded approach of a player looking to change a shift. His ${SEASON} line pairs ${goals} goals with ${assists} assists for ${points} points in ${games} skater games, alongside ${number(member.hits)} hits and ${number(member.gwg)} game-winning goals. There is both scoring and support play in that return. The aim is to make those contributions a regular part of the attack, not just wait for the big moment.`,
        "Look for repeatable chances through puck support and a direct route into shooting space.",
      );
    case "COLIN":
      return report(
        "Utility",
        `Wolfgang Mozart gives the lineup options, with last season showing contributions both on the wing and in goal. His ${SEASON} skater line was ${goals} goals and ${assists} assists for ${points} points in ${games} games. He also logged ${goalieGames} separate goalie appearances and ${goalieWins} goalie wins. The utility label has real substance: a passing contribution up front and experience taking on a very different assignment between the pipes.`,
        "Set clear responsibilities for each assignment, especially when switching between skating and goal.",
      );
    case "Treyway6479":
      return report(
        "Winger · Limited Sample",
        `Treyway6479's ${SEASON} archive covers only ${games} skater games: ${goals} goals, ${assists} assists and ${points} points, with ${number(member.shots)} shots. His contributions came through assists in that short left-wing stint. There is not enough ice time here to define a signature style or a long-term scoring expectation. A longer run with clear wing responsibilities would give a fairer picture of where he can contribute most.`,
        "Build a larger sample with clear wing responsibilities and simple puck support.",
        skaterStats,
        `Limited ${games}-game skater sample; no established play style inferred.`,
      );
    default: {
      const isGoalie = ["G", "GK"].includes(member.position.toUpperCase());
      return report(
        isGoalie ? "Goaltender" : "Roster Skater",
        isGoalie
          ? `The ${SEASON} archive records ${goalieGames} goalie appearances, ${goalieWins} goalie wins and ${saves} saves with a ${savePct} save percentage. No established scouting description is available; these totals alone do not establish a play style.`
          : `The ${SEASON} archive records ${goals} goals and ${assists} assists for ${points} points in ${games} skater games. No established scouting description is available; these totals alone do not establish a play style.`,
        "Establish clear positional responsibilities and review a broader sample before defining a specialty.",
        isGoalie ? goalieStats : skaterStats,
        (isGoalie ? member.goalieGP : member.gamesPlayed) < 10
          ? `Limited ${isGoalie ? goalieGames : games}-game ${isGoalie ? "goalie" : "skater"} sample; avoid firm style conclusions.`
          : undefined,
      );
    }
  }
}
