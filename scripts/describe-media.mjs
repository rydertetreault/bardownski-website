#!/usr/bin/env node
// Describe a video (or image) with an OpenRouter vision model by sampling frames
// into one contact sheet. Used to write real titles/alt text for club media.
//
//   FFMPEG=/path/to/ffmpeg node scripts/describe-media.mjs <file> [--frames 8]
//        [--context "who/what this is"] [--ask "custom question"] [--model google/gemini-2.5-pro]
//        [--sheet /tmp/sheet.jpg] [--sheet-mode]
//
// Videos are sent WHOLE to Gemini (it watches the clip; far more accurate than stills).
// Files over ~18 MB are shrunk to a 480p proxy first. --sheet-mode (or a non-Gemini
// model) falls back to a contact sheet of --frames stills.
//
// Key: OPENROUTER_API_KEY, else ~/.synaps-cli/auth.json -> openrouter.key (never printed).
// ffmpeg: FFMPEG env, else `ffmpeg` on PATH. One option: uv run --with imageio-ffmpeg
//   python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, extname } from "node:path";

const args = process.argv.slice(2);
const file = args[0];
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
if (!file) { console.error("usage: node scripts/describe-media.mjs <file> [--frames N] [--context text] [--ask text]"); process.exit(2); }
const ff = process.env.FFMPEG || "ffmpeg";
const key = process.env.OPENROUTER_API_KEY || (() => { try { return JSON.parse(readFileSync(join(homedir(), ".synaps-cli/auth.json"), "utf8")).openrouter?.key; } catch { return null; } })();
if (!key) throw new Error("No OpenRouter key");

const dir = mkdtempSync(join(tmpdir(), "describe-"));
try {
  const isImage = /\.(png|jpe?g|webp)$/i.test(extname(file));
  const model = opt("model", "google/gemini-2.5-pro");
  const native = !isImage && model.startsWith("google/") && !args.includes("--sheet-mode");
  const sheet = opt("sheet", join(dir, "sheet.jpg"));
  const frames = Number(opt("frames", 8));
  let duration = 0;
  let media;
  if (native) {
    let src = file;
    const { statSync } = await import("node:fs");
    if (statSync(file).size > 18e6) {
      src = join(dir, "proxy.mp4");
      execFileSync(ff, ["-loglevel", "error", "-y", "-i", file, "-vf", "scale=-2:480", "-c:v", "libx264", "-preset", "veryfast",
        "-crf", "30", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", src]);
    }
    media = { type: "video_url", video_url: { url: `data:video/mp4;base64,${readFileSync(src).toString("base64")}` } };
  } else if (isImage) {
    execFileSync(ff, ["-loglevel", "error", "-y", "-i", file, "-vf", "scale=1280:-2", "-q:v", "3", sheet]);
  } else {
    const probe = (() => { try { execFileSync(ff, ["-hide_banner", "-i", file], { stdio: "pipe" }); return ""; } catch (e) { return String(e.stderr); } })();
    const m = probe.match(/Duration: (\d+):(\d+):([\d.]+)/);
    duration = m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
    if (!duration) throw new Error("Could not read duration");
    const cols = frames <= 4 ? frames : 4, rows = Math.ceil(frames / cols);
    const fps = frames / duration;
    execFileSync(ff, ["-loglevel", "error", "-y", "-i", file, "-vf",
      `fps=${fps},scale=480:-2,tile=${cols}x${rows}:padding=4:color=white`,
      "-frames:v", "1", "-q:v", "3", sheet]);
  }
  if (!media) media = { type: "image_url", image_url: { url: `data:image/jpeg;base64,${readFileSync(sheet).toString("base64")}` } };
  const ask = opt("ask", `This is a ${isImage ? "still image" : native ? "hockey video clip (EA NHL video game); watch all of it" : `contact sheet of ${frames} frames sampled evenly from a ${duration.toFixed(1)}s hockey video clip (EA NHL video game), in time order left-to-right, top-to-bottom`}. ${opt("context", "")}
Describe concretely what happens: the play (goal, save, deke, hit, celebration, replay), who is in frame, jersey colours, the rink/setting, and any on-screen text (scores, names, titles). Then propose 3 short, specific, non-generic titles (max 6 words each). Be factual; say "unclear" rather than guessing.`);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: [{ type: "text", text: ask }, media] }] }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${body.error?.message ?? "request failed"}`);
  console.log(body.choices?.[0]?.message?.content ?? "(no content)");
} finally { rmSync(dir, { recursive: true, force: true }); }
