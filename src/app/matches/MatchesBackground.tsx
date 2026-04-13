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

      {/* White neon streaks - two lines converging toward top-right */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1440 3000"
        preserveAspectRatio="none"
        style={{ filter: "blur(6px)" }}
      >
        {/* Lower line - from bottom-left */}
        <path d="M-200,2400 Q400,1800 800,1200 Q1200,500 1640,0" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="8" />
        {/* Upper line - from left side, converges with lower near top-right */}
        <path d="M-200,800 Q400,600 800,500 Q1200,300 1600,0" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="10" />
        {/* Dark red line - bottom-left to top-right */}
        <path d="M-200,2800 Q500,2000 900,1300 Q1300,600 1640,200" fill="none" stroke="#8b0a1e" strokeOpacity="0.12" strokeWidth="10" />
      </svg>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1440 3000"
        preserveAspectRatio="none"
        style={{ filter: "blur(1px)" }}
      >
        <path d="M-200,2400 Q400,1800 800,1200 Q1200,500 1640,0" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1.5" />
        <path d="M-200,800 Q400,600 800,500 Q1200,300 1600,0" fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1.5" />
        <path d="M-200,2800 Q500,2000 900,1300 Q1300,600 1640,200" fill="none" stroke="#8b0a1e" strokeOpacity="0.18" strokeWidth="1.5" />
      </svg>

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
