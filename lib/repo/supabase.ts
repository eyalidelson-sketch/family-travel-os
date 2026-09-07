import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import type { ParsedTrip } from "../parsing-types";
import type {
  AIRecommendation,
  Day,
  DayWithItems,
  FoodPreference,
  FoodRestriction,
  HotelStay,
  ItineraryItem,
  ItineraryItemType,
  MemberProfile,
  Place,
  Poll,
  PollOption,
  PollVote,
  Transport,
  Trip,
  TripBundle,
  TripMember
} from "../types";
import type { ItemInput, ItemPatch, PollWithResults, TripRepository } from "./types";
import { upsertPlace, getPlacesByIds } from "./supabasePlaceRepo";

// The real, persistent TripRepository — a straight port of memory.ts's logic
// onto Postgres via @supabase/supabase-js, against db/schema.sql. Every
// method here mirrors its in-memory counterpart's exact behavior (including
// its edge cases — see comments below for the couple of intentional
// improvements), so switching lib/repo/index.ts between the two is safe.
//
// Row shapes are cast with `as`, not passed as generic type arguments —
// see supabasePlaceRepo.ts's header comment for why.
//
// Known limitation, stated plainly rather than glossed over: addDayAfter and
// deleteDay each perform several dependent writes (shifting every later
// day's date/index, inserting or deleting rows, adjusting the trip's
// endDate) that the in-memory version gets "for free" as synchronous Map
// mutations. Here they run as a sequence of separate Postgres statements,
// not one atomic transaction — supabase-js's REST-based client doesn't
// expose BEGIN/COMMIT directly. A request that fails partway through (a
// dropped connection, not a normal validation error) could leave days
// partially renumbered. Wrapping this in a single Postgres function
// (`create function ...` + `supabase.rpc(...)`) is the right long-term fix
// if this feature sees real concurrent use; it wasn't worth blocking the
// rest of this pass on writing and testing that function against a live
// project this sandbox has no credentials to reach.

function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SupabaseTripRepository used without SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configured.");
  }
  const globalForClient = globalThis as unknown as { __travelOsSupabase?: SupabaseClient };
  if (!globalForClient.__travelOsSupabase) {
    globalForClient.__travelOsSupabase = createClient(url, key, { auth: { persistSession: false } });
  }
  return globalForClient.__travelOsSupabase;
}

function assertNoError<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

// ---------------------------------------------------------------------------
// Row <-> app-type mapping. Column names follow db/schema.sql exactly.
// ---------------------------------------------------------------------------

interface TripRow {
  id: string;
  name: string;
  cover_image: string | null;
  start_date: string;
  end_date: string;
  countries: string[];
  status: Trip["status"];
  invite_code: string;
  created_by_trip_member_id: string | null;
  created_at: string;
}
function tripFromRow(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    coverImage: row.cover_image ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    countries: row.countries ?? [],
    status: row.status,
    inviteCode: row.invite_code,
    createdByTripMemberId: row.created_by_trip_member_id ?? "",
    createdAt: row.created_at
  };
}

interface TripMemberRow {
  id: string;
  trip_id: string;
  display_name: string;
  role: TripMember["role"];
  joined_at: string;
}
function memberFromRow(row: TripMemberRow): TripMember {
  return { id: row.id, tripId: row.trip_id, displayName: row.display_name, role: row.role, joinedAt: row.joined_at };
}

interface DayRow {
  id: string;
  trip_id: string;
  date: string;
  day_index: number;
  city_place_id: string | null;
  timezone: string;
  is_travel_day: boolean;
}
function dayFromRow(row: DayRow): Day {
  return {
    id: row.id,
    tripId: row.trip_id,
    date: row.date,
    dayIndex: row.day_index,
    cityPlaceId: row.city_place_id ?? undefined,
    timezone: row.timezone,
    isTravelDay: row.is_travel_day
  };
}

interface ItemRow {
  id: string;
  day_id: string;
  type: ItineraryItemType;
  title: string;
  start_time: string | null;
  end_time: string | null;
  place_id: string | null;
  order_index: number;
  notes: string | null;
  source: ItineraryItem["source"];
  confidence: number | null;
  needs_review: boolean;
}
function itemFromRow(row: ItemRow): ItineraryItem {
  return {
    id: row.id,
    dayId: row.day_id,
    type: row.type,
    title: row.title,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    placeId: row.place_id ?? undefined,
    orderIndex: row.order_index,
    notes: row.notes ?? undefined,
    source: row.source,
    confidence: row.confidence ?? undefined,
    needsReview: row.needs_review
  };
}

