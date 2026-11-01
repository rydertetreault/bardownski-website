// The same verified pipeline used by the website, callable by hosted scheduling.
// No Next server, Discord, legacy sync, credentials in arguments, or site visit needed.
import { loadEnvConfig } from "@next/env";
import { refreshHockeyTracker, STALE_AFTER_MS } from "../src/lib/hockey-tracker";
import { basename } from "node:path";
import { fetchNhl27Snapshot, NHL27_IDENTITY } from "../src/lib/nhl27-api";

// Transport-level failures reaching the upstream feed or Redis. These are retried
// once in-process and never fail the job: the next run re-reads the same feed.
export const TRANSIENT =
  /timed out|network request unsuccessful|fetch failed|HTTP (408|425|429|5\d\d)|not valid JSON|upstream blocked|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up|other side closed/i;

// Contention and short outages where stored data is intact and correct. Another
// writer (a site page load or an overlapping run) is already doing the work, or
// the upstream feed published a glitch we deliberately refused to commit.
export const SELF_HEALING =
  /Tracking storage is temporarily unavailable|first sync is in progress|Sync lease expired|Upstream totals decreased/i;

// Our own misconfiguration, corrupted storage, or a broken upstream contract.
// These never fix themselves, so they must keep failing the job loudly.
export const MUST_FAIL =
  /is not configured|Stored tracker shape|Source identity mismatch|NHL27 snapshot:/;

// Serving stale data briefly is normal (GitHub spaces scheduled runs hours apart).
// Serving it for this long means collection is genuinely broken, not contended.
export const MAX_SNAPSHOT_AGE_MS = 12 * 60 * 60 * 1000;

// Keep tokens and feed payloads out of logs while still naming the real cause.
export function redact(message: string): string {
  return message
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    .slice(0, 300);
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return redact(`${error.name}: ${error.message}`);
  return `Non-error thrown (${typeof error})`;
}

type Verdict = { ok: boolean; title: string; detail: string };

/** Decide the job outcome from a tracker result. Transient transport failures and
 * lease contention annotate and pass; configuration, storage-shape and schema
 * failures, or data that has gone unrefreshed for too long, fail. */
export function classifySync(
  result: {
    status: string;
    snapshot?: { fetchedAt?: string } | null;
    error?: string;
    reason?: string;
  },
  now: number = Date.now(),
): Verdict {
  const detail = [result.reason, result.error].filter(Boolean).join(" | ") || "no reason reported";

  if (result.status === "connected") return { ok: true, title: "", detail: "connected" };

  // A real defect in our configuration, our stored data, or the feed contract.
  if (MUST_FAIL.test(detail)) return { ok: false, title: "NHL27 collector defect", detail };

  // Nothing is being served at all; only a brief storage/lease outage excuses it.
  if (!result.snapshot) {
    if (TRANSIENT.test(detail) || SELF_HEALING.test(detail)) {
      return { ok: true, title: "NHL27 storage briefly unavailable", detail };
    }
    return { ok: false, title: "NHL27 collector has no data to serve", detail };
  }

  const age = now - Date.parse(result.snapshot.fetchedAt ?? "");
  if (Number.isFinite(age) && age > MAX_SNAPSHOT_AGE_MS) {
    return {
      ok: false,
      title: "NHL27 data is no longer being refreshed",
      detail: `${detail} (last feed read ${Math.round(age / 3_600_000)}h ago)`,
    };
  }

  if (TRANSIENT.test(detail)) {
    return { ok: true, title: "NHL27 upstream unavailable", detail: `${detail}. Kept last good snapshot.` };
  }
  if (SELF_HEALING.test(detail)) {
    return { ok: true, title: "NHL27 sync deferred", detail: `${detail}. Kept last good snapshot.` };
  }

  // Stale with no reported cause means another writer held the 60s lease while
  // our stored snapshot was already older than the staleness window. Normal.
  if (result.status === "stale" && !result.error && !result.reason) {
    return {
      ok: true,
      title: "NHL27 sync skipped",
      detail: `Another writer holds the sync lease; snapshot is ${Math.round(
        (Number.isFinite(age) ? age : 0) / 60_000,
      )}m old (stale after ${Math.round(STALE_AFTER_MS / 60_000)}m).`,
    };
  }

  return { ok: false, title: "NHL27 collector failed", detail };
}

// The upstream feed is intermittently flaky; retry transient transport failures once.
// Schema/parse failures are not retried. Worst case (20s + 3s + 20s) fits the 60s lease.
async function fetchWithRetry() {
  try {
    return await fetchNhl27Snapshot();
  } catch (error) {
    if (!(error instanceof Error && TRANSIENT.test(error.message))) throw error;
    console.warn(`NHL27 fetch attempt 1 failed (${redact(error.message)}); retrying in 3s.`);
    await new Promise(resolve => setTimeout(resolve, 3_000));
    return fetchNhl27Snapshot();
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  const result = await refreshHockeyTracker({ force: true, fetchSnapshot: fetchWithRetry });
  console.log(JSON.stringify({
    status: result.status, synced: result.synced, identity: NHL27_IDENTITY,
    storedMatches: result.matches.length, totalGames: result.snapshot?.data.clubStats.totalGames ?? null,
    mvpRankings: result.snapshot?.awards?.seasonMvp.length ?? 0,
    weeklyRankings: result.snapshot?.awards?.currentWeek.standings.length ?? 0,
    weeklyObservedGames: result.snapshot?.awards?.currentWeek.games ?? 0,
    weeklyLeaders: result.snapshot?.awards?.currentWeek.leaders.map(player => ({ name: player.name, eligible: player.eligible, games: player.games })) ?? [],
    fetchedAt: result.snapshot?.fetchedAt ?? null, syncedAt: result.snapshot?.syncedAt ?? null,
    ...(result.error ? { error: result.error } : {}),
    ...(result.reason ? { reason: result.reason } : {}),
  }, null, 2));

  const verdict = classifySync(result);
  if (verdict.ok) {
    if (verdict.title) console.log(`::warning title=${verdict.title}::${verdict.detail}`);
    return;
  }
  console.log(`::error title=${verdict.title}::${verdict.detail}`);
  process.exitCode = 1;
}

// Only collect when run as the entry point, so the classifier stays unit-testable.
const entry = process.argv[1] ? basename(process.argv[1]).replace(/\.[cm]?[jt]s$/, "") : "";
if (entry === "sync-hockey") {
  main().catch(error => {
    // Name the real cause (redacted) instead of discarding it; the previous
    // version logged nothing, which made every failure undiagnosable.
    const detail = describeError(error);
    console.log(`::error title=NHL27 collector crashed::${detail}`);
    console.error(`NHL27 collector failed: ${detail}`);
    process.exitCode = 1;
  });
}
