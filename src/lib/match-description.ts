/**
 * Auto-generated match recaps for the match detail page.
 *
 * Chelstats doesn't return period-by-period scoring, so we can't narrate
 * comebacks or lead changes. Instead we build a story from what we have:
 * final score, shot/TOA disparity, three-star honours, per-player stat
 * lines, and special-teams goals. Each beat picks from a pool of variant
 * phrasings, seeded off the match id so the same match always produces
 * the same recap but different matches get different flavours.
 */

import type { Match, MatchPlayerStat } from "@/types";
import { getNickname } from "@/lib/nicknames";

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function displayName(raw: string): string {
  return titleCase(getNickname(raw));
}

/** FNV-1a seeded xorshift picker. Deterministic per match id. */
function makePicker(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function pick<T>(arr: readonly T[]): T {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return arr[Math.abs(h) % arr.length];
  };
}

function parseToaSeconds(s: string | undefined): number {
  if (!s) return 0;
  const [m, sec] = s.split(":").map(Number);
  return (m || 0) * 60 + (sec || 0);
}

function skaterStatLine(player: MatchPlayerStat): string {
  const g = player.goals;
  const a = player.assists;
  const pts = g + a;
  const goalDesc =
    g >= 4 ? `a ${g}-goal game` :
    g === 3 ? "a hat trick" :
    g === 2 ? "two goals" :
    g === 1 ? "a goal" : "";
  const assistDesc =
    a >= 4 ? `${a} assists` :
    a === 3 ? "three helpers" :
    a === 2 ? "two assists" :
    a === 1 ? "an assist" : "";
  if (goalDesc && assistDesc) return `${goalDesc} and ${assistDesc} (${pts} points)`;
  if (goalDesc) return goalDesc;
  if (assistDesc) return assistDesc;
  return "";
}

