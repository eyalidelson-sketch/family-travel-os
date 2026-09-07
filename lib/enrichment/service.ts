import type { Place, PlaceEnrichment, PlaceEnrichmentPracticalInfo } from "../types";
import type { Locale } from "../i18n/locale";
import { placeRepo } from "../repo/placeRepo";
import { enrichPlaceWithClaude } from "../ai/enrichPlace";
import type { EnrichmentFromAI } from "../ai/enrichSchema";
import { getCuratedEnrichment } from "./curated";
import { fetchRealPhotos } from "./photos";
import { fetchWikipediaSummary } from "../providers/photoSources/wikipedia";
import { DEMO_PLACE_PHOTOS } from "../demo";

function practicalInfoHeFrom(ai: EnrichmentFromAI): PlaceEnrichmentPracticalInfo | undefined {
  const he: PlaceEnrichmentPracticalInfo = {
    whatToDo: ai.whatToDoHe,
    nearestStation: ai.nearestStationHe,
    amenities: ai.amenitiesHe,
    familyTips: ai.familyTipsHe,
    openingHours: ai.openingHoursHe,
    estimatedCost: ai.estimatedCostHe,
    familyAccessibility: ai.familyAccessibilityHe
  };
  // checkIn/checkOut are just times — no Hebrew twin needed, they carry over as-is via practicalInfo.
  return Object.values(he).some((v) => v !== undefined) ? he : undefined;
}

const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days — matches db/schema.sql's default

// Dynamic Category-Based Practical Tips: every category below gets a real,
// structured practicalInfo block (visit-length guidance, a family/stroller
// tip, an accessibility note) even when there's no Claude key configured and
// no curated entry for this specific place — e.g. any place resolved from an
// imported document like a real Hokkaido/Tokyo itinerary. The wording stays
// honestly generic (never a specific fact we don't actually know), but it's
// always *something* — no card falls through to a bare one-line description
// with an empty "Useful information" section. Hebrew counterparts live in
// lib/i18n/placeContentHe.ts (GENERIC_FAMILY_TIPS_HE / GENERIC_ACCESSIBILITY_HE)
// — keep all category tables here in sync with the ones there.
const GENERIC_VISIT_MINUTES: Partial<Record<Place["category"], number>> = {
  attraction: 90,
  restaurant: 60,
  station: 20,
  airport: 120,
  neighborhood: 90
};

const GENERIC_FAMILY_TIPS: Record<Place["category"], string> = {
  hotel: "Ask at check-in about connecting rooms, a crib, or an extra bed — worth asking even if it wasn't offered when booking.",
  attraction: "Check for a family or child ticket price at the entrance — it's often not shown on the general listing.",
  restaurant: "Call ahead or ask on arrival about a kids' menu or high chairs if you need either.",
  station: "Build in a few extra minutes to find the right platform or exit — station signage varies a lot by country.",
  airport: "Arrive with extra buffer for security and check-in, especially with strollers, car seats, or a lot of luggage.",
  neighborhood: "A good area to just wander — pick one or two anchor points rather than planning it minute by minute.",
  other: "Worth a quick search closer to your visit date so you know what to expect."
};

const GENERIC_ACCESSIBILITY: Record<Place["category"], string> = {
  hotel: "Confirm step-free access to your specific room when booking if anyone in your group uses a wheelchair or a stroller indoors — elevators are standard, but room-level access varies.",
  attraction: "Terrain and stairs vary a lot by site — worth a quick check of the venue's own accessibility page before committing a stroller or wheelchair to the visit.",
  restaurant: "Most sit-down restaurants can seat a stroller at the table; call ahead if the space looks very small or the entrance has steps.",
  station: "Larger stations usually have elevators, but not every platform does — check signage or ask staff if you're traveling with a stroller or heavy luggage.",
  airport: "Airports are generally stroller- and wheelchair-friendly throughout, with assistance available on request at check-in.",
  neighborhood: "Sidewalks and crowding vary block by block — a carrier or sling can be more practical than a stroller in the busiest stretches.",
  other: "No specific accessibility details yet — worth checking ahead if step-free access matters for your group."
};

const CATEGORY_LABEL: Record<Place["category"], string> = {
  hotel: "hotel",
  attraction: "attraction",
  restaurant: "restaurant",
  station: "transit station",
  airport: "airport",
  neighborhood: "neighborhood",
  other: "place"
};

const CATEGORY_NUDGE: Record<Place["category"], string> = {
  hotel: "Check the booking confirmation for exact amenities and check-in/check-out times.",
  attraction: "Worth a quick search for current opening hours and ticket prices before you go.",
  restaurant: "Worth checking current hours, or booking ahead if it looks popular.",
  station: "Signage and platform layout vary by station — build in a few extra minutes to find the right one.",
  airport: "Check your airline's terminal and check-in-window guidance before you head over.",
  neighborhood: "A good area to explore on foot — pick one or two anchor points rather than planning it minute by minute.",
  other: "Worth a quick search closer to your visit date so you know what to expect."
};

