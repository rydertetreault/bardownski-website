/**
 * EA per-match player rows report both defenders as "defenseMen". The side is
 * only carried by `posSorted` (EA lineup slot: 0 G, 1 RD, 2 LD, 3 RW, 4 LW, 5 C),
 * so resolve it here into "leftDefense" / "rightDefense".
 */
export function resolveMatchPosition(position: string, posSorted: unknown): string {
  if (position.replace(/[\s_-]/g, "").toLowerCase() !== "defensemen") return position;
  const slot = String(posSorted ?? "").trim();
  if (slot === "1") return "rightDefense";
  if (slot === "2") return "leftDefense";
  return position;
}
