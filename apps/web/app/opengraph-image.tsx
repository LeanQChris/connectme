import { ImageResponse } from "next/og";

export const alt = "ConnectMe: every customer message, in one queue";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RAIL = [
  "#52b585",
  "#4a8bd8",
  "#c56b93",
  "#52a0c7",
  "#7179cf",
] as const;

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        {/* Spectrum rail, matching the site's signature device */}
        <div
          style={{
            display: "flex",
            height: 8,
            width: "100%",
            background: `linear-gradient(90deg, ${RAIL.join(", ")})`,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flexGrow: 1,
            padding: "72px 80px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "#171717",
                color: "#ffffff",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              C
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: "#171717" }}>
              ConnectMe
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div
              style={{
                display: "flex",
                fontSize: 68,
                fontWeight: 600,
                letterSpacing: "-0.035em",
                lineHeight: 1.05,
                color: "#171717",
                maxWidth: 900,
              }}
            >
              Every customer message, in one queue.
            </div>

            <div style={{ display: "flex", fontSize: 28, color: "#4d4d4d", maxWidth: 880 }}>
              WhatsApp, Messenger, Instagram, Telegram and Discord in one agent inbox.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {RAIL.map((color) => (
              <div
                key={color}
                style={{ display: "flex", width: 44, height: 8, borderRadius: 4, background: color }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}