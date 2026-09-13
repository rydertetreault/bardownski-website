"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { SeasonData } from "@/lib/discord";
import { HOCKEY_ARCHIVE_SEASON, HOCKEY_SEASON } from "@/lib/hockey-season-state";
import { formatSeasonLabel } from "@/lib/player-comparison";
import { StatsDisplay } from "./components/StatsDisplay";

export type StatsClientProps = {
  seasons: SeasonData[];
  currentSeason?: string;
  currentAvailable?: boolean;
};

function formatSnapshotDate(value?: string): string {
  const label = value?.trim() || "Unavailable";
  // Only parse timezone-qualified ISO timestamps; legacy snapshot labels stay intact.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(label)) {
    return label;
  }
  const date = new Date(label);
  if (Number.isNaN(date.getTime())) return label;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

export default function StatsClient({
  seasons,
  currentSeason = HOCKEY_SEASON,
  currentAvailable = true,
}: StatsClientProps) {
  const instanceId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const currentLabel = formatSeasonLabel(currentSeason);
  const [selectedSeason, setSelectedSeason] = useState(currentLabel);

  // The current tab exists even without data. Equivalent year/range spellings
  // share one tab, and an unavailable current season never borrows an archive.
  const snapshots = new Map<string, SeasonData>();
  for (const snapshot of seasons) {
    const label = formatSeasonLabel(snapshot.season);
    if (!snapshots.has(label)) snapshots.set(label, snapshot);
  }
  const labels = [currentLabel, ...snapshots.keys()].filter(
    (label, index, all) => all.indexOf(label) === index,
  );
  const activeLabel = labels.includes(selectedSeason) ? selectedSeason : currentLabel;
  const isCurrent = activeLabel === currentLabel;
  const selectedStats = isCurrent && !currentAvailable
    ? undefined
    : snapshots.get(activeLabel)?.stats;
  const hasArchives = labels.length > 1;
  const tabId = (index: number) => `${instanceId}-season-tab-${index}`;
  const panelId = (index: number) => `${instanceId}-season-panel-${index}`;

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    switch (event.key) {
      case "ArrowLeft":
        nextIndex = (index - 1 + labels.length) % labels.length;
        break;
      case "ArrowRight":
        nextIndex = (index + 1) % labels.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = labels.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setSelectedSeason(labels[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <>
      <div className="stats-season-bar">
        <div className="stats-season-tablist" role="tablist" aria-label="Statistics season" aria-orientation="horizontal">
          {labels.map((label, index) => (
            <button
              key={label}
              ref={(element) => { tabRefs.current[index] = element; }}
              type="button"
              role="tab"
              id={tabId(index)}
              className="stats-season-tab"
              aria-selected={label === activeLabel}
              aria-controls={panelId(index)}
              tabIndex={label === activeLabel ? 0 : -1}
              onClick={() => setSelectedSeason(label)}
              onKeyDown={(event) => handleTabKey(event, index)}
            >
              {label} · {label === currentLabel ? "Current" : "Archive"}
            </button>
          ))}
        </div>
        <div className="stats-season-meta">
          <p>{isCurrent ? "Current season" : "Archived season"} · {activeLabel}</p>
          <p>Data snapshot · {formatSnapshotDate(selectedStats?.date)}</p>
          {!isCurrent && activeLabel === formatSeasonLabel(HOCKEY_ARCHIVE_SEASON) && (
            <a href="/awards">{activeLabel} award winners ↗</a>
          )}
        </div>
      </div>
      {labels.map((label, index) => (
        <div
          key={label}
          id={panelId(index)}
          className="stats-season-content"
          role="tabpanel"
          aria-labelledby={tabId(index)}
          tabIndex={0}
          hidden={label !== activeLabel}
        >
          {label === activeLabel && (
            selectedStats ? (
              // Mount only the selected snapshot; returning to a season starts
              // with closed player disclosures rather than stale expanded UI.
              <StatsDisplay key={activeLabel} stats={selectedStats} />
            ) : (
              <div className="stats-empty">
                <h3>{isCurrent ? "Current-season statistics are unavailable." : "Archived statistics are unavailable."}</h3>
                <p>No player statistics are available for {activeLabel}.</p>
                {isCurrent && hasArchives && <p>Choose an archive tab to explore a previous season. Archive totals are not current-season results.</p>}
              </div>
            )
          )}
        </div>
      ))}
    </>
  );
}
