"use client";
import { useState } from "react";
import type { SeasonData } from "@/lib/discord";
import { formatSeasonLabel } from "@/lib/player-comparison";
import { StatsDisplay } from "./components/StatsDisplay";

export default function StatsClient({ seasons }: { seasons: SeasonData[] }) {
  const [selectedSeason, setSelectedSeason] = useState(seasons[0]?.season ?? "");
  const current = seasons.find(s => s.season === selectedSeason);
  return <>
    <div className="stats-season-controls"><div className="stats-season-bar"><div role="group" aria-label="Select stats season">{seasons.map(({season}) => <button type="button" key={season} aria-pressed={season === selectedSeason} onClick={() => setSelectedSeason(season)}>{formatSeasonLabel(season)}</button>)}</div><p>Data snapshot · {current?.stats.date ?? "Unavailable"}</p></div></div>
    <div className="stats-season-content">{current ? <StatsDisplay key={selectedSeason} stats={current.stats} /> : <p>No statistics available for this season.</p>}</div>
  </>;
}
