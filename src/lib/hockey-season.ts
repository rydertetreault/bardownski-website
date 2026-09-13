import type { HockeySeasonState } from "./hockey-season-state";
import { HOCKEY_SEASON } from "./hockey-season-state";
import { calculateHockeyAwards } from "./hockey-awards";
import { refreshHockeyTracker } from "./hockey-tracker";
export * from "./hockey-season-state";

/** One current-season source for pages and player analysis. Server-only modules
 * stay here; client types/constants live in hockey-season-state.
 * NHL26 archive code is deliberately outside this pipeline. */
export async function getHockeySeason(): Promise<HockeySeasonState> {
  return hockeyStateFromTracker(await refreshHockeyTracker());
}

export function hockeyStateFromTracker(result: import("./hockey-tracker").TrackerResult): HockeySeasonState {
  const snapshot = result.snapshot;
  const awards = snapshot ? calculateHockeyAwards({...snapshot.data,matches:result.matches},new Date().toISOString()) : null;
  const base = {awards, season: HOCKEY_SEASON as typeof HOCKEY_SEASON, syncedAt: snapshot?.syncedAt ?? null, coverage:{storedMatches:result.matches.length,totalGames:snapshot?.data.clubStats.totalGames ?? null}, ...(result.error ? {error:result.error} : {})};
  if (!snapshot) return {...base,status:"unavailable",data:null,matches:[],updatedAt:null};
  return {...base,status:result.status === "connected" ? "connected" : "stale",data:{...snapshot.data,matches:result.matches},matches:result.matches.map(match => ({...match,status:"final"})),updatedAt:snapshot.fetchedAt};
}
