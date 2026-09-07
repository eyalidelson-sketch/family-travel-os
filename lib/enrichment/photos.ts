import type { Place } from "../types";
import type { PhotoTile } from "../providers/photos";
import { searchGooglePlacePhotos, buildGooglePhotoProxyUrl } from "../providers/photoSources/googlePlaces";
import { fetchUnsplashPhotos } from "../providers/photoSources/unsplash";
import { fetchWikipediaSummary } from "../providers/photoSources/wikipedia";
import { sanitizeQueryName } from "../parsing/textCleanup";

export interface RealPhotoResult {
  tiles: PhotoTile[];
  source: "google_places" | "unsplash" | "wikipedia";
}

// Query-based lookups (Food Finder's restaurants — no Place record to key a
// shared PlaceEnrichment cache off) don't have a persistent store behind
// them, so this module keeps its own in-memory TTL cache to avoid re-hitting
// Google/Unsplash on every page load. Resets on server restart, same as the
// rest of this demo's in-memory repository — a real deployment would put
// this behind the same shared store as PlaceEnrichment.
const QUERY_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const queryCache = new Map<string, { result: RealPhotoResult | null; expiresAt: number }>();

/**
 * The single orchestrator every real-photo call site goes through: Google
 * Places first (richer — actual venue photos when the venue is findable and
 * GOOGLE_PLACES_API_KEY is configured), then Wikipedia (a real, specific
 * photo of the place itself — genuinely free, no key or account required at
 * all, so this is what actually gives a real photo with zero setup instead
 * of only a deterministic placeholder tile), then Unsplash (generic but
 * broadly available editorial photography, if UNSPLASH_ACCESS_KEY is set),
 * then null so the caller falls back to the placeholder tile. Google/
 * Unsplash are skipped entirely without their key; Wikipedia is always
 * tried since it needs none — none of the three ever throws, a slow/broken
 * source just degrades to the next one.
 */
export async function fetchRealPhotosForQuery(rawQuery: string, count = 3): Promise<RealPhotoResult | null> {
  // Defense-in-depth: the heuristic parser (lib/ai/heuristicParser.ts) never
  // hands a place/hotel name with table markers or "OVERNIGHT/TRANSPORT/DAY
  // TYPE" noise to this function any more, but this is the one choke point
  // every real-photo lookup in the app goes through, so a last-resort clean
  // is cheap insurance against any other caller passing through raw text.
  const query = sanitizeQueryName(rawQuery);
  if (!query) return null;

  const cacheKey = `${query}::${count}`;
  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  let result: RealPhotoResult | null = null;

  const googleRefs = await searchGooglePlacePhotos(query, count);
  if (googleRefs && googleRefs.length > 0) {
    result = {
      tiles: googleRefs.map((ref) => ({ url: buildGooglePhotoProxyUrl(ref.name), alt: query })),
      source: "google_places"
    };
  } else {
    const wiki = await fetchWikipediaSummary(query, "en");
    if (wiki?.thumbnailUrl) {
      result = { tiles: [{ url: wiki.thumbnailUrl, alt: wiki.title }], source: "wikipedia" };
    } else {
      const unsplashPhotos = await fetchUnsplashPhotos(query, count);
      if (unsplashPhotos && unsplashPhotos.length > 0) {
        result = {
          tiles: unsplashPhotos.map((p) => ({ url: p.url, alt: p.alt })),
          source: "unsplash"
        };
      }
    }
  }

  queryCache.set(cacheKey, { result, expiresAt: Date.now() + QUERY_CACHE_TTL_MS });
  return result;
}

/** Builds the search query the same way for every Place-based lookup, so caching keys stay predictable. */
export async function fetchRealPhotos(place: Place, count = 3): Promise<RealPhotoResult | null> {
  const query = [place.canonicalName, place.city].filter(Boolean).join(", ");
  return fetchRealPhotosForQuery(query, count);
}
