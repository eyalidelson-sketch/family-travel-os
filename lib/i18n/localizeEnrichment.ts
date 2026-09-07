import type { Place, PlaceEnrichment } from "../types";
import type { Locale } from "./locale";
import {
  getCuratedEnrichmentHe,
  genericDescriptionHe,
  genericWhatToDoHe,
  GENERIC_FAMILY_TIPS_HE,
  GENERIC_ACCESSIBILITY_HE
} from "./placeContentHe";

/**
 * Swaps a cached (English-sourced) PlaceEnrichment's display text for its
 * Hebrew counterpart when one exists, WITHOUT touching the cache itself —
 * the 30-day PlaceEnrichment cache (lib/repo/placeStore.ts) is keyed by
 * place id only, not by locale, so an English viewer and a Hebrew viewer of
 * the same place share one cached record. Rewriting that record in place
 * would make whichever locale fetched it first "win" for everyone else, so
 * this always returns a fresh, shallow-copied object instead.
 *
 * Curated- and generic-sourced text (see PlaceEnrichment.textOrigin) has a
 * hand-written Hebrew version swapped in here. Live Claude-generated content
 * (textOrigin "claude") carries its own Hebrew twin directly on the record
 * (`descriptionHe` / `practicalInfoHe` / `nameHe`) — Automatic Bilingual
 * Generation, produced in the SAME Claude call as the English text (see
 * lib/ai/enrichPlace.ts), not a separate translation pass — so this function
 * just prefers those fields when present. The only remaining honest gap is a
 * record fetched before that field existed, or the rare case Claude omitted
 * the Hebrew twin for a fact it did include in English; both fall back to
 * the English text as-is rather than showing nothing.
 */
export function localizeEnrichment(enrichment: PlaceEnrichment, place: Place, locale: Locale): PlaceEnrichment {
  if (locale !== "he") return enrichment;

  if (enrichment.textOrigin === "curated") {
    const he = getCuratedEnrichmentHe(place.canonicalName);
    if (!he) return enrichment;
    return {
      ...enrichment,
      description: he.description ?? enrichment.description,
      practicalInfo: enrichment.practicalInfo || he.practicalInfo ? { ...enrichment.practicalInfo, ...he.practicalInfo } : enrichment.practicalInfo
    };
  }

  if (enrichment.textOrigin === "generic") {
    const description = genericDescriptionHe(place) ?? enrichment.description;
    const whatToDo = genericWhatToDoHe(place);
    const familyTips = GENERIC_FAMILY_TIPS_HE[place.category];
    const familyAccessibility = GENERIC_ACCESSIBILITY_HE[place.category];
    return {
      ...enrichment,
      description,
      practicalInfo: {
        ...enrichment.practicalInfo,
        ...(whatToDo ? { whatToDo } : {}),
        ...(familyTips ? { familyTips } : {}),
        ...(familyAccessibility ? { familyAccessibility } : {})
      }
    };
  }

  if (enrichment.textOrigin === "claude") {
    if (!enrichment.descriptionHe && !enrichment.practicalInfoHe && !enrichment.nameHe) return enrichment;
    return {
      ...enrichment,
      description: enrichment.descriptionHe ?? enrichment.description,
      practicalInfo:
        enrichment.practicalInfo || enrichment.practicalInfoHe
          ? { ...enrichment.practicalInfo, ...enrichment.practicalInfoHe }
          : enrichment.practicalInfo
    };
  }

  if (enrichment.textOrigin === "wikipedia") {
    // Two independent Hebrew sources can apply here, same record: a genuine
    // Hebrew Wikipedia article for the description itself (fetched
    // alongside the English one — see wikipediaFallback in
    // lib/enrichment/service.ts — so `descriptionHe` is real Hebrew source
    // text, not a translation), and the same category-based Hebrew tables
    // the "generic" branch above uses for whatToDo/familyTips/
    // familyAccessibility, since those three fields were always filled from
    // the English-only category tables regardless of where the description
    // came from.
    const whatToDo = genericWhatToDoHe(place);
    const familyTips = GENERIC_FAMILY_TIPS_HE[place.category];
    const familyAccessibility = GENERIC_ACCESSIBILITY_HE[place.category];
    return {
      ...enrichment,
      description: enrichment.descriptionHe ?? enrichment.description,
      practicalInfo: {
        ...enrichment.practicalInfo,
        ...(whatToDo ? { whatToDo } : {}),
        ...(familyTips ? { familyTips } : {}),
        ...(familyAccessibility ? { familyAccessibility } : {})
      }
    };
  }

  return enrichment;
}
