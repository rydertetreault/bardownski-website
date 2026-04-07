import { fetchChelstatsData } from "@/lib/chelstats";
import type { ClubMember } from "@/lib/chelstats";
import { getDisplayNameFromGamertag } from "@/lib/nicknames";
import type { Article } from "@/lib/news";

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function name(m: ClubMember): string {
  return titleCase(getDisplayNameFromGamertag(m.username));
}

/** Round number a player is closest to but hasn't yet hit. */
function nextMilestone(value: number, step: number): number {
  return Math.ceil((value + 1) / step) * step;
}

/* ── Angle generators ─────────────────────────────────────────────────── */

interface FactAngle {
  title: string;
  body: string;
}

function milestoneWatch(members: ClubMember[]): FactAngle | null {
  const candidates: { player: ClubMember; stat: string; current: number; target: number; gap: number }[] = [];

  for (const m of members) {
    if (m.gamesPlayed === 0 && m.goalieGP === 0) continue;

    const checks: [string, number, number][] = [
      ["goals", m.goals, 50],
      ["assists", m.assists, 50],
      ["points", m.points, 100],
      ["hits", m.hits, 100],
      ["takeaways", m.takeaways, 50],
      ["saves", m.goalieSaves, 100],
    ];

    for (const [stat, current, step] of checks) {
      if (current <= 0) continue;
      const target = nextMilestone(current, step);
      const gap = target - current;
      if (gap > 0 && gap <= step * 0.2) {
        candidates.push({ player: m, stat, current, target, gap });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Pick the closest one to the milestone
  candidates.sort((a, b) => a.gap - b.gap);
  const top = candidates[0];
  const n = name(top.player);

  return {
    title: `Milestone Watch: ${n} Closing In on ${top.target} ${titleCase(top.stat)}`,
    body:
      `${n} is sitting at ${top.current} ${top.stat} on the season, just ${top.gap} away from the ${top.target} mark. ` +
      `These are the kinds of round numbers that quietly pile up over a long stretch of games until suddenly they are within reach. ` +
      `Keep an eye on the next few outings, because this one could fall any night.\n\n` +
      `Milestones are not just numbers. They are markers of consistency, and ${n} has been putting in the work to get here. ` +
      `One more strong shift and the next round number flips over.`,
  };
}

function efficiencyAward(members: ClubMember[]): FactAngle | null {
  const eligible = members.filter((m) => m.shots >= 20).sort((a, b) => b.shotPct - a.shotPct);
  if (eligible.length === 0) return null;
  const top = eligible[0];
  const n = name(top);

  return {
    title: `Efficiency Check: ${n} Leads the Team in Shooting Percentage`,
    body:
      `Volume is one thing. Efficiency is another. ${n} currently sits at the top of the team's shooting percentage chart at ${top.shotPct.toFixed(1)}% ` +
      `on ${top.shots} shots, with ${top.goals} goals to show for it. ` +
      `That number is not an accident. It comes from picking spots, reading the play, and waiting for the right look instead of forcing it.\n\n` +
      `Anyone can rip pucks at the net. Putting them in at this rate is a different skill entirely, and ${n} has it locked in.`,
  };
}

function physicalityCorner(members: ClubMember[]): FactAngle | null {
  const sorted = [...members].filter((m) => m.gamesPlayed > 0).sort((a, b) => b.hits - a.hits);
  if (sorted.length < 2) return null;
  const top = sorted[0];
  const second = sorted[1];

  const topPerGame = top.gamesPlayed > 0 ? top.hits / top.gamesPlayed : 0;

  return {
    title: `Physicality Corner: ${name(top)} Setting the Tone`,
    body:
      `${name(top)} leads the team in hits with ${top.hits} on the season, averaging ${topPerGame.toFixed(1)} per game. ` +
      `${name(second)} is the closest challenger at ${second.hits}. ` +
      `The hits column does not always show up in the highlight reel, but it absolutely shows up in the way the other team plays the next shift.\n\n` +
      `Physical play wears opponents down over the course of a game. ${name(top)} has been doing exactly that all season.`,
  };
}

function quietContributor(members: ClubMember[]): FactAngle | null {
  // Best takeaway / giveaway differential among players with meaningful games
  const eligible = members.filter((m) => m.gamesPlayed >= 5);
  if (eligible.length === 0) return null;

  const sorted = [...eligible].sort((a, b) => (b.takeaways - b.giveaways) - (a.takeaways - a.giveaways));
  const top = sorted[0];
  const diff = top.takeaways - top.giveaways;
  if (diff <= 0) return null;

  return {
    title: `Quiet Contributor: ${name(top)} Wins the Possession Battle`,
    body:
      `Possession matters. ${name(top)} has logged ${top.takeaways} takeaways against just ${top.giveaways} giveaways, ` +
      `a +${diff} differential that leads the roster. That is the kind of two-way play that does not always make the box score look loud, ` +
      `but it changes how shifts end and who has the puck when it matters.\n\n` +
      `Every team needs a player who flips possessions back the other way. ${name(top)} has been that guy this season.`,
  };
}

function goalieCorner(members: ClubMember[]): FactAngle | null {
  const goalies = members.filter((m) => m.goalieGP > 0);
  if (goalies.length === 0) return null;

  const top = goalies.sort((a, b) => b.goalieSaves - a.goalieSaves)[0];
  const svPct = top.savePct > 1 ? top.savePct.toFixed(1) : (top.savePct * 100).toFixed(1);
  const n = name(top);

  return {
    title: `Goalie Corner: ${n} by the Numbers`,
    body:
      `${n} has stopped ${top.goalieSaves} of ${top.goalieShots} shots faced this season for a ${svPct}% save rate, ` +
      `posting a ${top.gaa.toFixed(2)} goals-against average across ${top.goalieGP} games. ` +
      `The ${top.shutouts} shutouts in there tell you ${n} has had a handful of nights where the other team had no answer at all.\n\n` +
      `Goalie stats can be unforgiving but they are honest. The numbers say ${n} has been doing the job.`,
  };
}

function clutchFactor(members: ClubMember[]): FactAngle | null {
  const sorted = [...members].filter((m) => m.gwg > 0).sort((a, b) => b.gwg - a.gwg);
  if (sorted.length === 0) return null;
  const top = sorted[0];

  return {
    title: `Clutch Factor: ${name(top)} Tops the Game-Winners List`,
    body:
      `${name(top)} leads the club with ${top.gwg} game-winning goals on the season. ` +
      `Game-winners are the goals that decide the night, the ones that mean the difference between a point and a loss. ` +
      `Stacking ${top.gwg} of them says a lot about who shows up when the moment calls for it.\n\n` +
      `Anyone can score in a blowout. Scoring the goal that holds up is a skill, and ${name(top)} has been delivering it.`,
  };
}

/* ── Main entry ───────────────────────────────────────────────────────── */

export async function generateFunFact(): Promise<Article | null> {
  const data = await fetchChelstatsData();
  if (!data) return null;

  const today = new Date().toISOString().split("T")[0];
  const { members } = data;

  // Try angles in random order until one returns content
  const angles = [
    milestoneWatch,
    efficiencyAward,
    physicalityCorner,
    quietContributor,
    goalieCorner,
    clutchFactor,
  ];

  // Shuffle in-place via simple random sort for variety per run
  const shuffled = [...angles].sort(() => Math.random() - 0.5);

  let chosen: FactAngle | null = null;
  for (const angle of shuffled) {
    chosen = angle(members);
    if (chosen) break;
  }

  if (!chosen) return null;

  return {
    id: `auto-fun-fact-${today}`,
    title: chosen.title,
    summary: chosen.body,
    date: today,
    image: "/images/gallery/screenshots/Screenshot%202026-03-16%20183502.webp",
    category: "Club News",
  };
}
