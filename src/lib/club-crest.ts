/** Validated cosmetic metadata, shared by ingestion and client-side rendering. */
export type ClubCrest = { crestAssetId: string; useBaseAsset: boolean };

function crestAssetId(value: unknown): string | undefined {
  if (typeof value !== "number" && (typeof value !== "string" || value.length === 0 || /\D/.test(value))) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id >= 0 ? String(id) : undefined;
}

/** Parse raw details.customKit without making missing/bad cosmetics a match error. */
export function parseClubCrest(value: unknown): ClubCrest | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const kit = value as Record<string, unknown>;
  const id = crestAssetId(kit.crestAssetId);
  if (id === undefined) return undefined;

  const flag = kit.useBaseAsset;
  let useBaseAsset: boolean;
  if (flag === true || flag === 1 || flag === "1") useBaseAsset = true;
  else if (flag === undefined || flag === false || flag === 0 || flag === "0") useBaseAsset = false;
  else return undefined;

  return { crestAssetId: id, useBaseAsset };
}

/** Revalidate persisted metadata; only the fixed chelstats resolver may be used. */
export function getClubCrestUrl(crest: ClubCrest | undefined): string | null {
  if (!crest || typeof crest !== "object" || Array.isArray(crest)) return null;
  const { crestAssetId: id, useBaseAsset } = crest;
  if (typeof id !== "string" || crestAssetId(id) !== id || typeof useBaseAsset !== "boolean") return null;
  return `https://chelstats.app/api/crest/${id}${useBaseAsset ? "?base=1" : ""}`;
}
