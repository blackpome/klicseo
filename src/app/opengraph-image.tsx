import { ImageResponse } from "next/og";
import { businessName, homeDescription, primaryCity } from "@/lib/seo";

export const runtime = "edge";
export const alt = `${businessName} — Doorstep Car Wash in ${primaryCity}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(ellipse 70% 70% at 30% 20%, #1A5FD4 0%, #050E21 60%, #020616 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "0.04em",
              color: "#C9A84C",
            }}
          >
            KLICSEO
          </div>
          <div
            style={{
              height: 28,
              width: 1,
              background: "rgba(255,255,255,0.25)",
            }}
          />
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.7)" }}>
            Premium Car Care, Delivered.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 78,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 1040,
            }}
          >
            Doorstep Car Wash & Detailing in {primaryCity}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.7)",
              maxWidth: 980,
              lineHeight: 1.35,
            }}
          >
            {homeDescription}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <div>klicseo.com</div>
          <div style={{ color: "#C9A84C" }}>★ 4.9 · 480+ reviews</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
