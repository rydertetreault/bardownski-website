#!/usr/bin/env node
// Inventory of the source media library in ./media (see media/README.md).
// Prints per-player counts, sizes and clip durations. No dependencies: mp4/mov
// durations come from the container's `mvhd` atom, images from their headers.
//
//   npm run media            full inventory
//   npm run media -- matt    one player (or "team" / "inbox")
//   npm run media -- --json  machine-readable output

import { readdirSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "media");
const VIDEO = new Set([".mp4", ".mov", ".m4v"]);
const IMAGE = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic"]);
const args = process.argv.slice(2);
const json = args.includes("--json");
const filter = args.find((a) => !a.startsWith("--"))?.toLowerCase();

/* ── mp4/mov duration from the mvhd atom (walks moov, handles 64-bit sizes) ── */
function mp4Duration(path) {
  const fd = openSync(path, "r");
  try {
    const size = statSync(path).size;
    const header = Buffer.alloc(16);
    const readAt = (buf, pos, len = buf.length) => readSync(fd, buf, 0, len, pos);
    const walk = (start, end, depth = 0) => {
      let pos = start;
      while (pos + 8 <= end) {
        readAt(header, pos, 16);
        let boxSize = header.readUInt32BE(0);
        const type = header.toString("latin1", 4, 8);
        let headLen = 8;
        if (boxSize === 1) { boxSize = Number(header.readBigUInt64BE(8)); headLen = 16; }
        else if (boxSize === 0) boxSize = end - pos;
        if (boxSize < headLen) return null;
        if (type === "moov" && depth === 0) {
          const inner = walk(pos + headLen, pos + boxSize, 1);
          if (inner != null) return inner;
        } else if (type === "mvhd") {
          const body = Buffer.alloc(32);
          readAt(body, pos + headLen, 32);
          const version = body[0];
          const timescale = version === 1 ? body.readUInt32BE(20) : body.readUInt32BE(12);
          const duration = version === 1 ? Number(body.readBigUInt64BE(24)) : body.readUInt32BE(16);
          return timescale ? duration / timescale : null;
        }
        pos += boxSize;
      }
      return null;
    };
    return walk(0, size);
  } catch { return null; } finally { closeSync(fd); }
}

/* ── image dimensions from headers (png, jpeg, webp, gif) ── */
function imageSize(path) {
  const fd = openSync(path, "r");
  try {
    const buf = Buffer.alloc(64 * 1024);
    const n = readSync(fd, buf, 0, buf.length, 0);
    if (buf.toString("latin1", 1, 4) === "PNG") return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    if (buf[0] === 0x47 && buf[1] === 0x49) return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
    if (buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") {
      const chunk = buf.toString("latin1", 12, 16);
      if (chunk === "VP8 ") return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
      if (chunk === "VP8L") { const b = buf.readUInt32LE(21); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; }
      if (chunk === "VP8X") return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let p = 2;
      while (p + 9 < n) {
        if (buf[p] !== 0xff) { p++; continue; }
        const marker = buf[p + 1];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [buf.readUInt16BE(p + 7), buf.readUInt16BE(p + 5)];
        p += 2 + buf.readUInt16BE(p + 2);
      }
    }
    return null;
  } catch { return null; } finally { closeSync(fd); }
}

const fmtBytes = (b) => b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;
const fmtDur = (s) => s == null ? "—" : s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/* ── walk ── */
function files(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(full));
    else out.push(full);
  }
  return out;
}

const groups = [];
const dirs = (d) => readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
for (const player of dirs(join(ROOT, "players"))) groups.push({ label: `players/${player}`, key: player, dir: join(ROOT, "players", player) });
groups.push({ label: "team", key: "team", dir: join(ROOT, "team") });
groups.push({ label: "inbox", key: "inbox", dir: join(ROOT, "inbox") });

const report = groups
  .filter((g) => !filter || g.key === filter || g.label.includes(filter))
  .map((g) => {
    const entries = files(g.dir).map((path) => {
      const ext = extname(path).toLowerCase();
      const st = statSync(path);
      const rel = relative(g.dir, path);
      const kind = VIDEO.has(ext) ? "video" : IMAGE.has(ext) ? "image" : "other";
      const seconds = kind === "video" ? mp4Duration(path) : null;
      const dims = kind === "image" ? imageSize(path) : null;
      return { file: rel, bucket: rel.split(/[\\/]/)[0], kind, bytes: st.size, seconds, width: dims?.[0] ?? null, height: dims?.[1] ?? null, modified: st.mtime.toISOString().slice(0, 10) };
    }).sort((a, b) => a.bucket.localeCompare(b.bucket) || a.file.localeCompare(b.file));
    return { group: g.label, count: entries.length, bytes: entries.reduce((s, e) => s + e.bytes, 0),
      seconds: entries.reduce((s, e) => s + (e.seconds ?? 0), 0), entries };
  });

if (json) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

const total = report.reduce((s, g) => s + g.count, 0);
console.log(`media/ — ${total} file${total === 1 ? "" : "s"}, ${fmtBytes(report.reduce((s, g) => s + g.bytes, 0))}, ${fmtDur(report.reduce((s, g) => s + g.seconds, 0))} of video\n`);
for (const g of report) {
  const buckets = ["b-roll", "highlights", "photos", "jerseys"].map((b) => [b, g.entries.filter((e) => e.bucket === b).length]).filter(([, n]) => n);
  console.log(`▸ ${g.group}  ${g.count ? `${g.count} files · ${fmtBytes(g.bytes)}${g.seconds ? ` · ${fmtDur(g.seconds)}` : ""}  (${buckets.map(([b, n]) => `${n} ${b}`).join(", ")})` : "empty"}`);
  for (const e of g.entries) {
    const meta = e.kind === "video" ? fmtDur(e.seconds) : e.width ? `${e.width}×${e.height}` : e.kind;
    console.log(`    ${e.file.padEnd(48)} ${fmtBytes(e.bytes).padStart(9)}  ${meta.padStart(9)}  ${e.modified}`);
  }
  console.log();
}