const CATEGORY_WHAT_TO_DO: Record<Place["category"], string> = {
  hotel: "Settle in, then ask the front desk for their own nearby recommendations — they usually know the best quick options within walking distance.",
  attraction: "Give yourself time to look around at an easy pace; check on arrival whether there's a suggested route or a highlight not to miss.",
  restaurant: "Ask what's fresh or seasonal today rather than ordering blind from a fixed idea of the menu.",
  station: "Follow signage to your platform or exit — station staff can point you the right way if it's unclear.",
  airport: "Head toward security once you're checked in, and use any extra time for a meal or a last errand.",
  neighborhood: "Wander at your own pace — a neighborhood like this rewards a slow walk more than a fixed checklist.",
  other: "Take a look around and get your bearings before deciding how long to spend here."
};

/**
 * Builds an honest but genuinely useful sentence from the one thing every
 * Place always has — its own name, category, and city/country — instead of
 * a flat "we don't know anything about this yet" placeholder. This never
 * invents a fact about the specific place (no opening hours, no prices, no
 * history) — it just says plainly what kind of place this is and where,
 * plus one practical nudge appropriate to that category. Real, specific
 * detail still only ever comes from Claude or a curated entry; this is what
 * a card shows in between those, so no card is ever a bare, discouraging
 * "no information" line.
 */
function genericDescription(place: Place): string {
  const location = [place.city, place.country].filter(Boolean).join(", ");
  const base = `${place.canonicalName} is a ${CATEGORY_LABEL[place.category]}${location ? ` in ${location}` : ""}.`;
  return `${base} ${CATEGORY_NUDGE[place.category]}`;
}

function genericWhatToDo(place: Place): string {
  return `${CATEGORY_WHAT_TO_DO[place.category]}`;
}

function genericFallback(place: Place): Omit<PlaceEnrichment, "placeId" | "fetchedAt" | "staleAfter"> {
  return {
    description: genericDescription(place),
    photos: [],
    practicalInfo: {
      whatToDo: genericWhatToDo(place),
      estimatedVisitMinutes: GENERIC_VISIT_MINUTES[place.category],
      familyTips: GENERIC_FAMILY_TIPS[place.category],
      familyAccessibility: GENERIC_ACCESSIBILITY[place.category]
    },
    source: "ai_generated",
    textOrigin: "generic"
  };
}

/**
 * The free, no-API-key middle rung between Claude and the generic category
 * sentence: Wikipedia's own opening paragraph about the place itself,
 * fetched with zero configuration (see lib/providers/photoSources/wikipedia.ts).
 * This is what makes "Furano" or "Shirogane Blue Pond" — or any real,
 * notable place a Claude key wasn't configured to describe — show genuine,
 * specific content instead of the honest-but-generic category sentence, the
 * same "just ask about the place" result a person gets by searching it
 * themselves. Returns null (never throws) when Wikipedia has no article for
 * this query at all — the common case for a specific hotel or restaurant —
 * so the caller falls through to the curated/generic path exactly as if
 * this step didn't exist.
 *
 * practicalInfo still comes from the same category tables genericFallback
 * uses — Wikipedia has no opinion on stroller access or a kids' menu, only
 * the description itself is real, sourced text.
 */
async function wikipediaFallback(place: Place): Promise<Omit<PlaceEnrichment, "placeId" | "fetchedAt" | "staleAfter"> | null> {
  const query = [place.canonicalName, place.city].filter(Boolean).join(", ");
  try {
    // Automatic Bilingual Generation, Wikipedia flavor: a genuine Hebrew
    // Wikipedia article (not a machine translation of the English one) is
    // tried in parallel — same spirit as the Claude bilingual-in-one-call
    // pattern, just from a second real source instead of asking one model
    // to write both languages.
    const [en, he] = await Promise.all([fetchWikipediaSummary(query, "en"), fetchWikipediaSummary(query, "he")]);
    if (!en) return null;
    return {
      description: en.extract,
      descriptionHe: he?.extract,
      photos: [],
      practicalInfo: {
        whatToDo: genericWhatToDo(place),
        estimatedVisitMinutes: GENERIC_VISIT_MINUTES[place.category],
        familyTips: GENERIC_FAMILY_TIPS[place.category],
        familyAccessibility: GENERIC_ACCESSIBILITY[place.category]
      },
      source: "ai_generated",
      textOrigin: "wikipedia"
    };
  } catch (err) {
    console.error(`Wikipedia enrichment failed for ${place.canonicalName}:`, err);
    return null;
  }
}

/**
 * The shared, cached enrichment path described in the plan's §01: a place is
 * enriched once and reused everywhere it's referenced, not re-generated per
 * itinerary item or per trip. Order of preference: fresh cache -> Claude (if
 * configured) -> a hand-curated blurb for known demo places -> an honest
 * generic fallback. Nothing here ever touches Place's own verified fields
 * (address, coordinates) — only the separate, clearly-provisional
 * PlaceEnrichment record.
 *
 * `locale` is presentational only: it doesn't change what's fetched (Claude
 * is always asked for both languages in one call, see enrichPlaceWithClaude)
 * or what's cached, only which language `localizeEnrichment` should prefer
 * once the record comes back. Kept as a parameter so existing call sites
 * (Place Detail, cover-photo warm-up) don't need to change shape.
 */
