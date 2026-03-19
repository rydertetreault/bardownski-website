/**
 * Lightweight static background for the Matches page.
 * Matches the stats page pattern: pure CSS gradients, zero JS, zero blur.
 */
export default function MatchesBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -1 }}>
      {/* Base */}
      <div className="absolute inset-0" style={{ backgroundColor: "#070a12" }} />

      {/* Subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Ice rink markings */}
      <div className="absolute inset-0" style={{ opacity: 0.025 }}>
        <div
          className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2"
          style={{
            width: "3px",
            background:
              "repeating-linear-gradient(to bottom, #c8102e 0px, #c8102e 20px, transparent 20px, transparent 30px)",
          }}
        />
        <div className="absolute top-0 bottom-0 bg-blue-400" style={{ left: "33%", width: "2px" }} />
        <div className="absolute top-0 bottom-0 bg-blue-400" style={{ left: "67%", width: "2px" }} />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red"
          style={{ width: "200px", height: "200px" }}
        />
      </div>

      {/* Top accent glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 30% 0%, rgba(200,16,46,0.04) 0%, transparent 70%), radial-gradient(ellipse 50% 35% at 70% 0%, rgba(91,155,213,0.03) 0%, transparent 70%)",
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
