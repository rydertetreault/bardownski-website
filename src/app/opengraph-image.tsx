import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Bardownski Hockey Club";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#06080e",
          position: "relative",
        }}
      >
        {/* Subtle radial glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle, rgba(200,16,46,0.08) 0%, transparent 60%)",
          }}
        />

        {/* Main text row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            position: "relative",
          }}
        >
          {/* Left red line */}
          <div
            style={{
              width: "80px",
              height: "3px",
              backgroundColor: "#cc1533",
              borderRadius: "4px",
            }}
          />

          {/* BARDOWNSKI */}
          <span
            style={{
              fontSize: "88px",
              fontWeight: 900,
              letterSpacing: "-1px",
              color: "#ffffff",
              fontFamily: "sans-serif",
            }}
          >
            BARDOWNSKI
          </span>

          {/* Right red line */}
          <div
            style={{
              width: "80px",
              height: "3px",
              backgroundColor: "#cc1533",
              borderRadius: "4px",
            }}
          />
        </div>

        {/* Subtitle */}
        <span
          style={{
            fontSize: "22px",
            fontWeight: 500,
            letterSpacing: "8px",
            color: "#cc1533",
            marginTop: "16px",
            fontFamily: "sans-serif",
          }}
        >
          HOCKEY CLUB
        </span>
      </div>
    ),
    { ...size }
  );
}
