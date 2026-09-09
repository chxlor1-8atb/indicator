import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aegis AI Signal Trade - 5 Core Pillars",
    short_name: "Aegis AI",
    description: "AI Signal Trade & Real-Time Financial Confluence Platform with Instant Telegram Alerts",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#4f46e5",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
