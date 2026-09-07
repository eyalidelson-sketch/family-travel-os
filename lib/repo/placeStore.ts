import type { Place, PlaceEnrichment } from "../types";

// Place and PlaceEnrichment live outside TripRepository on purpose — see the
// plan's §01: a place is resolved and enriched once, then reused by every
// trip that mentions it, rather than re-fetched per trip. Kept on
// `globalThis` for the same dev-hot-reload-survival reason as the trip
// store in memory.ts.

interface PlaceStore {
  places: Map<string, Place>;
  enrichments: Map<string, PlaceEnrichment>;
}

function fresh(): PlaceStore {
  return { places: new Map(), enrichments: new Map() };
}

const globalForPlaces = globalThis as unknown as { __travelOsPlaceStore?: PlaceStore };
const placeStore = globalForPlaces.__travelOsPlaceStore ?? fresh();
globalForPlaces.__travelOsPlaceStore = placeStore;

export const places = placeStore.places;
export const enrichments = placeStore.enrichments;