export function generateMatchDescription(match: Match): string {
  const pick = makePicker(match.id);
  const scoreUs = match.scoreUs ?? 0;
  const scoreThem = match.scoreThem ?? 0;
  const isWin = scoreUs > scoreThem;
  const diff = Math.abs(scoreUs - scoreThem);
  const opponent = match.opponent;
  const parts: string[] = [];

  const ourPlayers = match.players?.filter((p) => p.isOurPlayer) ?? [];
  const ourStars = match.threeStars?.filter((s) => s.isOurPlayer) ?? [];
  const firstStar = match.threeStars?.[0];
  const goalie = ourPlayers.find((p) => p.isGoalie);
  const mentioned = new Set<string>();

  /* ── Opening ───────────────────────────────────────────────────── */

  const winBlowout = [
    `Bardownski rolled ${opponent} ${scoreUs}-${scoreThem} in a clinic from start to finish.`,
    `A statement night for the boys — Bardownski dismantled ${opponent} ${scoreUs}-${scoreThem}.`,
    `Bardownski put on a show, steamrolling ${opponent} ${scoreUs}-${scoreThem}.`,
    `It was never close. Bardownski cruised past ${opponent} ${scoreUs}-${scoreThem}.`,
    `The boys took care of business in a ${scoreUs}-${scoreThem} rout of ${opponent}.`,
  ];
  const winComfortable = [
    `Bardownski handled ${opponent} ${scoreUs}-${scoreThem} with a few goals to spare.`,
    `A confident ${scoreUs}-${scoreThem} win over ${opponent}, never really in doubt down the stretch.`,
    `${opponent} hung around early but Bardownski pulled away for the ${scoreUs}-${scoreThem} win.`,
    `Solid two-way effort from Bardownski in a ${scoreUs}-${scoreThem} win over ${opponent}.`,
  ];
  const winTwoGoal = [
    `Bardownski took down ${opponent} ${scoreUs}-${scoreThem} in a game that stayed within reach.`,
    `A ${scoreUs}-${scoreThem} win over ${opponent}, close enough to keep the benches honest.`,
    `Bardownski pulled away late to beat ${opponent} ${scoreUs}-${scoreThem}.`,
    `Bardownski traded punches with ${opponent} before settling it ${scoreUs}-${scoreThem}.`,
  ];
  const winOneGoal = [
    `Bardownski gritted out a ${scoreUs}-${scoreThem} nail-biter against ${opponent}.`,
    `It came down to the final minute, but Bardownski held on to beat ${opponent} ${scoreUs}-${scoreThem}.`,
    `A heart-stopping ${scoreUs}-${scoreThem} win, Bardownski edging ${opponent} by a single goal.`,
    `One of those games. Bardownski escaped with a ${scoreUs}-${scoreThem} win over ${opponent}.`,
    `Every shift mattered — Bardownski squeaking past ${opponent} ${scoreUs}-${scoreThem}.`,
  ];
  const lossBlowout = [
    `A rough night in Newfoundland, ${opponent} handling Bardownski ${scoreUs}-${scoreThem}.`,
    `Nothing went right. ${opponent} ran Bardownski out of the building ${scoreUs}-${scoreThem}.`,
    `Bardownski never got going in a ${scoreUs}-${scoreThem} loss to ${opponent}.`,
    `A night to forget for the boys, falling ${scoreUs}-${scoreThem} to ${opponent}.`,
  ];
  const lossComfortable = [
    `${opponent} proved the tougher team in a ${scoreUs}-${scoreThem} loss for Bardownski.`,
    `Bardownski couldn't find the answers, dropping a ${scoreUs}-${scoreThem} decision to ${opponent}.`,
    `A frustrating night for the boys, who fell ${scoreUs}-${scoreThem} to ${opponent}.`,
    `${opponent} had Bardownski's number in a ${scoreUs}-${scoreThem} defeat.`,
  ];
  const lossTwoGoal = [
    `Bardownski stayed in it but came up short, ${scoreUs}-${scoreThem} to ${opponent}.`,
    `A close one that got away, Bardownski dropping a ${scoreUs}-${scoreThem} decision to ${opponent}.`,
    `${opponent} held on to beat Bardownski ${scoreUs}-${scoreThem}.`,
  ];
  const lossOneGoal = [
    `Bardownski came up a goal short, falling ${scoreUs}-${scoreThem} to ${opponent}.`,
    `A heart-breaker in Newfoundland, ${opponent} sneaking out with a ${scoreUs}-${scoreThem} win.`,
    `Inches from a different outcome, Bardownski fell ${scoreUs}-${scoreThem} to ${opponent}.`,
    `A brutal one-goal loss, ${scoreUs}-${scoreThem} to ${opponent}.`,
  ];

  let openingPool: readonly string[];
  if (isWin) {
    openingPool =
      diff >= 5 ? winBlowout :
      diff >= 3 ? winComfortable :
      diff === 2 ? winTwoGoal : winOneGoal;
  } else {
    openingPool =
      diff >= 5 ? lossBlowout :
      diff >= 3 ? lossComfortable :
      diff === 2 ? lossTwoGoal : lossOneGoal;
  }
  parts.push(pick(openingPool));

  /* ── Game shape (shots) ────────────────────────────────────────── */

  const shotsUs = match.shotsUs ?? 0;
  const shotsThem = match.shotsThem ?? 0;
  const shotDiff = shotsUs - shotsThem;
  const toaUs = parseToaSeconds(match.toaUs);
  const toaThem = parseToaSeconds(match.toaThem);
  const toaTotal = toaUs + toaThem;
  const toaShareUs = toaTotal > 0 ? toaUs / toaTotal : 0.5;

  if (shotsUs + shotsThem > 0) {
    if (isWin) {
      if (shotDiff >= 12) {
        parts.push(pick([
          `They outshot ${opponent} ${shotsUs}-${shotsThem} and dictated play from the drop.`,
          `A dominant ${shotsUs}-${shotsThem} edge in shots told the story of the night.`,
          `Bardownski controlled every zone, piling up ${shotsUs} shots to ${shotsThem}.`,
        ]));
      } else if (shotDiff >= 6) {
        parts.push(pick([
          `Bardownski held the edge in shots ${shotsUs}-${shotsThem}, pressing the action most of the night.`,
          `The boys generated more chances than they gave up, ${shotsUs}-${shotsThem} on the shot counter.`,
          `Bardownski pushed the pace, finishing with a ${shotsUs}-${shotsThem} shot advantage.`,
        ]));
      } else if (shotDiff <= -12) {
        parts.push(pick([
          `${opponent} outshot Bardownski ${shotsThem}-${shotsUs}, but the boys made every chance count.`,
          `A bit of a heist — outshot ${shotsThem}-${shotsUs} but still on top when the clock ran out.`,
          `Bardownski got outshot ${shotsThem}-${shotsUs} and found a way anyway.`,
        ]));
      } else if (shotDiff <= -6) {
        parts.push(pick([
          `${opponent} tilted the ice ${shotsThem}-${shotsUs} in shots, but Bardownski's finishing carried the night.`,
          `Outshot ${shotsThem}-${shotsUs}, the boys still got the job done where it counted.`,
          `${opponent} had the shot edge at ${shotsThem}-${shotsUs}, but Bardownski was more clinical with their chances.`,
        ]));
      } else {
        parts.push(pick([
          `A back-and-forth affair, shots finishing ${shotsUs}-${shotsThem}.`,
          `Both teams traded chances all night, ${shotsUs}-${shotsThem} on the shot clock.`,
          `Tight on the shot counter at ${shotsUs}-${shotsThem}, but Bardownski came out on top.`,
        ]));
      }
    } else {
      if (shotDiff >= 12) {
        parts.push(pick([
          `Bardownski outshot ${opponent} ${shotsUs}-${shotsThem} but couldn't solve their goalie.`,
          `${shotsUs} shots on goal with little to show for it — the boys had chances but couldn't finish.`,
          `All the pressure in the world, ${shotsUs}-${shotsThem} in shots, didn't translate to the scoreboard.`,
        ]));
      } else if (shotDiff >= 6) {
        parts.push(pick([
          `Bardownski had the shot edge at ${shotsUs}-${shotsThem} but couldn't find enough answers.`,
          `The boys generated plenty of chances, ${shotsUs}-${shotsThem} in shots, but the scoresheet said otherwise.`,
          `Bardownski pushed the play, ${shotsUs}-${shotsThem} on the shot clock, and still came up empty.`,
        ]));
      } else if (shotDiff <= -12) {
        parts.push(pick([
          `${opponent} ran the show, outshooting Bardownski ${shotsThem}-${shotsUs}.`,
          `A one-sided affair in every phase, ${opponent} piling up ${shotsThem} shots to ${shotsUs}.`,
        ]));
      } else if (shotDiff <= -6) {
        parts.push(pick([
          `${opponent} pushed the play most of the night, outshooting Bardownski ${shotsThem}-${shotsUs}.`,
          `The shot count told the story, ${shotsThem}-${shotsUs} in favour of ${opponent}.`,
        ]));
      } else {
        parts.push(pick([
          `A back-and-forth night, shots finishing ${shotsUs}-${shotsThem}.`,
          `Neither team ran away with the chances, ${shotsUs}-${shotsThem} on the shot clock.`,
        ]));
      }
    }

    // Possession flourish (separate beat, fires when time on attack was lopsided)
    if (toaShareUs >= 0.58) {
      parts.push(pick([
        `The boys owned the puck for most of the sixty.`,
        `Time on attack was heavily in Bardownski's favour.`,
        `Bardownski dictated possession from start to finish.`,
      ]));
    } else if (toaShareUs > 0 && toaShareUs <= 0.42) {
      parts.push(pick([
        `${opponent} held the puck most of the night, but the boys stayed patient in their own end.`,
        `Possession numbers tilted toward ${opponent}, even if the scoreboard didn't always agree.`,
      ]));
    }
  }

  /* ── Puck movement (team pass %) ───────────────────────────────── */

  const passUs = match.passCompUs ?? 0;
  const passThem = match.passCompThem ?? 0;
  if (passUs > 0) {
    if (passUs >= 85 && passUs - passThem >= 5) {
      parts.push(pick([
        `Bardownski was crisp in transition, clicking at ${passUs}% on passes.`,
        `The puck movement was sharp all night, ${passUs}% pass completion from the boys.`,
        `Bardownski moved the puck with purpose, finishing at ${passUs}% through the neutral zone.`,
      ]));
    } else if (passUs < 68) {
      parts.push(pick([
        `Puck management was a problem — Bardownski completed just ${passUs}% of passes.`,
        `The boys were sloppy in transition, clicking at only ${passUs}% on passes.`,
      ]));
    }
  }

  /* ── First star ────────────────────────────────────────────────── */

  if (firstStar?.isOurPlayer) {
    const n = displayName(firstStar.name);
    const player = ourPlayers.find((p) => p.name === firstStar.name);
    mentioned.add(firstStar.name);
    if (player?.isGoalie) {
      if (player.goalsAgainst === 0) {
        parts.push(pick([
          `${n} earned first star with a ${player.saves}-save shutout, turning aside everything thrown his way.`,
          `${n} was perfect, stopping all ${player.saves} shots for the shutout and first-star honours.`,
          `A clean sheet from ${n}, who snuffed out all ${player.saves} shots to earn first star.`,
        ]));
      } else {
        const sa = player.saves + player.goalsAgainst;
        parts.push(pick([
          `${n} stood tall in net, stopping ${player.saves} of ${sa} to earn first star.`,
          `${n} was the difference maker, making ${player.saves} saves on the way to first star.`,
          `${n} held the fort between the pipes with ${player.saves} saves and took first-star honours.`,
        ]));
      }
    } else if (player) {
      const statLine = skaterStatLine(player);
      const hasGwg = isWin && player.gameWinningGoal > 0;
      const hasPpg = player.powerPlayGoals > 0;
      const hasShg = player.shortHandedGoals > 0;
      if (statLine) {
        if (hasGwg) {
          parts.push(pick([
            `${n} led the charge with ${statLine}, including the game-winner.`,
            `First star to ${n}, who potted the winner on the way to ${statLine}.`,
            `${n} was the hero, burying the GWG as part of ${statLine}.`,
          ]));
        } else if (hasShg) {
          parts.push(pick([
            `${n} earned first star with ${statLine}, one of them coming shorthanded.`,
            `${n} took first star after ${statLine}, including a shorthanded marker.`,
          ]));
        } else if (hasPpg) {
          parts.push(pick([
            `${n} earned first star with ${statLine}, cashing in on the power play.`,
            `First star went to ${n} after ${statLine} with a power play goal mixed in.`,
          ]));
        } else {
          parts.push(pick([
            `${n} earned first star with ${statLine}.`,
            `${n} was the best player on the ice, finishing with ${statLine}.`,
            `First-star honours went to ${n} after ${statLine}.`,
            `${n} put the team on his back, posting ${statLine}.`,
          ]));
        }
      } else {
        parts.push(pick([
          `${n} was everywhere on the ice, earning first star with a relentless two-way effort.`,
          `First star went to ${n} on the strength of a quiet-but-dominant two-way game.`,
        ]));
      }
    }
  }

  /* ── Supporting stars ──────────────────────────────────────────── */

  for (const star of ourStars) {
    if (star === firstStar) continue;
    const n = displayName(star.name);
    const player = ourPlayers.find((p) => p.name === star.name);
    const label = star === match.threeStars?.[1] ? "second" : "third";
    mentioned.add(star.name);
    if (player?.isGoalie) {
      if (player.goalsAgainst === 0) {
        parts.push(`${n} picked up the ${label} star with a ${player.saves}-save shutout.`);
      } else {
        parts.push(pick([
          `${n} was solid in net with ${player.saves} saves, picking up the ${label} star.`,
          `${n} earned the ${label} star after a ${player.saves}-save performance.`,
        ]));
      }
    } else if (player) {
      const statLine = skaterStatLine(player);
      if (statLine) {
        parts.push(pick([
          `${n} grabbed the ${label} star with ${statLine}.`,
          `${label.charAt(0).toUpperCase()}${label.slice(1)} star went to ${n} for ${statLine}.`,
          `${n} took ${label}-star honours after ${statLine}.`,
        ]));
      } else {
        parts.push(`${n} played a hard-nosed game and was rewarded with the ${label} star.`);
      }
    }
  }

  /* ── Supporting cast (multi-goal individuals) ──────────────────── */

  for (const player of ourPlayers) {
    if (mentioned.has(player.name) || player.isGoalie) continue;
    const n = displayName(player.name);
    const pts = player.goals + player.assists;
    if (player.goals >= 3) {
      parts.push(pick([
        `${n} also had a hat trick with ${player.goals} goals.`,
        `${n} chipped in with a hat trick of his own.`,
      ]));
      mentioned.add(player.name);
    } else if (player.goals === 2) {
      const assistTail =
        player.assists === 0 ? "" :
        player.assists === 1 ? " and an assist" :
        ` and ${player.assists} assists`;
      parts.push(pick([
        `${n} added a pair of his own${assistTail}.`,
        `${n} kicked in two goals${assistTail}.`,
      ]));
      mentioned.add(player.name);
    } else if (pts >= 3) {
      parts.push(pick([
        `${n} contributed ${pts} points (${player.goals}G, ${player.assists}A).`,
        `${n} was quietly effective with ${pts} points on the night.`,
      ]));
      mentioned.add(player.name);
    }
  }

  /* ── Remaining contributors (compound sentence for 1-point guys) ── */

  const otherContributors = ourPlayers
    .filter(
      (p) =>
        !p.isGoalie &&
        !mentioned.has(p.name) &&
        p.goals + p.assists >= 1
    )
    .sort((a, b) => b.goals + b.assists - (a.goals + a.assists))
    .slice(0, 4);

  if (otherContributors.length >= 2) {
    const names = otherContributors.map((p) => displayName(p.name));
    const list =
      names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
    parts.push(pick([
      `${list} also found their way onto the scoresheet.`,
      `Also getting on the board: ${list}.`,
      `${list} chipped in with points of their own.`,
    ]));
    otherContributors.forEach((p) => mentioned.add(p.name));
  } else if (otherContributors.length === 1) {
    const p = otherContributors[0];
    const n = displayName(p.name);
    if (p.goals === 1 && p.assists === 0) {
      parts.push(pick([
        `${n} added a goal of his own.`,
        `${n} also found the back of the net.`,
      ]));
    } else if (p.goals === 0 && p.assists >= 1) {
      parts.push(pick([
        `${n} chipped in with ${p.assists === 1 ? "an assist" : `${p.assists} assists`}.`,
        `${n} set up ${p.assists === 1 ? "a goal" : `${p.assists} goals`} from the playmaker's role.`,
      ]));
    } else {
      parts.push(pick([
        `${n} also got on the scoresheet with ${p.goals}G and ${p.assists}A.`,
        `${n} chipped in with a goal and an assist of his own.`,
      ]));
    }
    mentioned.add(p.name);
  }

  /* ── Fallback: top performer when no Bardownski players made stars ── */

  if (ourStars.length === 0 && ourPlayers.length > 0 && mentioned.size === 0) {
    const top = ourPlayers
      .filter((p) => !p.isGoalie)
      .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))[0];
    if (top && top.goals + top.assists > 0) {
      const statLine = skaterStatLine(top);
      parts.push(`${displayName(top.name)} led the way for Bardownski with ${statLine}.`);
      mentioned.add(top.name);
    }
  }

  /* ── Physical play ─────────────────────────────────────────────── */

  const teamHits = ourPlayers.reduce((s, p) => s + (p.hits || 0), 0);
  const topHitter = ourPlayers
    .filter((p) => !p.isGoalie && !mentioned.has(p.name))
    .sort((a, b) => b.hits - a.hits)[0];

  if (topHitter && topHitter.hits >= 8) {
    parts.push(pick([
      `${displayName(topHitter.name)} brought the hammer with ${topHitter.hits} hits.`,
      `${displayName(topHitter.name)} was the enforcer on the night, throwing ${topHitter.hits} hits.`,
      `${displayName(topHitter.name)} made his presence felt with ${topHitter.hits} bodychecks.`,
    ]));
    mentioned.add(topHitter.name);
  } else if (teamHits >= 25) {
    parts.push(pick([
      `Bardownski brought the physical game, piling up ${teamHits} hits as a team.`,
      `The boys leaned into the body checks, finishing with ${teamHits} hits on the night.`,
    ]));
  }

  /* ── Volume shooter (high shots, low goals) ───────────────────── */

  const volumeShooter = ourPlayers
    .filter(
      (p) =>
        !p.isGoalie &&
        !mentioned.has(p.name) &&
        p.shots >= 5 &&
        p.goals <= 1
    )
    .sort((a, b) => b.shots - a.shots)[0];

  if (volumeShooter) {
    parts.push(pick([
      `${displayName(volumeShooter.name)} kept looking for answers, firing ${volumeShooter.shots} shots at the net.`,
      `${displayName(volumeShooter.name)} was heavily involved, putting ${volumeShooter.shots} pucks on goal.`,
      `${displayName(volumeShooter.name)} wouldn't stop shooting, finishing with ${volumeShooter.shots} shots.`,
    ]));
    mentioned.add(volumeShooter.name);
  }

  /* ── Special teams ─────────────────────────────────────────────── */

  const ppg = ourPlayers.reduce((s, p) => s + (p.powerPlayGoals || 0), 0);
  const shg = ourPlayers.reduce((s, p) => s + (p.shortHandedGoals || 0), 0);
  if (ppg >= 2) {
    parts.push(pick([
      `The power play was humming, cashing in ${ppg} times on the man advantage.`,
      `Bardownski went ${ppg}-for-many with the extra skater.`,
    ]));
  }
  if (shg >= 1) {
    parts.push(pick([
      `Bardownski even struck shorthanded for good measure.`,
      `The boys added ${shg === 1 ? "a shorthanded marker" : `${shg} shorthanded goals`} to the total.`,
    ]));
  }

  /* ── Goalie closing note ───────────────────────────────────────── */

  if (goalie && !mentioned.has(goalie.name)) {
    if (goalie.goalsAgainst === 0) {
      parts.push(pick([
        `${displayName(goalie.name)} slammed the door shut with a ${goalie.saves}-save shutout.`,
        `A clean sheet for ${displayName(goalie.name)}, who turned away all ${goalie.saves} shots.`,
      ]));
    } else if (goalie.saves >= 30) {
      parts.push(pick([
        `${displayName(goalie.name)} was under siege all night, finishing with ${goalie.saves} saves.`,
        `${displayName(goalie.name)} stood on his head with ${goalie.saves} saves.`,
      ]));
    } else if (goalie.saves >= 22) {
      parts.push(pick([
        `${displayName(goalie.name)} kept the boys in it with ${goalie.saves} saves.`,
        `A strong night for ${displayName(goalie.name)}, who finished with ${goalie.saves} saves.`,
      ]));
    }
  }

  if (match.matchType === "finals") {
    parts.push(pick([
      "This one came in a club finals matchup.",
      "A club finals contest — the stakes were high.",
      "The stage: club finals.",
    ]));
  }

  return parts.join(" ");
}
