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

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toUpperCase();
}

// Display-only aliases. Keep raw names/gamertags in feeds, keys and URLs.
// A Map also ensures unknown names such as "constructor" are safe fallbacks.
const DISPLAY_NAMES = new Map<string, string>(Object.entries(NICKNAMES));
for (const [gamertag, realName] of Object.entries(GAMERTAG_MAP)) {
  DISPLAY_NAMES.set(normalizeName(gamertag), NICKNAMES[realName]);
}

/**
 * Resolve an exact name or gamertag to its nickname, ignoring case/whitespace.
 * Already-public nicknames and unknown values pass through unchanged. This is
 * not a prose/substring replacer or an identity key normalizer.
 */
export function getDisplayName(name: string): string {
  return DISPLAY_NAMES.get(normalizeName(name)) ?? name;
}

/** Search-only aliases for a known player. Never rewrite stored identities or
 * infer matches from a partial name; unknown names stay searchable as-is. */
export function getPlayerSearchAliases(name: string): string[] {
  const normalized = normalizeName(name);
  const identity = Object.entries(NICKNAMES).find(([realName, nickname]) =>
    realName === normalized || normalizeName(nickname) === normalized ||
    Object.entries(GAMERTAG_MAP).some(([tag, real]) => real === realName && normalizeName(tag) === normalized),
  );
  if (!identity) return [name];
  const [realName, nickname] = identity;
  return [...new Set([name, realName, nickname, ...Object.entries(GAMERTAG_MAP)
    .filter(([, real]) => real === realName).map(([tag]) => tag)])];
}

/** Resolve an EA gamertag (or name) for public display. */
export function getDisplayNameFromGamertag(gamertag: string): string {
  return getDisplayName(gamertag);
}

/** Resolve a Discord name (or gamertag) for public display. */
export function getNickname(name: string): string {
  return getDisplayName(name);
}

// Match full nicknames first so the first name in Matt Hut / Jimmy Lemons is
// never expanded twice. Technical tokens are skipped even in article prose.
const PROSE_NAMES = new RegExp(
  [
    String.raw`(?:https?:\/\/|www\.)[^\s<>]+`,
    String.raw`[\w.+-]+@[\w.-]+\.[a-z]{2,}`,
    String.raw`@[\w.-]+`,
    String.raw`(?<![\p{L}\p{N}])[/#][\w%./#-]+`,
    String.raw`[\w%-]+\.(?:mp4|webm|mov|png|jpe?g|webp|avif|gif|svg|vtt)\b`,
    String.raw`(?<![\p{L}\p{N}_-])(?:${[
      ...Object.values(NICKNAMES).map(name => name.replace(/ /g, String.raw`\s+`)),
      ...Object.keys(NICKNAMES),
    ].join("|")})(?![\p{L}\p{N}_-])`,
  ].join("|"),
  "giu",
);

/**
 * Nickname-only plain-text club prose (titles, summaries, alt/dialog labels).
 * Preserves existing nicknames, possessives, unrelated words and URL tokens.
 * Use only at the display boundary, before HTML escaping; never on markup,
 * identity keys, attribution, raw archives, film/captions or media sources.
 * Unknown identities are not guessed, and all-uppercase mentions stay uppercase.
 */
export function getNicknameText(text: string): string {
  return text.replace(PROSE_NAMES, mention => {
    const nickname = DISPLAY_NAMES.get(normalizeName(mention));
    if (!nickname) return mention;
    if (mention === mention.toUpperCase()) return nickname;
    return nickname.replace(/[A-Z]+/g, word =>
      word === "IV" || word === "G" ? word : word[0] + word.slice(1).toLowerCase(),
    );
  });
}
