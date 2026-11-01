import assert from "node:assert/strict";
import test from "node:test";
import { classifySync, describeError, redact, MAX_SNAPSHOT_AGE_MS } from "../scripts/sync-hockey";

const NOW = Date.UTC(2026, 9, 9, 23, 12, 0);
const agedSnapshot = (ms: number) => ({ fetchedAt: new Date(NOW - ms).toISOString() });
const MIN = 60_000;

test("a healthy sync passes with no annotation", () => {
  const verdict = classifySync({ status: "connected", snapshot: agedSnapshot(MIN) }, NOW);
  assert.equal(verdict.ok, true);
  assert.equal(verdict.title, "");
});

// This is the regression that produced the repeated "Collect NHL27 matches"
// failures: scheduled runs land hours apart, so the stored snapshot is almost
// always past the 15m staleness window. Losing the 60s lease to a page load or
// an overlapping run then reported "stale" with no reason at all, and the job
// exited 1 even though the saved data was correct and intact.
test("lease contention with an already-stale snapshot does not fail the job", () => {
  const verdict = classifySync({ status: "stale", snapshot: agedSnapshot(3 * 60 * MIN) }, NOW);
  assert.equal(verdict.ok, true);
  assert.match(verdict.detail, /Another writer holds the sync lease/);
});

test("transient upstream and transport failures keep the last good snapshot", () => {
  for (const reason of [
    "NHL27 fetch timed out after 20 seconds",
    "NHL27 fetch failed: network request unsuccessful",
    "NHL27 fetch failed: HTTP 503",
    "NHL27 fetch failed: response is not valid JSON",
    "NHL27 upstream blocked: EA denied the recentGames.x request",
    "fetch failed",
    "ECONNRESET",
  ]) {
    const verdict = classifySync({ status: "stale", snapshot: agedSnapshot(MIN), reason }, NOW);
    assert.equal(verdict.ok, true, `expected pass for ${reason}`);
  }
});

test("contention and refused commits annotate instead of failing", () => {
  for (const error of [
    "Tracking storage is temporarily unavailable.",
    "The first sync is in progress. Please refresh shortly.",
    "Sync lease expired; the last saved data was preserved.",
    "Upstream totals decreased; the last verified snapshot and saved games were preserved.",
  ]) {
    const verdict = classifySync({ status: "stale", snapshot: agedSnapshot(MIN), error }, NOW);
    assert.equal(verdict.ok, true, `expected pass for ${error}`);
  }
});

test("real defects still fail loudly", () => {
  for (const error of [
    "Persistent tracking storage is not configured.",
    "Stored tracker shape/identity is invalid",
    "Source identity mismatch",
    "NHL27 snapshot: data.members expected array",
  ]) {
    const verdict = classifySync({ status: "stale", snapshot: agedSnapshot(MIN), reason: error }, NOW);
    assert.equal(verdict.ok, false, `expected failure for ${error}`);
  }
});

test("missing secrets fail even though no snapshot exists", () => {
  const verdict = classifySync(
    { status: "unavailable", snapshot: null, error: "Persistent tracking storage is not configured." },
    NOW,
  );
  assert.equal(verdict.ok, false);
});

test("a transient storage blip with no snapshot is tolerated", () => {
  const verdict = classifySync(
    { status: "unavailable", snapshot: null, error: "Tracking storage is temporarily unavailable." },
    NOW,
  );
  assert.equal(verdict.ok, true);
});

test("data that stopped refreshing escalates to a failure", () => {
  const verdict = classifySync(
    { status: "stale", snapshot: agedSnapshot(MAX_SNAPSHOT_AGE_MS + MIN), reason: "NHL27 fetch timed out after 20 seconds" },
    NOW,
  );
  assert.equal(verdict.ok, false);
  assert.match(verdict.detail, /last feed read 12h ago/);
});

test("an unrecognised failure is not silently swallowed", () => {
  const verdict = classifySync({ status: "stale", snapshot: agedSnapshot(MIN), reason: "Storage or unexpected failure (TypeError)" }, NOW);
  assert.equal(verdict.ok, false);
});

test("diagnostics name the cause without leaking tokens or payloads", () => {
  assert.match(describeError(new TypeError("fetch failed")), /TypeError: fetch failed/);
  assert.equal(redact("call https://x.io/a?token=1 failed"), "call [url] failed");
  assert.match(redact("token AbCdEf0123456789AbCdEf0123456789"), /\[redacted\]/);
  assert.match(describeError("boom"), /Non-error thrown \(string\)/);
});
