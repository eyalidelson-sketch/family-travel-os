const FLAGS: Record<string, string> = {
  Japan: "🇯🇵",
  "South Korea": "🇰🇷",
  "United States": "🇺🇸",
  France: "🇫🇷",
  Italy: "🇮🇹",
  Spain: "🇪🇸",
  Thailand: "🇹🇭",
  "United Kingdom": "🇬🇧"
};

export function countryFlag(country?: string): string {
  if (!country) return "📍";
  return FLAGS[country] ?? "📍";
}

export function formatDuration(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatDateLong(iso: string, locale: "en" | "he" = "en"): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d));
  return date.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
