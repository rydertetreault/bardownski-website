/**
 * FROZEN final-season snapshot of the Bardownski EASHL club (NHL 26, club
 * 149602, common-gen5). The season is over and EA has since reset the Pro
 * Clubs database for the next title, so chelstats.app no longer returns any
 * data for this club. This file is what the site displayed on its last
 * successful deploy (built 2026-07-28; last game played 2026-07-22).
 *
 * Provenance: recovered from the prerendered HTML of that deployment and
 * re-derived into the ClubMember shape. Every field that drives a rendered
 * number (leaderboards, roster cards, MVP odds, records) was verified to
 * reproduce the captured output exactly — all 12 MVP-odds scores match to
 * 9 decimal places, and goalie wins solve to whole numbers.
 *
 * Fields that are NOT rendered anywhere on the NHL pages and could not be
 * recovered are set to neutral values: winPct=0, playstyle="", and the
 * club-level seasons/titles/division/star/rating fields=0. goalieShots and
 * goalieRecord are derived (saves ÷ save%, wins/losses from GP−wins).
 * clubStats.goals is the sum of player goals; goalsAgainst is unknown (0).
 *
 * Do not hand-edit numbers here without a source for them.
 */

import type { ChelstatsData, ClubMember, ClubStats } from "./chelstats";

export const FROZEN_SEASON_LABEL = "Final · last game Jul 22, 2026";

const clubStats: ClubStats = {
  record: "207-144-15",
  wins: 207,
  losses: 144,
  otl: 15,
  goals: 1886,
  goalsAgainst: 0,
  goalsPerGame: 5.15,
  goalsAgainstPerGame: 0,
  totalGames: 366,
  seasons: 0,
  titlesWon: 0,
  currentDivision: 0,
  bestDivision: 0,
  starLevel: 0,
  overallRating: 0,
};

