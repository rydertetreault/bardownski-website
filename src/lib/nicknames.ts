// Player nicknames / aliases
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

export function getNickname(name: string): string {
  return NICKNAMES[name.toUpperCase()] ?? name;
}

export function getDisplayName(name: string): string {
  const nickname = NICKNAMES[name.toUpperCase()];
  return nickname ? `${name} - ${nickname}` : name;
}
