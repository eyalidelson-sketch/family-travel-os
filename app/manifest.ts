import type { MetadataRoute } from "next";

// icons was previously an empty array — harmless for the manifest to parse,
// but it meant "Add to Home Screen" on Android had no real icon to show
// (falling back to a generic screenshot-crop or blank tile instead of a
// proper app icon). The three files below are real PNGs (public/icons/,
// generated at build time from a simple "T" monogram in the app's own
// navy/amber palette — see the repo's icon-generation note in README) — a
// 192 and a 512 "any"-purpose icon for the home-screen/launcher icon
// itself, plus a dedicated maskable 512 whose glyph sits inside the safe
// zone Android crops maskable icons to (a circle or squircle, depending on
// the device's launcher theme).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family Travel OS",
    short_name: "TravelOS",
    description: "Your itinerary, brought to life.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f7",
    theme_color: "#1c2340",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
