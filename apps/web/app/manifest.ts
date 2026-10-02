import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ConnectMe - Omnichannel Team Inbox",
    short_name: "ConnectMe",
    description: "Unified team inbox for WhatsApp Business, Messenger, Instagram Direct, and Telegram.",
    start_url: "/inbox",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    categories: ["business", "productivity", "social"],
    shortcuts: [
      {
        name: "Open Inbox",
        short_name: "Inbox",
        description: "View and reply to customer conversations",
        url: "/inbox",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Scheduled Messages",
        short_name: "Scheduled",
        description: "View scheduled social posts and messages",
        url: "/scheduled",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Settings",
        short_name: "Settings",
        description: "Manage channel integrations and webhooks",
        url: "/settings",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
