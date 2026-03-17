"use client";

export default function NewsBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ backgroundColor: "#0b0f1a" }}
    >
      {/* Diagonal BARDOWNSKI text watermark */}
      <div
        style={{
          position: "absolute",
          inset: "-50%",
          transform: "rotate(-25deg)",
          display: "flex",
          flexDirection: "column",
          gap: "2.8rem",
        }}
      >
        {Array.from({ length: 22 }).map((_, i) => (
          <div
            key={i}
            style={{
              whiteSpace: "nowrap",
              fontSize: "13px",
              fontWeight: 900,
              letterSpacing: "0.5em",
              color: "rgba(255,255,255,0.022)",
              userSelect: "none",
            }}
          >
            {"BARDOWNSKI · BARDOWNSKI · BARDOWNSKI · BARDOWNSKI · BARDOWNSKI · BARDOWNSKI · BARDOWNSKI · BARDOWNSKI · BARDOWNSKI · BARDOWNSKI · BARDOWNSKI · "}
          </div>
        ))}
      </div>

      {/* Red glow — top right */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          right: "-10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(200,16,46,0.12) 0%, transparent 65%)",
          filter: "blur(80px)",
        }}
      />

      {/* Navy glow — bottom left */}
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-8%",
          width: "520px",
          height: "520px",
          background: "radial-gradient(circle, rgba(27,42,74,0.45) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      {/* Scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)",
        }}
      />
    </div>
  );
}