export async function getOrCreateEnrichment(place: Place, locale: Locale = "en"): Promise<PlaceEnrichment> {
  const cached = await placeRepo.getEnrichment(place.id);
  if (cached && new Date(cached.staleAfter).getTime() > Date.now()) {
    return cached;
  }

  let body: Omit<PlaceEnrichment, "placeId" | "fetchedAt" | "staleAfter"> | null = null;

  try {
    // One call returns both languages atomically (see lib/ai/enrichPlace.ts) —
    // `locale` no longer changes what's requested, only what the caller
    // ultimately displays; every place enriched via Claude from here on is
    // bilingual from the moment it's first fetched, regardless of which
    // locale triggered that fetch.
    const aiResult = await enrichPlaceWithClaude(place);
    if (aiResult) {
      body = {
        description: aiResult.description,
        descriptionHe: aiResult.descriptionHe,
        nameHe: aiResult.nameHe,
        photos: [],
        practicalInfo: {
          whatToDo: aiResult.whatToDo,
          nearestStation: aiResult.nearestStation,
          checkIn: aiResult.checkIn,
          checkOut: aiResult.checkOut,
          amenities: aiResult.amenities,
          estimatedVisitMinutes: aiResult.estimatedVisitMinutes,
          familyTips: aiResult.familyTips,
          openingHours: aiResult.openingHours,
          estimatedCost: aiResult.estimatedCost,
          familyAccessibility: aiResult.familyAccessibility
        },
        practicalInfoHe: practicalInfoHeFrom(aiResult),
        source: "ai_generated",
        textOrigin: "claude"
      };
    }
  } catch (err) {
    console.error(`Claude enrichment failed for ${place.canonicalName}:`, err);
  }

  if (!body) {
    const curated = getCuratedEnrichment(place.canonicalName);
    if (curated) {
      body = { ...curated, textOrigin: "curated" };
    } else {
      body = (await wikipediaFallback(place)) ?? genericFallback(place);
    }
  }

  // Real photos are resolved independently of which text source (Claude, curated,
  // or the generic fallback) supplied the description above — a curated blurb
  // shouldn't mean a place is stuck with a placeholder tile forever.
  //
  // The 13 curated demo places get a hardcoded real photo (lib/demo.ts) first,
  // before any network call — that's what makes the sample trip show real
  // photos instantly with zero environment variables set, and it also means
  // the demo never spends a Google/Unsplash API call on places whose photo is
  // already known. Everything else falls through to the live lookup: Google
  // Places first, then Unsplash; if neither is configured or neither finds
  // anything, `body.photos` stays whatever the text source set (normally `[]`)
  // and every photo call site falls back to the deterministic tile.
  const demoPhoto = DEMO_PLACE_PHOTOS[place.canonicalName.trim().toLowerCase()];
  if (demoPhoto) {
    body.photos = [demoPhoto];
    body.photoSource = "unsplash";
  } else {
    try {
      const real = await fetchRealPhotos(place);
      if (real) {
        body.photos = real.tiles.map((t) => t.url);
        body.photoSource = real.source;
      }
    } catch (err) {
      console.error(`Real photo lookup failed for ${place.canonicalName}:`, err);
    }
  }

  const enrichment: PlaceEnrichment = {
    placeId: place.id,
    fetchedAt: new Date().toISOString(),
    staleAfter: new Date(Date.now() + TTL_MS).toISOString(),
    ...body
  };
  await placeRepo.saveEnrichment(enrichment);
  return enrichment;
}

/**
 * Batch cover-photo lookup for a page rendering many items at once (Today's
 * card list, its Now/Next hero, tonight's hotel) — dedupes by place id so a
 * hotel referenced on every day of a stay only triggers one enrichment fetch,
 * and reuses the same 30-day cache as the place detail page. Returns only
 * the entries that actually resolved to a real photo; callers fall back to
 * the deterministic placeholder tile for every place missing from the map.
 */
export async function getCoverPhotos(places: Place[]): Promise<Map<string, string>> {
  const unique = new Map<string, Place>();
  for (const p of places) {
    if (!unique.has(p.id)) unique.set(p.id, p);
  }

  const entries = await Promise.all(
    Array.from(unique.values()).map(async (place): Promise<[string, string | undefined]> => {
      try {
        const enrichment = await getOrCreateEnrichment(place);
        return [place.id, enrichment.photos[0]];
      } catch (err) {
        console.error(`Cover photo lookup failed for ${place.canonicalName}:`, err);
        return [place.id, undefined];
      }
    })
  );

  const map = new Map<string, string>();
  for (const [id, url] of entries) {
    if (url) map.set(id, url);
  }
  return map;
}
