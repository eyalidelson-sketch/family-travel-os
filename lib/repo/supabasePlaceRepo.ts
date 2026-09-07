import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Place, PlaceEnrichment, PlaceEnrichmentPracticalInfo } from "../types";
import { placesProvider } from "../providers/places";

// Real-database counterpart of lib/repo/placeStore.ts's in-memory Maps.
// Place/PlaceEnrichment are deliberately their own persistence seam, outside
// TripRepository (see the plan's §01 and placeStore.ts's own comment): a
// place is resolved and enriched once, in its own `places` row, and reused
// by every trip that mentions it — never re-fetched or re-enriched per trip.
//
// This module owns BOTH halves that used to live in two different
// in-memory files: `placeRepo`'s getPlace/getEnrichment/saveEnrichment
// (consumed by lib/enrichment/service.ts), and the upsertPlace() dedupe
// logic that used to live inline in lib/repo/memory.ts (consumed by
// lib/repo/supabase.ts). Keeping both here means the exact same
// find-or-create-by-name+city query backs every place lookup in the app,
// database-side, the same way the single `places` Map did in memory.
//
// Row shapes are cast with `as`, not passed as generic type arguments to
// .select()/.single() — supabase-js's exact generic overload shape has
// shifted across 2.x versions, and this file was written without
// node_modules available to confirm which one package.json will resolve to.
// A plain cast compiles against any version and is exactly as safe here,
// since every row shape below is hand-verified against db/schema.sql.

function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("supabasePlaceRepo used without SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configured.");
  }
  // One client per lambda/process, not per call — supabase-js is safe to
  // share, and re-creating it per request just re-parses the URL every time.
  const globalForClient = globalThis as unknown as { __travelOsSupabase?: SupabaseClient };
  if (!globalForClient.__travelOsSupabase) {
    globalForClient.__travelOsSupabase = createClient(url, key, { auth: { persistSession: false } });
  }
  return globalForClient.__travelOsSupabase;
}

interface PlaceRow {
  id: string;
  canonical_name: string;
  category: Place["category"];
  city: string;
  country: string;
  timezone: string;
  lat: number | null;
  lng: number | null;
  address_local_script: string | null;
  address_translit: string | null;
  geocode_source: Place["geocodeSource"] | null;
}

function placeFromRow(row: PlaceRow): Place {
  return {
    id: row.id,
    canonicalName: row.canonical_name,
    category: row.category,
    city: row.city,
    country: row.country,
    timezone: row.timezone,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    addressLocalScript: row.address_local_script ?? undefined,
    addressTranslit: row.address_translit ?? undefined,
    geocodeSource: row.geocode_source ?? undefined
  };
}

interface EnrichmentRow {
  place_id: string;
  description: string | null;
  description_he: string | null;
  name_he: string | null;
  photos: string[];
  photo_source: PlaceEnrichment["photoSource"] | null;
  text_origin: PlaceEnrichment["textOrigin"] | null;
  practical_info: PlaceEnrichmentPracticalInfo | null;
  practical_info_he: PlaceEnrichmentPracticalInfo | null;
  source: PlaceEnrichment["source"];
  fetched_at: string;
  stale_after: string;
}

function enrichmentFromRow(row: EnrichmentRow): PlaceEnrichment {
  return {
    placeId: row.place_id,
    description: row.description ?? undefined,
    descriptionHe: row.description_he ?? undefined,
    nameHe: row.name_he ?? undefined,
    photos: row.photos ?? [],
    photoSource: row.photo_source ?? undefined,
    textOrigin: row.text_origin ?? undefined,
    practicalInfo: row.practical_info ?? undefined,
    practicalInfoHe: row.practical_info_he ?? undefined,
    source: row.source,
    fetchedAt: row.fetched_at,
    staleAfter: row.stale_after
  };
}

