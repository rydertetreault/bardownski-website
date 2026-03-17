"use client";

export default function GalleryBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ backgroundColor: "#06080e" }}
    >
      {/* ── Blob 1: Powder blue — top left (static) ── */}
      <div
        style={{
          position: "absolute",
          top: "-12%",
          left: "-8%",
          width: "720px",
          height: "720px",
          background: "radial-gradient(circle, rgba(125,211,252,0.28) 0%, transparent 68%)",
          filter: "blur(88px)",
        }}
      />

      {/* ── Blob 2: Red — bottom right (static) ── */}
      <div
        style={{
          position: "absolute",
          bottom: "-8%",
          right: "-6%",
          width: "680px",
          height: "680px",
          background: "radial-gradient(circle, rgba(255,28,58,0.24) 0%, transparent 68%)",
          filter: "blur(96px)",
        }}
      />

      {/* ── Scanlines ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(255,255,255,0.014) 3px, rgba(255,255,255,0.014) 4px)",
        }}
      />

      {/* ── Glitch strip A — powder blue ── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "21%",
          height: "2px",
          backgroundColor: "rgba(125,211,252,0.85)",
          boxShadow: "0 0 10px rgba(125,211,252,0.6), 0 0 24px rgba(125,211,252,0.3)",
          opacity: 0,
          animation: "gallery-glitch-a 9s linear infinite",
        }}
      />

      {/* ── Glitch strip B — bright red ── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "57%",
          height: "2px",
          backgroundColor: "rgba(255,40,70,0.9)",
          boxShadow: "0 0 10px rgba(255,40,70,0.65), 0 0 24px rgba(255,40,70,0.3)",
          opacity: 0,
          animation: "gallery-glitch-b 13s linear infinite 2.5s",
        }}
      />

      {/* ── Glitch strip C — light powder blue ── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "79%",
          height: "3px",
          backgroundColor: "rgba(186,230,253,0.75)",
          boxShadow: "0 0 12px rgba(186,230,253,0.55), 0 0 28px rgba(186,230,253,0.25)",
          opacity: 0,
          animation: "gallery-glitch-c 7s linear infinite 5s",
        }}
      />

      {/* ── Subtle center vignette so cards read clearly ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </div>
  );
}