// Order matches the API's member order on the final deploy (roster page grouping preserves it).
const members: ClubMember[] = [
  { username: "u4 Pablo", position: "C", gamesPlayed: 290, goals: 920, assists: 490, points: 1410, ppg: 4.9, plusMinus: 483, hits: 2189, shots: 2348, shotPct: 39.2, pim: 140, gwg: 43, winPct: 0, takeaways: 907, giveaways: 2146, interceptions: 197, blockedShots: 152, faceoffPct: 56.1, passCompPct: 79.8, goalieGP: 0, goalieWins: 0, goalieRecord: "0-0-0", goalieSaves: 0, goalieShots: 0, savePct: 0.0, gaa: 0.0, shutouts: 0, shutoutPeriods: 0, overallRating: 92, playstyle: "" },
  { username: "oP wet", position: "LW", gamesPlayed: 101, goals: 80, assists: 141, points: 221, ppg: 2.2, plusMinus: 20, hits: 359, shots: 345, shotPct: 23.2, pim: 41, gwg: 6, winPct: 0, takeaways: 277, giveaways: 556, interceptions: 82, blockedShots: 56, faceoffPct: 50, passCompPct: 75.6, goalieGP: 27, goalieWins: 21, goalieRecord: "21-6-0", goalieSaves: 201, goalieShots: 296, savePct: 68.0, gaa: 4.7, shutouts: 5, shutoutPeriods: 9, overallRating: 87, playstyle: "" },
  { username: "Mhut8", position: "C", gamesPlayed: 233, goals: 472, assists: 329, points: 801, ppg: 3.4, plusMinus: 182, hits: 1029, shots: 1407, shotPct: 33.5, pim: 142, gwg: 24, winPct: 0, takeaways: 684, giveaways: 1273, interceptions: 116, blockedShots: 132, faceoffPct: 56.1, passCompPct: 78.2, goalieGP: 2, goalieWins: 0, goalieRecord: "0-0-0", goalieSaves: 18, goalieShots: 21, savePct: 85.0, gaa: 0.0, shutouts: 0, shutoutPeriods: 0, overallRating: 83, playstyle: "" },
  { username: "Julio 3026", position: "RW", gamesPlayed: 112, goals: 95, assists: 187, points: 282, ppg: 2.5, plusMinus: 63, hits: 458, shots: 496, shotPct: 19.2, pim: 97, gwg: 7, winPct: 0, takeaways: 248, giveaways: 525, interceptions: 44, blockedShots: 98, faceoffPct: 40.2, passCompPct: 78.8, goalieGP: 25, goalieWins: 12, goalieRecord: "12-13-0", goalieSaves: 220, goalieShots: 328, savePct: 67.0, gaa: 4.71, shutouts: 2, shutoutPeriods: 14, overallRating: 87, playstyle: "" },
  { username: "Rydayro", position: "SKTR", gamesPlayed: 27, goals: 15, assists: 27, points: 42, ppg: 1.6, plusMinus: -27, hits: 55, shots: 75, shotPct: 20, pim: 20, gwg: 0, winPct: 0, takeaways: 61, giveaways: 158, interceptions: 18, blockedShots: 17, faceoffPct: 40.2, passCompPct: 79.1, goalieGP: 209, goalieWins: 132, goalieRecord: "132-77-0", goalieSaves: 2135, goalieShots: 3007, savePct: 71.0, gaa: 4.78, shutouts: 21, shutoutPeriods: 95, overallRating: 97, playstyle: "" },
  { username: "oP Ding1633", position: "LW", gamesPlayed: 125, goals: 150, assists: 172, points: 322, ppg: 2.6, plusMinus: 35, hits: 562, shots: 656, shotPct: 22.9, pim: 137, gwg: 6, winPct: 0, takeaways: 285, giveaways: 699, interceptions: 39, blockedShots: 71, faceoffPct: 37.9, passCompPct: 76.9, goalieGP: 0, goalieWins: 0, goalieRecord: "0-0-0", goalieSaves: 0, goalieShots: 0, savePct: 0.0, gaa: 0.0, shutouts: 0, shutoutPeriods: 0, overallRating: 82, playstyle: "" },
  { username: "Treyway6479", position: "LW", gamesPlayed: 8, goals: 0, assists: 6, points: 6, ppg: 0.8, plusMinus: -20, hits: 2, shots: 13, shotPct: 0, pim: 6, gwg: 0, winPct: 0, takeaways: 10, giveaways: 35, interceptions: 3, blockedShots: 2, faceoffPct: 0, passCompPct: 75.4, goalieGP: 0, goalieWins: 0, goalieRecord: "0-0-0", goalieSaves: 0, goalieShots: 0, savePct: 0.0, gaa: 0.0, shutouts: 0, shutoutPeriods: 0, overallRating: 61, playstyle: "" },
  { username: "S1obbyRobby", position: "D", gamesPlayed: 91, goals: 33, assists: 170, points: 203, ppg: 2.2, plusMinus: 51, hits: 399, shots: 237, shotPct: 13.9, pim: 128, gwg: 1, winPct: 0, takeaways: 261, giveaways: 431, interceptions: 61, blockedShots: 123, faceoffPct: 100, passCompPct: 82.3, goalieGP: 0, goalieWins: 0, goalieRecord: "0-0-0", goalieSaves: 0, goalieShots: 0, savePct: 0.0, gaa: 0.0, shutouts: 0, shutoutPeriods: 0, overallRating: 93, playstyle: "" },
  { username: "u4 Hood", position: "D", gamesPlayed: 117, goals: 121, assists: 196, points: 317, ppg: 2.7, plusMinus: -33, hits: 384, shots: 346, shotPct: 35, pim: 102, gwg: 4, winPct: 0, takeaways: 255, giveaways: 745, interceptions: 72, blockedShots: 109, faceoffPct: 20, passCompPct: 76.4, goalieGP: 3, goalieWins: 0, goalieRecord: "0-0-0", goalieSaves: 14, goalieShots: 23, savePct: 60.0, gaa: 0.0, shutouts: 2, shutoutPeriods: 2, overallRating: 84, playstyle: "" },
];

export const FROZEN_CHELSTATS: ChelstatsData = {
  clubStats,
  members,
  // Per-game history lives in Redis (match-history:*), accumulated all season.
  matches: [],
};
