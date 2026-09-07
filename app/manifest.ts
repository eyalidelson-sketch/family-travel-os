import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family Travel OS",
    short_name: "TravelOS",
    description: "Your itinerary, brought to life.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f7",
    theme_color: "#1c2340",
    icons: []
  };
}