interface HotelStayRow {
  id: string;
  trip_id: string;
  place_id: string;
  check_in: string;
  check_out: string;
  confirmation_number: string | null;
  source: HotelStay["source"];
}
function hotelStayFromRow(row: HotelStayRow): HotelStay {
  return {
    id: row.id,
    tripId: row.trip_id,
    placeId: row.place_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    confirmationNumber: row.confirmation_number ?? undefined,
    source: row.source
  };
}

interface TransportRow {
  id: string;
  trip_id: string;
  day_id: string | null;
  mode: Transport["mode"];
  from_place_id: string | null;
  to_place_id: string | null;
  depart_time: string | null;
  arrive_time: string | null;
  carrier: string | null;
  reference_number: string | null;
  seat_info: string | null;
  source: Transport["source"];
}
function transportFromRow(row: TransportRow): Transport {
  return {
    id: row.id,
    tripId: row.trip_id,
    dayId: row.day_id ?? undefined,
    mode: row.mode,
    fromPlaceId: row.from_place_id ?? undefined,
    toPlaceId: row.to_place_id ?? undefined,
    departTime: row.depart_time ?? undefined,
    arriveTime: row.arrive_time ?? undefined,
    carrier: row.carrier ?? undefined,
    referenceNumber: row.reference_number ?? undefined,
    seatInfo: row.seat_info ?? undefined,
    source: row.source
  };
}

interface FoodRestrictionRow {
  id: string;
  trip_member_id: string;
  type: FoodRestriction["type"];
  label: string;
  notes: string | null;
}
function restrictionFromRow(row: FoodRestrictionRow): FoodRestriction {
  return { id: row.id, tripMemberId: row.trip_member_id, type: row.type, label: row.label, notes: row.notes ?? undefined };
}

interface FoodPreferenceRow {
  id: string;
  trip_member_id: string;
  category: FoodPreference["category"];
  label: string;
  weight: number;
}
function preferenceFromRow(row: FoodPreferenceRow): FoodPreference {
  return { id: row.id, tripMemberId: row.trip_member_id, category: row.category, label: row.label, weight: row.weight };
}

interface PollRow {
  id: string;
  trip_id: string;
  day_id: string | null;
  question: string;
  status: Poll["status"];
  created_by_trip_member_id: string;
  created_at: string;
}
function pollFromRow(row: PollRow): Poll {
  return {
    id: row.id,
    tripId: row.trip_id,
    dayId: row.day_id ?? undefined,
    question: row.question,
    createdByTripMemberId: row.created_by_trip_member_id,
    status: row.status,
    createdAt: row.created_at
  };
}

interface PollOptionRow {
  id: string;
  poll_id: string;
  label: string;
}
function pollOptionFromRow(row: PollOptionRow): PollOption {
  return { id: row.id, pollId: row.poll_id, label: row.label };
}

interface PollVoteRow {
  id: string;
  poll_id: string;
  option_id: string;
  trip_member_id: string;
}
function pollVoteFromRow(row: PollVoteRow): PollVote {
  return { id: row.id, pollId: row.poll_id, optionId: row.option_id, tripMemberId: row.trip_member_id };
}

interface AIRecommendationRow {
  id: string;
  trip_id: string;
  type: AIRecommendation["type"];
  payload: Record<string, unknown>;
  status: AIRecommendation["status"];
  created_at: string;
  resolved_by_trip_member_id: string | null;
}

const AMBIGUOUS_CHARS = /[0O1ILU]/g;
function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no 0/O/1/I/L/U
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code.replace(AMBIGUOUS_CHARS, "7");
}

async function logEdit(
  tripId: string,
  actorTripMemberId: string,
  entityType: string,
  entityId: string,
  diff: Record<string, unknown>
): Promise<void> {
  const db = client();
  // Best-effort: a failed audit-log write shouldn't fail the user-facing
  // action it's logging, so this is intentionally not awaited-and-thrown —
  // just reported.
  const { error } = await db
    .from("edit_history")
    .insert({ id: uuid(), trip_id: tripId, actor_trip_member_id: actorTripMemberId, entity_type: entityType, entity_id: entityId, diff });
  if (error) console.error("edit_history insert failed (non-fatal):", error.message);
}

