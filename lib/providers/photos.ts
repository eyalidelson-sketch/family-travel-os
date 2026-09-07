import type { ItineraryItemType, Place } from "../types";

// No photo API is configured, and pretending to have real photos of a place
// would be worse than not having any — so this generates a small set of
// deterministic, category-tinted cover tiles instead. They're honestly
// decorative (never claimed to be real photos), need no network call, and
// are the exact seam a real PhotosProvider (Google Places photos, Unsplash)
// would occupy later — see the plan's §08.
//
// `tileForSeed`/the hue tables are exported directly so screens that don't
// have a resolved Place yet — the Create Trip review screen (only has raw
// place-name strings), a generic itinerary-item card with no placeId — can
// still render a consistent, deterministic cover image instead of falling
// back to a plain background.

export const CATEGORY_HUES: Record<Place["category"], number> = {
  hotel: 258,
  attraction: 42,
  restaurant: 18,
  station: 200,
  airport: 200,
  neighborhood: 152,
  other: 260
};

export const ITEM_TYPE_HUES: Record<ItineraryItemType, number> = {
  activity: 42,
  meal: 18,
  transport: 200,
  note: 152,
  free_time: 280
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function tileSvg(seed: string, hue: number, variant: number): string {
  const h1 = (hue + variant * 24) % 360;
  const h2 = (h1 + 40) % 360;
  const angle = 45 + ((hashString(seed + variant) % 90) - 45);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
    <defs>
      <linearGradient id="g" gradientTransform="rotate(${angle})">
        <stop offset="0%" stop-color="hsl(${h1} 55% 42%)" />
        <stop offset="100%" stop-color="hsl(${h2} 60% 28%)" />
      </linearGradient>
    </defs>
    <rect width="480" height="480" fill="url(#g)" />
    <circle cx="${80 + (hashString(seed) % 300)}" cy="${60 + (variant * 90)}" r="140" fill="white" opacity="0.06" />
    <circle cx="${320 - (hashString(seed + "b") % 260)}" cy="${380 - (variant * 60)}" r="110" fill="white" opacity="0.05" />
  </svg>`;
  // IMPORTANT: this must be base64, not `;utf8,${encodeURIComponent(svg)}`.
  // encodeURIComponent deliberately leaves `(` and `)` unescaped, and this
  // SVG contains plenty of them (url(#g), rotate(...)) — embedded in a CSS
  // `background-image: url(...)`, those bare parentheses prematurely close
  // the *outer* url() wrapper and truncate the value, so the image silently
  // fails to load and only the gradient overlay div is visible (which reads
  // as "blank grey cards"). Base64 has no characters that are special to
  // CSS/URLs, so this class of bug can't happen. btoa (not Buffer) is used
  // so this also works when called from client components in the browser —
  // safe here because the SVG markup itself is always plain ASCII (seeds are
  // only ever hashed into numbers, never embedded as literal text).
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/** The one place every deterministic cover tile in the app is generated from. */
export function tileForSeed(seed: string, hue: number, variant = 0): string {
  return tileSvg(seed, hue, variant);
}

/** A tile keyed off a raw name string + item type — for cards that don't have a resolved Place yet. */
export function tileForItemType(seed: string, type: ItineraryItemType, variant = 0): string {
  return tileForSeed(seed, ITEM_TYPE_HUES[type], variant);
}

/** A tile keyed off a raw city/place name string — for the Create Trip preview, before any Place exists. */
export function tileForName(seed: string, variant = 0): string {
  return tileForSeed(seed, 200 + (hashString(seed) % 120), variant);
}

export interface PhotoTile {
  url: string;
  alt: string;
}

export interface PhotosProvider {
  resolve(place: Place): Promise<PhotoTile[]>;
  cover(place: Place): string;
}

export class PlaceholderPhotosProvider implements PhotosProvider {
  async resolve(place: Place): Promise<PhotoTile[]> {
    const hue = CATEGORY_HUES[place.category] ?? 260;
    return [0, 1, 2].map((i) => ({
      url: tileForSeed(place.id, hue, i),
      alt: `${place.canonicalName} — illustrative cover art`
    }));
  }

  /** A single cover tile — for card thumbnails that don't need the full gallery. */
  cover(place: Place): string {
    const hue = CATEGORY_HUES[place.category] ?? 260;
    return tileForSeed(place.id, hue, 0);
  }
}

export const photosProvider: PhotosProvider = new PlaceholderPhotosProvider();
