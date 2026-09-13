"use client";

export default function GalleryBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ backgroundColor: "#0b0c0d" }}
    >
      {/* ── Blob 1: Powder blue — top left (no filter blur, baked into gradient) ── */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-15%",
          width: "900px",
          height: "900px",
          background: "radial-gradient(circle, rgba(104,200,206,0.18) 0%, transparent 50%)",
        }}
      />

      {/* ── Blob 2: Red — bottom right (no filter blur, baked into gradient) ── */}
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          right: "-12%",
          width: "850px",
          height: "850px",
          background: "radial-gradient(circle, rgba(89, 36, 118,0.25) 0%, transparent 50%)",
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
