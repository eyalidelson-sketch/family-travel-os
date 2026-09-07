import type { Place } from "../types";
import type { CityBlock } from "../trip-blocks";
import type { RouteMapStopInput } from "./layout";

export interface RouteWaypoint extends RouteMapStopInput {
  placeId?: string;
  place?: Place;
  /** true for a city/hotel anchor stop (one per CityBlock, same granularity the Full Trip tab groups by); false for a notable in-city highlight surfaced from that block's own itinerary items. */
  isAnchor: boolean;
  /** Index into the `blocks` array this waypoint belongs to. A gap between two waypoints whose blockIndex differs is a real between-city leg (candidate for a transport connector); a gap within the same blockIndex is just movement around one city stay, and deliberately gets no connector icon. */
  blockIndex: number;
}

const HIGHLIGHT_CATEGORIES = new Set<Place["category"]>(["attraction", "neighborhood"]);

/**
 * The Route Map originally showed exactly one pin per CityBlock (one per
 * city/hotel stay) — reusing groupIntoCityBlocks as-is, so a 15-day, 9-city
 * trip only ever drew ~9 stops. Real organizer documents name a lot more
 * than that: Furano's own day mentions Biei, Shirogane Blue Pond and
 * Shirahige Falls by name; a Tokyo stay's schedule walks through Harajuku,
 * Shibuya, Asakusa, Tsukiji, Ginza, Roppongi. Those are exactly the
 * gazetteer-tagged "attraction"/"neighborhood" places the new table-aware
 * heuristic parser (lib/ai/heuristicParser.ts) already attaches to each
 * schedule item — so this walks every block's days/items in order and
 * inserts one extra waypoint per distinct notable place mentioned, right
 * after that block's own city/hotel anchor. Categories like "hotel",
 * "restaurant", "station", "airport" and "other" are left off the map as
 * separate pins (too dense, or already implied by the anchor/connector) so
 * the result reads as a real day-by-day sightseeing route rather than a
 * cluttered pin-per-item map.
 *
 * The output stays a flat, sequential array — exactly what lib/map/layout.ts
 * already expects — so nothing downstream needs to know "anchor" vs
 * "highlight" exist; only page.tsx's connector-building step cares, via
 * blockIndex.
 */
export function buildRouteWaypoints(blocks: CityBlock[]): RouteWaypoint[] {
  const waypoints: RouteWaypoint[] = [];
  const seenPlaceIds = new Set<string>();

  blocks.forEach((block, blockIndex) => {
    const anchorPlace = block.days[0]?.city;
    waypoints.push({
      key: block.cityPlaceId ?? `stop-${blockIndex}`,
      placeId: block.cityPlaceId,
      place: anchorPlace,
      cityName: block.cityName,
      country: block.country,
      lat: anchorPlace?.lat,
      lng: anchorPlace?.lng,
      startDate: block.startDate,
      endDate: block.endDate,
      isAnchor: true,
      blockIndex
    });
    if (block.cityPlaceId) seenPlaceIds.add(block.cityPlaceId);

    for (const day of block.days) {
      for (const item of day.items) {
        const place = item.place;
        // geocodeSource === "external_api" means this came from a curated
        // KNOWN_PLACES match (lib/providers/places.ts) via the gazetteer —
        // real coordinates, a trustworthy category, a real place. Without
        // this check, a plain pasted-text itinerary (the OLDER, non-tabular
        // input shape this parser still supports) would turn nearly every
        // activity line into its own map pin: guessPlaceName() is a
        // deliberately loose fallback that echoes almost the whole line back
        // as a "place name" whenever no table/gazetteer match applies, and
        // unresolved names default to category "neighborhood" — exactly the
        // category this function surfaces as a highlight. Requiring a
        // verified geocode keeps the map's extra stops to genuine named
        // sights instead of one pin per sentence.
        if (!place || seenPlaceIds.has(place.id) || place.geocodeSource !== "external_api" || !HIGHLIGHT_CATEGORIES.has(place.category)) continue;
        seenPlaceIds.add(place.id);
        waypoints.push({
          key: item.id,
          placeId: place.id,
          place,
          cityName: place.canonicalName,
          country: place.country,
          lat: place.lat,
          lng: place.lng,
          startDate: day.date,
          endDate: day.date,
          isAnchor: false,
          blockIndex
        });
      }
    }
  });

  return waypoints;
}
