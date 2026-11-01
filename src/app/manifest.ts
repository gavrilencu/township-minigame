import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Djesi Jewels",
    short_name: "Djesi Jewels",
    description: "Joc de potrivit bomboane cu nivele infinite.",
    start_url: "/",
    scope: "/",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    orientation: "landscape",
    background_color: "#1b1035",
    theme_color: "#1b1035",
    categories: ["games"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