/**
 * Loads a trip's days fully hydrated (items with their places, hotel stay,
 * transport) in a fixed small number of queries regardless of trip length —
 * one for days, one for items, one for hotel_stays, one for transport, one
 * batched lookup for every place referenced anywhere above — rather than
 * one round trip per day the way a naive per-day hydrate would.
 */
async function hydrateTripBundle(tripId: string): Promise<TripBundle | null> {
  const db = client();

  const tripRes = await db.from("trips").select("*").eq("id", tripId).maybeSingle();
  if (tripRes.error) throw new Error(tripRes.error.message);
  if (!tripRes.data) return null;
  const trip = tripFromRow(tripRes.data as TripRow);

  const [daysRes, hotelStaysRes, transportRes] = await Promise.all([
    db.from("days").select("*").eq("trip_id", tripId).order("day_index", { ascending: true }),
    db.from("hotel_stays").select("*").eq("trip_id", tripId),
    db.from("transport").select("*").eq("trip_id", tripId)
  ]);
  if (daysRes.error) throw new Error(daysRes.error.message);
  if (hotelStaysRes.error) throw new Error(hotelStaysRes.error.message);
  if (transportRes.error) throw new Error(transportRes.error.message);

  const days = (daysRes.data ?? []).map((r) => dayFromRow(r as DayRow));
  const hotelStays = (hotelStaysRes.data ?? []).map((r) => hotelStayFromRow(r as HotelStayRow));
  const transportRows = (transportRes.data ?? []).map((r) => transportFromRow(r as TransportRow));

  const dayIds = days.map((d) => d.id);
  const itemsRes = dayIds.length > 0 ? await db.from("itinerary_items").select("*").in("day_id", dayIds) : { data: [], error: null };
  if (itemsRes.error) throw new Error(itemsRes.error.message);
  const items = (itemsRes.data ?? []).map((r) => itemFromRow(r as ItemRow));

  const placeIds = new Set<string>();
  for (const d of days) if (d.cityPlaceId) placeIds.add(d.cityPlaceId);
  for (const i of items) if (i.placeId) placeIds.add(i.placeId);
  for (const h of hotelStays) placeIds.add(h.placeId);
  for (const t of transportRows) {
    if (t.fromPlaceId) placeIds.add(t.fromPlaceId);
    if (t.toPlaceId) placeIds.add(t.toPlaceId);
  }
  const places: Map<string, Place> = await getPlacesByIds([...placeIds]);

  const bundleDays: DayWithItems[] = days.map((day) => {
    const dayItems = items
      .filter((i) => i.dayId === day.id)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((i) => ({ ...i, place: i.placeId ? places.get(i.placeId) : undefined }));

    const hotelStay = hotelStays.find((h) => day.date >= h.checkIn && day.date < h.checkOut);
    const dayTransport = transportRows.filter((t) => t.dayId === day.id);

    return {
      ...day,
      city: day.cityPlaceId ? places.get(day.cityPlaceId) : undefined,
      items: dayItems,
      hotel: hotelStay ? { ...hotelStay, place: places.get(hotelStay.placeId)! } : undefined,
      transport: dayTransport
    };
  });

  return { trip, days: bundleDays };
}

async function hydratePoll(pollRow: PollRow): Promise<PollWithResults> {
  const db = client();
  const poll = pollFromRow(pollRow);
  const [optionsRes, votesRes] = await Promise.all([
    db.from("poll_options").select("*").eq("poll_id", poll.id),
    db.from("poll_votes").select("*").eq("poll_id", poll.id)
  ]);
  if (optionsRes.error) throw new Error(optionsRes.error.message);
  if (votesRes.error) throw new Error(votesRes.error.message);
  return {
    poll,
    options: (optionsRes.data ?? []).map((r) => pollOptionFromRow(r as PollOptionRow)),
    votes: (votesRes.data ?? []).map((r) => pollVoteFromRow(r as PollVoteRow))
  };
}

