// Gamertag → real name mapping (chelstats uses EA gamertags)
// Add new players here: "gamertag": "REAL_NAME"
const GAMERTAG_MAP: Record<string, string> = {
  "Rydayro": "RYDER",
  "S1obbyRobby": "ROB",
  "Mhut8": "MATT",
  "u4 Pablo": "DYLAN",
  "oP wet": "COLIN",
  "u4 Hood": "KADEN",
  "Julio 3026": "JIMMY",
  "oP Ding1633": "LOGAN",
};

// Real name → display nickname
const NICKNAMES: Record<string, string> = {
  DYLAN: "XAVIER LAFLAMME",
  MATT: "MATT HUT",
  COLIN: "WOLFGANG MOZART",
  RYDER: "JENE RENE TETREAU IV",
  ROB: "SLOBBY ROBBY",
  KADEN: "GOTTA BE",
  JIMMY: "JIMMY LEMONS",
  LOGAN: "TOP G",
};

/** Resolve a gamertag to its display name (nickname > real name > gamertag) */
export function getDisplayNameFromGamertag(gamertag: string): string {
  const realName = GAMERTAG_MAP[gamertag];
  if (realName) {
    return NICKNAMES[realName.toUpperCase()] ?? realName;
  }
  return gamertag;
}

/** Resolve a real name (from Discord) to its nickname */
export function getNickname(name: string): string {
  return NICKNAMES[name.toUpperCase()] ?? name;
}

/** "RYDER - JENE RENE TETREAU IV" format */
export function getDisplayName(name: string): string {
  const nickname = NICKNAMES[name.toUpperCase()];
  return nickname ? `${name} - ${nickname}` : name;
}
