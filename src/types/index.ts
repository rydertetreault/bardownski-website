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

export interface Match {
  id: string;
  date: string;
  opponent: string;
  homeAway: "home" | "away";
  scoreUs: number | null;
  scoreThem: number | null;
  status: "upcoming" | "live" | "final";
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  image?: string;
}