async function nextOrderIndex(dayId: string): Promise<number> {
  const db = client();
  const { data, error } = await db
    .from("itinerary_items")
    .select("order_index")
    .eq("day_id", dayId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data as { order_index: number }).order_index + 1 : 0;
}

export class SupabaseTripRepository implements TripRepository {
  async createTripFromParsed(parsed: ParsedTrip, organizerName: string): Promise<TripBundle> {
    const db = client();
    const tripId = uuid();
    const organizerId = uuid();

    let code = generateInviteCode();
    for (let attempts = 0; attempts < 20; attempts++) {
      const { data } = await db.from("trips").select("id").eq("invite_code", code).maybeSingle();
      if (!data) break;
      code = generateInviteCode();
    }

    // trips.created_by_trip_member_id and trip_members.trip_id reference
    // each other (see schema.sql's comment) — insert the trip first with
    // that column null, then the organizer member row, then patch it in.
    assertNoError(
      await db.from("trips").insert({
        id: tripId,
        name: parsed.name,
        start_date: parsed.startDate,
        end_date: parsed.endDate,
        countries: parsed.countries,
        status: "confirmed",
        invite_code: code,
        created_by_trip_member_id: null
      })
    );

    assertNoError(
      await db.from("trip_members").insert({ id: organizerId, trip_id: tripId, display_name: organizerName, role: "organizer" })
    );
    assertNoError(await db.from("trips").update({ created_by_trip_member_id: organizerId }).eq("id", tripId));

    const countrySet = new Set<string>();
    const dayRows: DayRow[] = [];
    const itemRows: ItemRow[] = [];
    const hotelRows: HotelStayRow[] = [];
    const transportRows: TransportRow[] = [];

    // Sequential, like the in-memory version: each upsertPlace() call must
    // see the places already inserted by earlier ones in this same loop to
    // dedupe correctly (e.g. the same hotel named on every night of a stay).
    for (const [index, parsedDay] of parsed.days.entries()) {
      const cityPlace = parsedDay.cityHint ? await upsertPlace(parsedDay.cityHint, parsedDay.cityHint) : undefined;
      const timezone = cityPlace?.timezone ?? "Etc/UTC";
      if (cityPlace?.country) countrySet.add(cityPlace.country);

      const dayId = uuid();
      dayRows.push({
        id: dayId,
        trip_id: tripId,
        date: parsedDay.date,
        day_index: index + 1,
        city_place_id: cityPlace?.id ?? null,
        timezone,
        is_travel_day: parsedDay.isTravelDay
      });

      for (const [itemIndex, parsedItem] of parsedDay.items.entries()) {
        const place = parsedItem.placeName ? await upsertPlace(parsedItem.placeName, parsedItem.cityHint ?? parsedDay.cityHint) : undefined;
        itemRows.push({
          id: uuid(),
          day_id: dayId,
          type: parsedItem.type,
          title: parsedItem.title,
          start_time: parsedItem.startTime ?? null,
          end_time: parsedItem.endTime ?? null,
          place_id: place?.id ?? null,
          order_index: itemIndex,
          notes: parsedItem.notes ?? null,
          source: parsedItem.source,
          confidence: parsedItem.confidence ?? null,
          needs_review: parsedItem.needsReview
        });
      }

      if (parsedDay.hotel) {
        const place = await upsertPlace(parsedDay.hotel.placeName, parsedDay.hotel.cityHint ?? parsedDay.cityHint);
        const alreadyQueued = hotelRows.some((h) => h.place_id === place.id && h.check_in === parsedDay.hotel!.checkIn);
        if (!alreadyQueued) {
          hotelRows.push({
            id: uuid(),
            trip_id: tripId,
            place_id: place.id,
            check_in: parsedDay.hotel.checkIn,
            check_out: parsedDay.hotel.checkOut,
            confirmation_number: parsedDay.hotel.referenceNumber ?? null,
            source: "organizer_input"
          });
        }
      }

      if (parsedDay.transport) {
        for (const t of parsedDay.transport) {
          const fromPlace = t.fromPlaceName ? await upsertPlace(t.fromPlaceName, parsedDay.cityHint) : undefined;
          const toPlace = t.toPlaceName ? await upsertPlace(t.toPlaceName, parsedDay.cityHint) : undefined;
          transportRows.push({
            id: uuid(),
            trip_id: tripId,
            day_id: dayId,
            mode: t.mode,
            from_place_id: fromPlace?.id ?? null,
            to_place_id: toPlace?.id ?? null,
            depart_time: t.departTime ?? null,
            arrive_time: t.arriveTime ?? null,
            carrier: t.carrier ?? null,
            reference_number: t.referenceNumber ?? null,
            seat_info: null,
            source: "organizer_input"
          });
        }
      }
    }

    // Bulk-insert everything that doesn't need per-row dedupe logic — far
    // fewer round trips than one insert per day/item/hotel/transport leg.
    if (dayRows.length > 0) assertNoError(await db.from("days").insert(dayRows));
    if (itemRows.length > 0) assertNoError(await db.from("itinerary_items").insert(itemRows));
    if (hotelRows.length > 0) assertNoError(await db.from("hotel_stays").insert(hotelRows));
    if (transportRows.length > 0) assertNoError(await db.from("transport").insert(transportRows));

    if (parsed.countries.length === 0 && countrySet.size > 0) {
      assertNoError(await db.from("trips").update({ countries: [...countrySet] }).eq("id", tripId));
    }

    return (await this.getTripBundle(tripId))!;
  }

