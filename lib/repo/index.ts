import { MemoryTripRepository } from "./memory";
import { SupabaseTripRepository } from "./supabase";
import type { TripRepository } from "./types";

// The one place that decides which repository backs the app. Everything
// else imports `repo` from here and never touches Memory/Supabase directly.
//
// SupabaseTripRepository is now a full implementation (see supabase.ts) —
// set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (after running
// db/schema.sql against that project) to switch the whole app onto it.
// Importing it unconditionally here is safe with no env vars set: nothing
// in that module talks to Supabase until one of its methods is actually
// called, and the in-memory branch below is what runs in that case.
const hasSupabaseConfig = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

function createRepository(): TripRepository {
  return hasSupabaseConfig ? new SupabaseTripRepository() : new MemoryTripRepository();
}

const globalForRepo = globalThis as unknown as { __travelOsRepo?: TripRepository };
export const repo: TripRepository = globalForRepo.__travelOsRepo ?? createRepository();
globalForRepo.__travelOsRepo = repo;

export const usingInMemoryRepo = !hasSupabaseConfig;
