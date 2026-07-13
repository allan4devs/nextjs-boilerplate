import { ImageResponse } from "next/og";

export const alt = "Xtreme Gym — Gimnasio en Ciudad Quesada, San Carlos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#070707",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 220,
            height: 14,
            backgroundColor: "#f6c400",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 132,
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: -4,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            Xtreme Gym
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 44,
              fontWeight: 700,
              color: "#f6c400",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Ciudad Quesada · San Carlos
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 32,
            fontWeight: 600,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <div style={{ display: "flex" }}>Primer día gratis</div>
          <div style={{ display: "flex" }}>Lunes a viernes · 5 AM - 10 PM</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
