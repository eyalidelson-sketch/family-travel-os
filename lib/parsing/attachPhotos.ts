import type { ParsedTrip } from "../parsing-types";
import { fetchRealPhotosForQuery } from "../enrichment/photos";

/**
 * Automatic Real-Photo & Detail Resolution, applied as early as possible —
 * before the organizer has even confirmed the trip, and before any real
 * Place record exists to key a proper PlaceEnrichment cache entry off of
 * (see components/create/ReviewItinerary.tsx's itemThumb comment on why the
 * review screen can't use the normal Place-based enrichment path). This is a
 * lighter-weight, name-based pass over the exact same Google Places ->
 * Unsplash orchestrator (lib/enrichment/photos.ts) that already powers Food
 * Finder's restaurant covers, so the magazine-style preview shows real
 * photos too, not just deterministic gradient tiles, before the organizer
 * clicks "Create Family Trip".
 *
 * Purely additive and best-effort: every failure (no API keys configured,
 * a slow/broken provider, an unresolvable name) just leaves `photoUrl`
 * unset, and every call site already falls back to the same deterministic
 * tile it always has. A bonus: once the trip is actually created, the real
 * Place-based lookup (lib/enrichment/service.ts's getOrCreateEnrichment)
 * builds its query the same way — `"<name>, <city>"` — so for any place
 * that resolves cleanly this often reuses the very same cached photo
 * instead of hitting the provider twice.
 */
export async function attachRealPhotos(trip: ParsedTrip): Promise<ParsedTrip> {
  const cache = new Map<string, string | undefined>();

  async function lookup(query: string | undefined): Promise<string | undefined> {
    const trimmed = query?.trim();
    if (!trimmed) return undefined;
    const key = trimmed.toLowerCase();
    if (cache.has(key)) return cache.get(key);
    try {
      const result = await fetchRealPhotosForQuery(trimmed, 1);
      const url = result?.tiles[0]?.url;
      cache.set(key, url);
      return url;
    } catch (err) {
      console.error(`Review-screen real-photo lookup failed for "${trimmed}" (non-fatal):`, err);
      cache.set(key, undefined);
      return undefined;
    }
  }

  function joinQuery(name: string | undefined, cityHint: string | undefined): string | undefined {
    if (!name) return undefined;
    return [name, cityHint].filter(Boolean).join(", ");
  }

  const primaryCountry = trip.countries[0];
  const coverQuery = primaryCountry ? `${primaryCountry} travel` : trip.name;

  const [coverPhotoUrl, days] = await Promise.all([
    lookup(coverQuery),
    Promise.all(
      trip.days.map(async (day) => {
        const [dayPhotoUrl, hotel, items] = await Promise.all([
          lookup(day.cityHint),
          day.hotel
            ? lookup(joinQuery(day.hotel.placeName, day.hotel.cityHint ?? day.cityHint)).then((photoUrl) => ({ ...day.hotel!, photoUrl }))
            : Promise.resolve(undefined),
          Promise.all(
            day.items.map(async (item) => ({
              ...item,
              photoUrl: await lookup(joinQuery(item.placeName, item.cityHint ?? day.cityHint))
            }))
          )
        ]);
        return { ...day, photoUrl: dayPhotoUrl, hotel, items };
      })
    )
  ]);

  return { ...trip, coverPhotoUrl, days };
}
