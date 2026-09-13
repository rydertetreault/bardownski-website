// Generate display-only grayscale previews. Originals/video/audio are untouched.
// Run from the repository root: npx tsx scripts/generate-monochrome-posters.ts
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { MONOCHROME_POSTERS } from "../src/lib/photo-posters";

async function main() {
  for (const [source, target] of Object.entries(MONOCHROME_POSTERS)) {
    await mkdir(dirname(`public${target}`), { recursive: true });
    await sharp(`public${source}`).grayscale().toColourspace("srgb").webp({ lossless: true, effort: 6 }).toFile(`public${target}`);
    console.log(`${source} -> ${target}`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