/**
 * Same find-or-create-by-name+city dedupe rule as the in-memory version —
 * and slightly stricter: the in-memory version keyed the lookup off the
 * caller's raw, un-resolved `name`/`cityHint` strings, which could produce a
 * duplicate row for an alias (e.g. calling once with "Furano" and once with
 * a raw alias that resolves to the same canonical place but wasn't spelled
 * identically). This version looks up by the RESOLVED canonical_name/city/
 * country instead, so any two inputs that resolve to the same real place
 * always collapse onto the same row regardless of which alias was used.
 */
export async function upsertPlace(name: string, cityHint?: string): Promise<Place> {
  const db = client();
  const resolved = await placesProvider.resolve(name, cityHint);

  const { data: existing, error: selectErr } = await db
    .from("places")
    .select("*")
    .ilike("canonical_name", resolved.canonicalName)
    .ilike("city", resolved.city || "")
    .ilike("country", resolved.country || "")
    .maybeSingle();
  if (selectErr) throw selectErr;
  if (existing) return placeFromRow(existing as PlaceRow);

  const { data: inserted, error: insertErr } = await db
    .from("places")
    .insert({
      canonical_name: resolved.canonicalName,
      category: resolved.category,
      city: resolved.city,
      country: resolved.country,
      timezone: resolved.timezone,
      lat: resolved.lat ?? null,
      lng: resolved.lng ?? null,
      address_local_script: resolved.addressLocalScript ?? null,
      address_translit: resolved.addressTranslit ?? null,
      geocode_source: resolved.verified ? "external_api" : "ai_generated"
    })
    .select("*")
    .single();
  if (insertErr) {
    // A concurrent request may have inserted the same (canonical_name, city,
    // country) between our select and insert — the unique constraint turns
    // that into a conflict here rather than a silent duplicate row. Re-read
    // instead of failing the whole request.
    if (insertErr.code === "23505") {
      const { data: retry, error: retryErr } = await db
        .from("places")
        .select("*")
        .ilike("canonical_name", resolved.canonicalName)
        .ilike("city", resolved.city || "")
        .ilike("country", resolved.country || "")
        .maybeSingle();
      if (retryErr) throw retryErr;
      if (retry) return placeFromRow(retry as PlaceRow);
    }
    throw insertErr;
  }
  return placeFromRow(inserted as PlaceRow);
}

export async function getPlaceById(id: string): Promise<Place | null> {
  const db = client();
  const { data, error } = await db.from("places").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? placeFromRow(data as PlaceRow) : null;
}

export async function getPlacesByIds(ids: string[]): Promise<Map<string, Place>> {
  const map = new Map<string, Place>();
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return map;
  const db = client();
  const { data, error } = await db.from("places").select("*").in("id", uniqueIds);
  if (error) throw error;
  for (const row of (data ?? []) as PlaceRow[]) {
    map.set(row.id, placeFromRow(row));
  }
  return map;
}

export const supabasePlaceRepo = {
  async getPlace(id: string): Promise<Place | null> {
    return getPlaceById(id);
  },

  async getEnrichment(placeId: string): Promise<PlaceEnrichment | null> {
    const db = client();
    const { data, error } = await db.from("place_enrichments").select("*").eq("place_id", placeId).maybeSingle();
    if (error) throw error;
    return data ? enrichmentFromRow(data as EnrichmentRow) : null;
  },

  async saveEnrichment(enrichment: PlaceEnrichment): Promise<void> {
    const db = client();
    const { error } = await db.from("place_enrichments").upsert({
      place_id: enrichment.placeId,
      description: enrichment.description ?? null,
      description_he: enrichment.descriptionHe ?? null,
      name_he: enrichment.nameHe ?? null,
      photos: enrichment.photos,
      photo_source: enrichment.photoSource ?? null,
      text_origin: enrichment.textOrigin ?? null,
      practical_info: enrichment.practicalInfo ?? null,
      practical_info_he: enrichment.practicalInfoHe ?? null,
      source: enrichment.source,
      fetched_at: enrichment.fetchedAt,
      stale_after: enrichment.staleAfter
    });
    if (error) throw error;
  }
};
