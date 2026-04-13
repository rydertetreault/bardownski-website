/**
 * Milestone detection for auto-generated articles.
 *
 * Compares each player's current season stats against milestone thresholds
 * and returns any newly crossed milestones that haven't been reported yet.
 * Reported milestones are persisted in Redis so they never repeat.
 */

import type { ClubMember } from "@/lib/chelstats";
import { getDisplayNameFromGamertag } from "@/lib/nicknames";

/* ── Types ───────────────────────────────────────────────────────────── */

export interface DetectedMilestone {
  playerName: string; // display name (e.g. "XAVIER LAFLAMME")
  stat: string; // category key (e.g. "goals")
  value: number; // current stat value
  threshold: number; // the threshold crossed (e.g. 500)
  label: string; // human-readable (e.g. "500 Goals")
}

/* ── Thresholds ──────────────────────────────────────────────────────── */

interface ThresholdDef {
  key: keyof ClubMember;
  label: string;
  thresholds: number[];
  /** Only check players matching this filter (e.g. goalies) */
  filter?: (m: ClubMember) => boolean;
}

const MILESTONE_DEFS: ThresholdDef[] = [
  {
    key: "goals",
    label: "Goals",
    thresholds: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000],
  },
  {
    key: "assists",
    label: "Assists",
    thresholds: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000],
  },
  {
    key: "points",
    label: "Points",
    thresholds: [100, 200, 250, 300, 400, 500, 600, 750, 800, 900, 1000, 1250, 1500],
  },
  {
    key: "hits",
    label: "Hits",
    thresholds: [250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000],
  },
  {
    key: "goalieSaves",
    label: "Saves",
    thresholds: [250, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000],
    filter: (m) => m.goalieGP > 0,
  },
  {
    key: "shutouts",
    label: "Shutouts",
    thresholds: [5, 10, 15, 20, 25, 30, 40, 50],
    filter: (m) => m.goalieGP > 0,
  },
  {
    key: "goalieWins",
    label: "Goalie Wins",
    thresholds: [25, 50, 75, 100, 150, 200],
    filter: (m) => m.goalieGP > 0,
  },
  {
    key: "takeaways",
    label: "Takeaways",
    thresholds: [100, 200, 300, 500, 750, 1000],
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(
      /\b(?:II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/gi,
      (m) => m.toUpperCase(),
    );
}

/** Build a unique key for a reported milestone (used for Redis dedup). */
function milestoneKey(playerName: string, stat: string, threshold: number): string {
  return `${playerName.toUpperCase()}:${stat}:${threshold}`;
}

/* ── Detection ───────────────────────────────────────────────────────── */

/**
 * Scan all members for milestones that haven't been reported yet.
 *
 * @param members     Current season roster from chelstats
 * @param reported    Set of previously reported milestone keys (from Redis)
 * @returns           Array of newly detected milestones
 */
export function detectMilestones(
  members: ClubMember[],
  reported: Set<string>,
): DetectedMilestone[] {
  const detected: DetectedMilestone[] = [];

  for (const member of members) {
    const displayName = getDisplayNameFromGamertag(member.username);

    for (const def of MILESTONE_DEFS) {
      // Skip if this player doesn't match the filter
      if (def.filter && !def.filter(member)) continue;

      const currentValue = member[def.key] as number;
      if (typeof currentValue !== "number" || currentValue <= 0) continue;

      for (const threshold of def.thresholds) {
        if (currentValue >= threshold) {
          const key = milestoneKey(displayName, def.key, threshold);
          if (!reported.has(key)) {
            detected.push({
              playerName: displayName,
              stat: def.key,
              value: currentValue,
              threshold,
              label: `${threshold} ${def.label}`,
            });
          }
        }
      }
    }
  }

  // Sort: highest threshold first so the most impressive ones lead
  detected.sort((a, b) => b.threshold - a.threshold);

  return detected;
}

/**
 * Return the set of milestone keys to mark as reported.
 * Includes both the newly detected milestones AND all lower thresholds
 * for the same player+stat (so we never report e.g. "100 goals" after
 * already reporting "200 goals").
 */
export function buildReportedKeys(milestones: DetectedMilestone[]): string[] {
  const keys: string[] = [];
  for (const m of milestones) {
    // Find all thresholds for this stat
    const def = MILESTONE_DEFS.find((d) => d.key === m.stat);
    if (!def) {
      keys.push(milestoneKey(m.playerName, m.stat, m.threshold));
      continue;
    }
    // Mark this and all lower thresholds as reported
    for (const t of def.thresholds) {
      if (t <= m.threshold) {
        keys.push(milestoneKey(m.playerName, m.stat, t));
      }
    }
  }
  return [...new Set(keys)];
}

/* ── Seeding ────────────────────────────────────────────────────────── */

/**
 * Build milestone keys for ALL thresholds currently crossed by the roster.
 * Used to seed Redis after a manual article so the cron doesn't re-report
 * milestones that were already covered.
 */
export function buildSeedKeysFromMembers(members: ClubMember[]): string[] {
  const keys: string[] = [];

  for (const member of members) {
    const displayName = getDisplayNameFromGamertag(member.username);

    for (const def of MILESTONE_DEFS) {
      if (def.filter && !def.filter(member)) continue;

      const currentValue = member[def.key] as number;
      if (typeof currentValue !== "number" || currentValue <= 0) continue;

      for (const threshold of def.thresholds) {
        if (currentValue >= threshold) {
          keys.push(milestoneKey(displayName, def.key, threshold));
        }
      }
    }
  }

  return [...new Set(keys)];
}

/* ── Formatting ──────────────────────────────────────────────────────── */

/**
 * Format detected milestones into a paragraph for article insertion.
 * Groups milestones by player for readability.
 */
export function formatMilestonesParagraph(milestones: DetectedMilestone[]): string {
  if (milestones.length === 0) return "";

  // Group by player
  const byPlayer = new Map<string, DetectedMilestone[]>();
  for (const m of milestones) {
    const existing = byPlayer.get(m.playerName) || [];
    // Keep only the highest threshold per stat per player
    const dominated = existing.find((e) => e.stat === m.stat);
    if (dominated) {
      if (m.threshold > dominated.threshold) {
        const filtered = existing.filter((e) => e.stat !== m.stat);
        filtered.push(m);
        byPlayer.set(m.playerName, filtered);
      }
    } else {
      existing.push(m);
      byPlayer.set(m.playerName, existing);
    }
  }

  const parts: string[] = [];

  for (const [player, playerMilestones] of byPlayer) {
    const name = titleCase(player);
    const labels = playerMilestones.map((m) => m.label.toLowerCase());

    if (labels.length === 1) {
      parts.push(`${name} crossed ${labels[0]}`);
    } else {
      const last = labels.pop()!;
      parts.push(`${name} crossed ${labels.join(", ")} and ${last}`);
    }
  }

  if (parts.length === 0) return "";

  const joined =
    parts.length === 1
      ? parts[0]
      : parts.slice(0, -1).join(". ") + ". " + parts[parts.length - 1];

  return (
    `Milestone watch: ${joined}. ` +
    `These are the kind of numbers that define careers and this Bardownski roster continues to stack them up.`
  );
}
