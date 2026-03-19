/**
 * Static background for the Records page.
 * Matches the homepage hero style — dark base, diagonal slash accents, subtle glows.
 * No animations, no canvas, no JS.
 */
export default function RecordsBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ backgroundColor: "#0b0f1a" }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />

      {/* Diagonal slash accents — blue left, red right */}
      <svg
        className="absolute -left-16 top-0 h-full w-[55%] opacity-[0.06]"
        viewBox="0 0 400 900"
        preserveAspectRatio="none"
      >
        <polygon points="100,0 180,0 60,900 -20,900" fill="#5b9bd5" />
      </svg>
      <svg
        className="absolute -right-16 top-0 h-full w-[55%] opacity-[0.08]"
        viewBox="0 0 400 900"
        preserveAspectRatio="none"
      >
        <polygon points="300,0 400,0 320,900 220,900" fill="#cc1533" />
      </svg>

      {/* Subtle red glow — top */}
      <div
        className="absolute"
        style={{
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "800px",
          height: "500px",
          background:
            "radial-gradient(ellipse at center, rgba(200,16,46,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Subtle blue glow — bottom */}
      <div
        className="absolute"
        style={{
          bottom: "-5%",
          right: "10%",
          width: "600px",
          height: "400px",
          background:
            "radial-gradient(ellipse at center, rgba(91,155,213,0.03) 0%, transparent 70%)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </div>
  );
}
