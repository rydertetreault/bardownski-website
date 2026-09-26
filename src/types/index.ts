import type { ClubCrest } from "@/lib/club-crest";

export interface Player {
  id: string;
  name: string;
  number: number;
  position: "C" | "LW" | "RW" | "LD" | "RD" | "G";
  image: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pim: number;
  // Goalie-specific stats
  wins?: number;
  losses?: number;
  otLosses?: number;
  gaa?: number;
  savePercentage?: number;
  shutouts?: number;
}

export interface MatchPlayerStat {
  name: string;
  position: string;
  goals: number;
  assists: number;
  hits: number;
  shots: number;
  plusMinus: number;
  pim: number;
  powerPlayGoals: number;
  shortHandedGoals: number;
  gameWinningGoal: number;
  saves: number;
  shotsAgainst: number;
  goalsAgainst: number;
  savePct: number;
  isGoalie: boolean;
  isOurPlayer: boolean;
}

export interface ThreeStar {
  name: string;
  score: number;
  isOurPlayer: boolean;
  isGoalie: boolean;
}

export type GameMode = "3s" | "6s";

export interface Match {
  id: string;
  timestamp: number;
  date: string;
  opponent: string;
  opponentClubId?: string;
  opponentCrest?: ClubCrest;
  homeAway: "home" | "away";
  scoreUs: number | null;
  scoreThem: number | null;
  status: "upcoming" | "live" | "final";
  matchType?: "regular" | "finals" | "private";
  /** Club game mode: EASHL 3v3 ("3s") or 6v6 ("6s"). Absent when unknown (e.g. archive). */
  gameMode?: GameMode;
  shotsUs?: number;
  shotsThem?: number;
  toaUs?: string;
  toaThem?: string;
  passCompUs?: number;
  passCompThem?: number;
  players?: MatchPlayerStat[];
  threeStars?: [ThreeStar, ThreeStar, ThreeStar] | null;
  forfeit?: boolean;
}

export interface ClubRecord {
  wins: number;
  losses: number;
  otl: number;
}

export interface WeeklyRecord {
  w: number;
  l: number;
  gp: number;
  gf: number;
  ga: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  image?: string;
}