  async getTripBundle(tripId: string): Promise<TripBundle | null> {
    return hydrateTripBundle(tripId);
  }

  async getTripByInviteCode(code: string): Promise<Trip | null> {
    const db = client();
    const { data, error } = await db.from("trips").select("*").eq("invite_code", code.trim().toUpperCase()).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? tripFromRow(data as TripRow) : null;
  }

  async joinTrip(tripId: string, displayName: string): Promise<TripMember> {
    const db = client();
    const row = { id: uuid(), trip_id: tripId, display_name: displayName, role: "member" as const };
    const { data, error } = await db.from("trip_members").insert(row).select("*").single();
    if (error) throw new Error(error.message);
    return memberFromRow(data as TripMemberRow);
  }

  async getTripMember(memberId: string): Promise<TripMember | null> {
    const db = client();
    const { data, error } = await db.from("trip_members").select("*").eq("id", memberId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? memberFromRow(data as TripMemberRow) : null;
  }

  async listTripMembers(tripId: string): Promise<TripMember[]> {
    const db = client();
    const { data, error } = await db.from("trip_members").select("*").eq("trip_id", tripId).order("joined_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => memberFromRow(r as TripMemberRow));
  }

  async getMemberProfile(tripMemberId: string): Promise<MemberProfile> {
    const db = client();
    const [restrictionsRes, preferencesRes] = await Promise.all([
      db.from("food_restrictions").select("*").eq("trip_member_id", tripMemberId),
      db.from("food_preferences").select("*").eq("trip_member_id", tripMemberId)
    ]);
    if (restrictionsRes.error) throw new Error(restrictionsRes.error.message);
    if (preferencesRes.error) throw new Error(preferencesRes.error.message);
    return {
      tripMemberId,
      restrictions: (restrictionsRes.data ?? []).map((r) => restrictionFromRow(r as FoodRestrictionRow)),
      preferences: (preferencesRes.data ?? []).map((r) => preferenceFromRow(r as FoodPreferenceRow))
    };
  }

  async addFoodRestriction(tripMemberId: string, input: Omit<FoodRestriction, "id" | "tripMemberId">): Promise<FoodRestriction> {
    const db = client();
    const row = { id: uuid(), trip_member_id: tripMemberId, type: input.type, label: input.label, notes: input.notes ?? null };
    const { data, error } = await db.from("food_restrictions").insert(row).select("*").single();
    if (error) throw new Error(error.message);
    return restrictionFromRow(data as FoodRestrictionRow);
  }

  async removeFoodRestriction(id: string): Promise<void> {
    const db = client();
    const { error } = await db.from("food_restrictions").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async addFoodPreference(tripMemberId: string, input: Omit<FoodPreference, "id" | "tripMemberId">): Promise<FoodPreference> {
    const db = client();
    const row = { id: uuid(), trip_member_id: tripMemberId, category: input.category, label: input.label, weight: input.weight };
    const { data, error } = await db.from("food_preferences").insert(row).select("*").single();
    if (error) throw new Error(error.message);
    return preferenceFromRow(data as FoodPreferenceRow);
  }

  async removeFoodPreference(id: string): Promise<void> {
    const db = client();
    const { error } = await db.from("food_preferences").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async addItineraryItem(dayId: string, actorTripMemberId: string, input: ItemInput): Promise<ItineraryItem> {
    const db = client();
    const { data: dayData, error: dayErr } = await db.from("days").select("*").eq("id", dayId).maybeSingle();
    if (dayErr) throw new Error(dayErr.message);
    if (!dayData) throw new Error("Day not found");
    const day = dayFromRow(dayData as DayRow);

    const place = input.placeName ? await upsertPlace(input.placeName, undefined) : undefined;
    const orderIndex = await nextOrderIndex(dayId);

    const row = {
      id: uuid(),
      day_id: dayId,
      type: input.type,
      title: input.title,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      place_id: place?.id ?? null,
      order_index: orderIndex,
      notes: input.notes ?? null,
      source: "organizer_input" as const,
      needs_review: false
    };
    const { data, error } = await db.from("itinerary_items").insert(row).select("*").single();
    if (error) throw new Error(error.message);
    const item = itemFromRow(data as ItemRow);
    await logEdit(day.tripId, actorTripMemberId, "itinerary_item", item.id, { action: "create", title: item.title });
    return item;
  }

  async updateItineraryItem(itemId: string, actorTripMemberId: string, patch: ItemPatch): Promise<ItineraryItem> {
    const db = client();
    const { data: existingData, error: existingErr } = await db.from("itinerary_items").select("*").eq("id", itemId).maybeSingle();
    if (existingErr) throw new Error(existingErr.message);
    if (!existingData) throw new Error("Item not found");
    const existing = itemFromRow(existingData as ItemRow);

    let placeId: string | undefined = existing.placeId;
    if (patch.placeName !== undefined) {
      placeId = patch.placeName ? (await upsertPlace(patch.placeName, undefined)).id : undefined;
    }

    const update = {
      title: patch.title ?? existing.title,
      type: (patch.type as ItineraryItemType) ?? existing.type,
      start_time: patch.startTime === undefined ? existing.startTime ?? null : patch.startTime || null,
      end_time: patch.endTime === undefined ? existing.endTime ?? null : patch.endTime || null,
      notes: patch.notes === undefined ? existing.notes ?? null : patch.notes,
      place_id: placeId ?? null,
      source: "organizer_input" as const,
      needs_review: false
    };
    const { data, error } = await db.from("itinerary_items").update(update).eq("id", itemId).select("*").single();
    if (error) throw new Error(error.message);
    const updated = itemFromRow(data as ItemRow);

    const { data: dayData } = await db.from("days").select("*").eq("id", existing.dayId).maybeSingle();
    if (dayData) await logEdit((dayData as DayRow).trip_id, actorTripMemberId, "itinerary_item", itemId, { action: "update", patch });
    return updated;
  }

  async deleteItineraryItem(itemId: string, actorTripMemberId: string): Promise<void> {
    const db = client();
    const { data: existingData } = await db.from("itinerary_items").select("*").eq("id", itemId).maybeSingle();
    if (!existingData) return;
    const existing = itemFromRow(existingData as ItemRow);
    const { error } = await db.from("itinerary_items").delete().eq("id", itemId);
    if (error) throw new Error(error.message);
    const { data: dayData } = await db.from("days").select("*").eq("id", existing.dayId).maybeSingle();
    if (dayData) await logEdit((dayData as DayRow).trip_id, actorTripMemberId, "itinerary_item", itemId, { action: "delete", title: existing.title });
  }

  async moveItineraryItem(itemId: string, actorTripMemberId: string, direction: "up" | "down"): Promise<void> {
    const db = client();
    const { data: existingData } = await db.from("itinerary_items").select("*").eq("id", itemId).maybeSingle();
    if (!existingData) return;
    const existing = itemFromRow(existingData as ItemRow);

    const { data: siblingsData, error: siblingsErr } = await db
      .from("itinerary_items")
      .select("*")
      .eq("day_id", existing.dayId)
      .order("order_index", { ascending: true });
    if (siblingsErr) throw new Error(siblingsErr.message);
    const siblings = (siblingsData ?? []).map((r) => itemFromRow(r as ItemRow));

    const idx = siblings.findIndex((i) => i.id === itemId);
    const swapWith = direction === "up" ? siblings[idx - 1] : siblings[idx + 1];
    if (!swapWith) return;

    const a = existing.orderIndex;
    const b = swapWith.orderIndex;
    assertNoError(await db.from("itinerary_items").update({ order_index: b }).eq("id", existing.id));
    assertNoError(await db.from("itinerary_items").update({ order_index: a }).eq("id", swapWith.id));

    const { data: dayData } = await db.from("days").select("*").eq("id", existing.dayId).maybeSingle();
    if (dayData) await logEdit((dayData as DayRow).trip_id, actorTripMemberId, "itinerary_item", itemId, { action: "move", direction });
  }

  async addDayAfter(tripId: string, afterDayId: string, actorTripMemberId: string): Promise<Day> {
    const db = client();
    const { data: anchorData, error: anchorErr } = await db.from("days").select("*").eq("id", afterDayId).maybeSingle();
    if (anchorErr) throw new Error(anchorErr.message);
    if (!anchorData || (anchorData as DayRow).trip_id !== tripId) throw new Error("Day not found");
    const anchor = dayFromRow(anchorData as DayRow);

    const { data: laterData, error: laterErr } = await db
      .from("days")
      .select("*")
      .eq("trip_id", tripId)
      .gt("day_index", anchor.dayIndex)
      .order("day_index", { ascending: false }); // shift highest first, avoids transient (trip_id, date) collisions
    if (laterErr) throw new Error(laterErr.message);
    const laterDays = (laterData ?? []).map((r) => dayFromRow(r as DayRow));

    for (const day of laterDays) {
      const shiftedDate = DateTime.fromISO(day.date, { zone: day.timezone || "Etc/UTC" }).plus({ days: 1 }).toISODate()!;
      assertNoError(await db.from("days").update({ date: shiftedDate, day_index: day.dayIndex + 1 }).eq("id", day.id));
    }

    const newDate = DateTime.fromISO(anchor.date, { zone: anchor.timezone || "Etc/UTC" }).plus({ days: 1 }).toISODate()!;
    const newDayRow: DayRow = {
      id: uuid(),
      trip_id: tripId,
      date: newDate,
      day_index: anchor.dayIndex + 1,
      city_place_id: anchor.cityPlaceId ?? null,
      timezone: anchor.timezone,
      is_travel_day: false
    };
    assertNoError(await db.from("days").insert(newDayRow));

    const { data: tripData } = await db.from("trips").select("*").eq("id", tripId).maybeSingle();
    if (tripData) {
      const trip = tripFromRow(tripData as TripRow);
      const tripEnd = DateTime.fromISO(trip.endDate, { zone: "utc" });
      const newEnd = DateTime.fromISO(newDate, { zone: "utc" });
      if (newEnd > tripEnd) assertNoError(await db.from("trips").update({ end_date: newDate }).eq("id", tripId));
    }

    await logEdit(tripId, actorTripMemberId, "day", newDayRow.id, { action: "create", afterDayId, date: newDate });
    return dayFromRow(newDayRow);
  }

  async deleteDay(dayId: string, actorTripMemberId: string): Promise<void> {
    const db = client();
    const { data: dayData } = await db.from("days").select("*").eq("id", dayId).maybeSingle();
    if (!dayData) return;
    const day = dayFromRow(dayData as DayRow);

    const { count: siblingCount, error: countErr } = await db
      .from("days")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", day.tripId);
    if (countErr) throw new Error(countErr.message);
    if ((siblingCount ?? 0) <= 1) throw new Error("A trip needs at least one day — can't delete the last one.");

    // itinerary_items/transport rows for this day cascade-delete automatically
    // (both have `references days(id) on delete cascade` in db/schema.sql).
    assertNoError(await db.from("days").delete().eq("id", dayId));

    const { data: laterData, error: laterErr } = await db
      .from("days")
      .select("*")
      .eq("trip_id", day.tripId)
      .gt("day_index", day.dayIndex)
      .order("day_index", { ascending: true }); // shift lowest first, avoids transient (trip_id, date) collisions
    if (laterErr) throw new Error(laterErr.message);
    const laterDays = (laterData ?? []).map((r) => dayFromRow(r as DayRow));

    for (const later of laterDays) {
      const shiftedDate = DateTime.fromISO(later.date, { zone: later.timezone || "Etc/UTC" }).minus({ days: 1 }).toISODate()!;
      assertNoError(await db.from("days").update({ date: shiftedDate, day_index: later.dayIndex - 1 }).eq("id", later.id));
    }

    const { data: remainingData } = await db.from("days").select("*").eq("trip_id", day.tripId);
    const remaining = (remainingData ?? []).map((r) => dayFromRow(r as DayRow));
    if (remaining.length > 0) {
      const { data: tripData } = await db.from("trips").select("*").eq("id", day.tripId).maybeSingle();
      if (tripData) {
        const trip = tripFromRow(tripData as TripRow);
        const lastDate = remaining.reduce((max, d) => (d.date > max ? d.date : max), remaining[0]!.date);
        if (lastDate !== trip.endDate) assertNoError(await db.from("trips").update({ end_date: lastDate }).eq("id", day.tripId));
      }
    }

    await logEdit(day.tripId, actorTripMemberId, "day", dayId, { action: "delete", date: day.date });
  }

  async listDismissedRecommendationIds(tripId: string, type: AIRecommendation["type"]): Promise<string[]> {
    const db = client();
    const { data, error } = await db
      .from("ai_recommendations")
      .select("id")
      .eq("trip_id", tripId)
      .eq("type", type)
      .neq("status", "pending");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => (r as { id: string }).id);
  }

  async dismissRecommendation(tripId: string, id: string, type: AIRecommendation["type"], actorTripMemberId: string): Promise<void> {
    const db = client();
    const row: AIRecommendationRow = {
      id,
      trip_id: tripId,
      type,
      payload: {},
      status: "dismissed",
      created_at: new Date().toISOString(),
      resolved_by_trip_member_id: actorTripMemberId
    };
    const { error } = await db.from("ai_recommendations").upsert(row);
    if (error) throw new Error(error.message);
  }

  async createPoll(tripId: string, actorTripMemberId: string, question: string, optionLabels: string[]): Promise<PollWithResults> {
    const db = client();
    const pollId = uuid();
    const pollRow: PollRow = {
      id: pollId,
      trip_id: tripId,
      day_id: null,
      question,
      status: "open",
      created_by_trip_member_id: actorTripMemberId,
      created_at: new Date().toISOString()
    };
    assertNoError(await db.from("polls").insert(pollRow));
    if (optionLabels.length > 0) {
      assertNoError(await db.from("poll_options").insert(optionLabels.map((label) => ({ id: uuid(), poll_id: pollId, label }))));
    }
    await logEdit(tripId, actorTripMemberId, "poll", pollId, { action: "create", question });
    return hydratePoll(pollRow);
  }

  async listPolls(tripId: string): Promise<PollWithResults[]> {
    const db = client();
    const { data, error } = await db.from("polls").select("*").eq("trip_id", tripId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data ?? []).map((r) => hydratePoll(r as PollRow)));
  }

  async getPoll(pollId: string): Promise<PollWithResults | null> {
    const db = client();
    const { data, error } = await db.from("polls").select("*").eq("id", pollId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? hydratePoll(data as PollRow) : null;
  }

  async castVote(pollId: string, tripMemberId: string, optionId: string): Promise<void> {
    const db = client();
    const { data: existing, error: findErr } = await db
      .from("poll_votes")
      .select("*")
      .eq("poll_id", pollId)
      .eq("trip_member_id", tripMemberId)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (existing) {
      const { error } = await db.from("poll_votes").update({ option_id: optionId }).eq("id", (existing as PollVoteRow).id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("poll_votes").insert({ id: uuid(), poll_id: pollId, option_id: optionId, trip_member_id: tripMemberId });
      if (error) throw new Error(error.message);
    }
  }

  async closePoll(pollId: string, actorTripMemberId: string): Promise<void> {
    const db = client();
    const { data, error } = await db.from("polls").select("*").eq("id", pollId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return;
    const poll = pollFromRow(data as PollRow);
    assertNoError(await db.from("polls").update({ status: "closed" }).eq("id", pollId));
    await logEdit(poll.tripId, actorTripMemberId, "poll", pollId, { action: "close" });
  }
}
