import type { Place, PlaceEnrichment } from "../types";
import { places, enrichments } from "./placeStore";
import { supabasePlaceRepo } from "./supabasePlaceRepo";

// Same seam as lib/repo/index.ts: one flag decides in-memory vs. real
// database, and everything above this file (lib/enrichment/service.ts, the
// Place Detail page, ...) just calls `placeRepo` without knowing which is
// active. The in-memory Maps in ./placeStore only survive for the lifetime
// of one running process — fine for `npm run dev`, but NOT fine on a
// serverless host like Vercel, where each request can land on a fresh
// instance with empty maps. Configuring Supabase isn't optional once this
// app is actually deployed; it's what makes places/enrichments (and trips —
// see lib/repo/index.ts) persist at all between requests.
//
// supabasePlaceRepo is imported statically (not required lazily) like every
// other module in this codebase — @supabase/supabase-js only actually opens
// a connection the first time one of its methods is called (see that
// file's client()), so importing it unconditionally here costs nothing when
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY aren't set; the in-memory branch
// below is still what actually runs in that case.
const hasSupabaseConfig = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const memoryPlaceRepo = {
  async getPlace(id: string): Promise<Place | null> {
    return places.get(id) ?? null;
  },
  async getEnrichment(placeId: string): Promise<PlaceEnrichment | null> {
    return enrichments.get(placeId) ?? null;
  },
  async saveEnrichment(enrichment: PlaceEnrichment): Promise<void> {
    enrichments.set(enrichment.placeId, enrichment);
  }
};

export const placeRepo = hasSupabaseConfig ? supabasePlaceRepo : memoryPlaceRepo;
