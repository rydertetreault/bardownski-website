import { getDisplayName } from "./nicknames";

// The club's published roster numbers. These identify players; they are not
// rankings or a claim about the number worn in every historical season.
const PLAYER_NUMBERS = new Map([
  ["RYDER", 14], ["DYLAN", 4], ["MATT", 8], ["ROB", 1],
  ["COLIN", 2], ["KADEN", 9], ["JIMMY", 69], ["LOGAN", 6],
].map(([name, number]) => [getDisplayName(String(name)).trim().toUpperCase(), Number(number)]));

export function getPlayerNumber(name: string): number | null {
  return PLAYER_NUMBERS.get(getDisplayName(name).trim().replace(/\s+/g, " ").toUpperCase()) ?? null;
}
