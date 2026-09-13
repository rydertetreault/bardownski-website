import { getPlayerSearchAliases } from "../../../lib/nicknames";

export interface SearchRankingEntry {
  name: string;
  tag?: string;
  position?: string;
  number: number;
  season?: string;
}

export interface SearchableRecord {
  id: string;
  title: string;
  category: string;
  scope: string;
  tags?: string;
  status: string;
  team?: boolean;
  winners: readonly string[];
  ranking: readonly SearchRankingEntry[];
}

export interface RecordSearchResult<T extends SearchableRecord> {
  record: T;
  score: number;
  match?: { entry: T["ranking"][number]; rank: number; isHolder: boolean };
}

const aliases = new Map<string, string>();
for (const [canonical, words] of [
  ["goalie", "goalie goalies goaltender goaltenders goaltending goalkeeper goalkeepers goalkeeping g gk"],
  ["defense", "defense defence defender defenders defenseman defensemen defenceman defencemen d"],
  ["forward", "forward forwards f"],
  ["center", "center centre centers centres c"],
  ["leftwing", "leftwing lw"],
  ["rightwing", "rightwing rw"],
  ["leftdefense", "leftdefense ld"],
  ["rightdefense", "rightdefense rd"],
  ["points", "points point pts"],
  ["assists", "assists assist"],
  ["goals", "goals goal"],
  ["saves", "saves save"],
  ["blocks", "blocks block blocked"],
]) {
  for (const word of words.split(" ")) aliases.set(word, canonical);
}
const roles = new Set([
  "goalie", "defense", "forward", "center", "leftwing", "rightwing", "leftdefense", "rightdefense",
]);

function words(text: string): string[] {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/\+\s*\/?\s*[-−–—]|±/g, " plusminus ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\bplus\s+minus\b/g, "plusminus")
    // This known nickname is literal, not a goalie position query.
    .replace(/\btop\s+g\b/g, "topg")
    .replace(/\bleft\s+wing(?:er)?\b/g, "leftwing")
    .replace(/\bright\s+wing(?:er)?\b/g, "rightwing")
    .replace(/\bleft\s+defen[cs]e(?:man)?\b/g, "leftdefense")
    .replace(/\bright\s+defen[cs]e(?:man)?\b/g, "rightdefense")
    .trim().split(/\s+/).filter(Boolean);
}

function canonical(word: string): string {
  return aliases.get(word) ?? word;
}

function addRoleParents(tokens: Set<string>): Set<string> {
  if (["center", "leftwing", "rightwing"].some(role => tokens.has(role))) tokens.add("forward");
  if (tokens.has("leftdefense") || tokens.has("rightdefense")) tokens.add("defense");
  return tokens;
}

function positionTokens(position: string | undefined): Set<string> {
  // Only an explicitly recognized position (not prose or a guessed name) has a role.
  const tokens = words(position ?? "").map(canonical);
  return tokens.length && tokens.every(token => roles.has(token))
    ? addRoleParents(new Set(tokens)) : new Set();
}

function matches(token: string, document: ReadonlySet<string>): boolean {
  if (document.has(token)) return true;
  // Role tokens and single letters never use substring matching.
  return !roles.has(token) && token.length > 1 && [...document].some(word => word.includes(token));
}

function identityNames(name: string, tag?: string): Set<string> {
  return new Set([name, ...(tag ? [tag] : [])].flatMap(value =>
    getPlayerSearchAliases(value).map(alias => words(alias).join(" ")),
  ));
}

/** Pure keyword search over the supplied (already season-filtered) rankings. */
export function searchRecords<T extends SearchableRecord>(
  records: readonly T[], query: string,
): RecordSearchResult<T>[] {
  const tokens = [...new Set(words(query).map(canonical))];
  if (!tokens.length) return query.trim() ? [] : records.map(record => ({ record, score: 0 }));
  const positionOnly = tokens.every(token => roles.has(token));
  const results: (RecordSearchResult<T> & { index: number })[] = [];

  records.forEach((record, index) => {
    const specialized = addRoleParents(new Set(
      words([record.title, record.category, record.tags ?? ""].join(" ")).map(canonical),
    ));
    const metadata = new Set([...specialized, ...words(record.scope).map(canonical)]);
    const metadataHits = tokens.filter(token => matches(token, metadata)).length;
    const winners = new Set(record.winners.flatMap(winner => [...identityNames(winner)]));
    const ranks = new Map<number, number>();
    let best: RecordSearchResult<T>["match"];
    let bestScore = -1;

    record.ranking.forEach((entry, entryIndex) => {
      if (!ranks.has(entry.number)) ranks.set(entry.number, entryIndex + 1);
      const rank = ranks.get(entry.number)!;
      const identities = identityNames(entry.name, entry.tag);
      const names = new Set([...identities].flatMap(name => name.split(" ")));
      const positions = positionTokens(entry.position);
      const nameHits = tokens.filter(token => !roles.has(token) && matches(token, names)).length;
      const positionHits = tokens.filter(token => positions.has(token)).length;
      if (!nameHits && !positionHits) return;
      if (!tokens.every(token => matches(token, metadata)
        || (!roles.has(token) && matches(token, names)) || positions.has(token))) return;

      const isHolder = rank === 1 || [...identities].some(name => winners.has(name));
      const score = (nameHits ? 100 : 20) + (isHolder ? 40 : 0) + nameHits * 4 + positionHits * 2;
      if (score > bestScore) {
        bestScore = score;
        best = { entry, rank, isHolder };
      }
    });

    if (metadataHits !== tokens.length && !best) return;
    const specialization = positionOnly && tokens.every(token => specialized.has(token)) ? 200 : 0;
    results.push({ record, score: metadataHits * 2 + Math.max(0, bestScore) + specialization,
      ...(best ? { match: best } : {}), index });
  });

  return results.sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ record, score, match }) => ({ record, score, ...(match ? { match } : {}) }));
}
