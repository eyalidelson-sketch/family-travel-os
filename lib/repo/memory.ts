import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import type {
  AIRecommendation,
  Day,
  DayWithItems,
  EditHistoryEntry,
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
import type { ParsedTrip } from "../parsing-types";
import { placesProvider } from "../providers/places";
import { places } from "./placeStore";
import type { ItemInput, ItemPatch, PollWithResults, TripRepository } from "./types";

// In-memory store. This is the zero-config path: it lets the whole app run
// with `npm run dev` and no external services, while conforming to the exact
// same TripRepository interface a SupabaseTripRepository will implement.
// Kept on `globalThis` so it survives Next.js dev-mode module reloads.
// Place/PlaceEnrichment live in ./placeStore instead — see that file.

interface Store {
  trips: Map<string, Trip>;
  members: Map<string, TripMember>;
  days: Map<string, Day>;
  items: Map<string, ItineraryItem>;
  hotelStays: Map<string, HotelStay>;
  transport: Map<string, Transport>;
  inviteCodeIndex: Map<string, string>; // code -> tripId
  foodRestrictions: Map<string, FoodRestriction>;
  foodPreferences: Map<string, FoodPreference>;
  editHistory: EditHistoryEntry[];
  recommendations: Map<string, AIRecommendation>;
  polls: Map<string, Poll>;
  pollOptions: Map<string, PollOption>;
  pollVotes: Map<string, PollVote>;
}

function freshStore(): Store {
  return {
    trips: new Map(),
    members: new Map(),
    days: new Map(),
    items: new Map(),
    hotelStays: new Map(),
    transport: new Map(),
    inviteCodeIndex: new Map(),
    foodRestrictions: new Map(),
    foodPreferences: new Map(),
    editHistory: [],
    recommendations: new Map(),
    polls: new Map(),
    pollOptions: new Map(),
    pollVotes: new Map()
  };
}

const globalForStore = globalThis as unknown as { __travelOsStore?: Store };
const store = globalForStore.__travelOsStore ?? freshStore();
globalForStore.__travelOsStore = store;

const AMBIGUOUS_CHARS = /[0O1ILU]/g;
function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no 0/O/1/I/L/U
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code.replace(AMBIGUOUS_CHARS, "7");
}

function logEdit(tripId: string, actorTripMemberId: string, entityType: string, entityId: string, diff: Record<string, unknown>) {
  store.editHistory.push({
    id: uuid(),
    tripId,
    actorTripMemberId,
    entityType,
    entityId,
    diff,
    createdAt: new Date().toISOString()
  });
}

async function upsertPlace(name: string, cityHint?: string): Promise<Place> {
  const dedupeKey = `${name.trim().toLowerCase()}::${(cityHint ?? "").trim().toLowerCase()}`;
  const existing = [...places.values()].find(
    (p) => `${p.canonicalName.toLowerCase()}::${p.city.toLowerCase()}` === dedupeKey
  );
  if (existing) return existing;

  const resolved = await placesProvider.resolve(name, cityHint);
  const place: Place = {
    id: uuid(),
    canonicalName: resolved.canonicalName,
    category: resolved.category,
    city: resolved.city,
    country: resolved.country,
    timezone: resolved.timezone,
    lat: resolved.lat,
    lng: resolved.lng,
    addressLocalScript: resolved.addressLocalScript,
    addressTranslit: resolved.addressTranslit,
    geocodeSource: resolved.verified ? "external_api" : "ai_generated"
  };
  places.set(place.id, place);
  return place;
}

function hydrateDay(day: Day): DayWithItems {
  const items = [...store.items.values()]
    .filter((i) => i.dayId === day.id)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((i) => ({ ...i, place: i.placeId ? places.get(i.placeId) : undefined }));

  const hotelStay = [...store.hotelStays.values()].find((h) => {
    const place = places.get(h.placeId);
    return place && day.date >= h.checkIn && day.date < h.checkOut;
  });

  const transport = [...store.transport.values()].filter((t) => t.dayId === day.id);

  return {
    ...day,
    city: day.cityPlaceId ? places.get(day.cityPlaceId) : undefined,
    items,
    hotel: hotelStay ? { ...hotelStay, place: places.get(hotelStay.placeId)! } : undefined,
    transport
  };
}

function hydratePoll(poll: Poll): PollWithResults {
  const options = [...store.pollOptions.values()].filter((o) => o.pollId === poll.id);
  const votes = [...store.pollVotes.values()].filter((v) => v.pollId === poll.id);
  return { poll, options, votes };
}

function nextOrderIndex(dayId: string): number {
  const existing = [...store.items.values()].filter((i) => i.dayId === dayId);
  return existing.length === 0 ? 0 : Math.max(...existing.map((i) => i.orderIndex)) + 1;
}

export class MemoryTripRepository implements TripRepository {
  async createTripFromParsed(parsed: ParsedTrip, organizerName: string): Promise<TripBundle> {
    const tripId = uuid();
    const organizerId = uuid();

    let code = generateInviteCode();
    while (store.inviteCodeIndex.has(code)) code = generateInviteCode();

    const trip: Trip = {
      id: tripId,
      name: parsed.name,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      countries: parsed.countries,
      status: "confirmed",
      inviteCode: code,
      createdByTripMemberId: organizerId,
      createdAt: new Date().toISOString()
    };
    store.trips.set(tripId, trip);
    store.inviteCodeIndex.set(code, tripId);

    const organizer: TripMember = {
      id: organizerId,
      tripId,
      displayName: organizerName,
      role: "organizer",
      joinedAt: new Date().toISOString()
    };
    store.members.set(organizerId, organizer);

    const countrySet = new Set<string>();

    for (const [index, parsedDay] of parsed.days.entries()) {
      const cityPlace = parsedDay.cityHint ? await upsertPlace(parsedDay.cityHint, parsedDay.cityHint) : undefined;
      const timezone = cityPlace?.timezone ?? "Etc/UTC";
      if (cityPlace?.country) countrySet.add(cityPlace.country);

      const day: Day = {
        id: uuid(),
        tripId,
        date: parsedDay.date,
        dayIndex: index + 1,
        cityPlaceId: cityPlace?.id,
        timezone,
        isTravelDay: parsedDay.isTravelDay
      };
      store.days.set(day.id, day);

      for (const [itemIndex, parsedItem] of parsedDay.items.entries()) {
        const place = parsedItem.placeName
          ? await upsertPlace(parsedItem.placeName, parsedItem.cityHint ?? parsedDay.cityHint)
          : undefined;

        const item: ItineraryItem = {
          id: uuid(),
          dayId: day.id,
          type: parsedItem.type,
          title: parsedItem.title,
          startTime: parsedItem.startTime,
          endTime: parsedItem.endTime,
          placeId: place?.id,
          orderIndex: itemIndex,
          notes: parsedItem.notes,
          source: parsedItem.source,
          confidence: parsedItem.confidence,
          needsReview: parsedItem.needsReview
        };
        store.items.set(item.id, item);
      }

      if (parsedDay.hotel) {
        const place = await upsertPlace(parsedDay.hotel.placeName, parsedDay.hotel.cityHint ?? parsedDay.cityHint);
        const existing = [...store.hotelStays.values()].find(
          (h) => h.placeId === place.id && h.checkIn === parsedDay.hotel!.checkIn
        );
        if (!existing) {
          const stay: HotelStay = {
            id: uuid(),
            tripId,
            placeId: place.id,
            checkIn: parsedDay.hotel.checkIn,
            checkOut: parsedDay.hotel.checkOut,
            confirmationNumber: parsedDay.hotel.referenceNumber,
            source: "organizer_input"
          };
          store.hotelStays.set(stay.id, stay);
        }
      }

      if (parsedDay.transport) {
        for (const t of parsedDay.transport) {
          const fromPlace = t.fromPlaceName ? await upsertPlace(t.fromPlaceName, parsedDay.cityHint) : undefined;
          const toPlace = t.toPlaceName ? await upsertPlace(t.toPlaceName, parsedDay.cityHint) : undefined;
          const transport: Transport = {
            id: uuid(),
            tripId,
            dayId: day.id,
            mode: t.mode,
            fromPlaceId: fromPlace?.id,
            toPlaceId: toPlace?.id,
            departTime: t.departTime,
            arriveTime: t.arriveTime,
            carrier: t.carrier,
            referenceNumber: t.referenceNumber,
            source: "organizer_input"
          };
          store.transport.set(transport.id, transport);
        }
      }
    }

    if (trip.countries.length === 0 && countrySet.size > 0) {
      trip.countries = [...countrySet];
    }

    return (await this.getTripBundle(tripId))!;
  }

  async getTripBundle(tripId: string): Promise<TripBundle | null> {
    const trip = store.trips.get(tripId);
    if (!trip) return null;
    const days = [...store.days.values()]
      .filter((d) => d.tripId === tripId)
      .sort((a, b) => a.dayIndex - b.dayIndex)
      .map(hydrateDay);
    return { trip, days };
  }

  async getTripByInviteCode(code: string): Promise<Trip | null> {
    const tripId = store.inviteCodeIndex.get(code.trim().toUpperCase());
    if (!tripId) return null;
    return store.trips.get(tripId) ?? null;
  }

  async joinTrip(tripId: string, displayName: string): Promise<TripMember> {
    const member: TripMember = {
      id: uuid(),
      tripId,
      displayName,
      role: "member",
      joinedAt: new Date().toISOString()
    };
    store.members.set(member.id, member);
    return member;
  }

  async getTripMember(memberId: string): Promise<TripMember | null> {
    return store.members.get(memberId) ?? null;
  }

  async listTripMembers(tripId: string): Promise<TripMember[]> {
    return [...store.members.values()].filter((m) => m.tripId === tripId).sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  }

  async getMemberProfile(tripMemberId: string): Promise<MemberProfile> {
    return {
      tripMemberId,
      restrictions: [...store.foodRestrictions.values()].filter((r) => r.tripMemberId === tripMemberId),
      preferences: [...store.foodPreferences.values()].filter((p) => p.tripMemberId === tripMemberId)
    };
  }

  async addFoodRestriction(tripMemberId: string, input: Omit<FoodRestriction, "id" | "tripMemberId">): Promise<FoodRestriction> {
    const restriction: FoodRestriction = { id: uuid(), tripMemberId, ...input };
    store.foodRestrictions.set(restriction.id, restriction);
    return restriction;
  }

  async removeFoodRestriction(id: string): Promise<void> {
    store.foodRestrictions.delete(id);
  }

  async addFoodPreference(tripMemberId: string, input: Omit<FoodPreference, "id" | "tripMemberId">): Promise<FoodPreference> {
    const preference: FoodPreference = { id: uuid(), tripMemberId, ...input };
    store.foodPreferences.set(preference.id, preference);
    return preference;
  }

  async removeFoodPreference(id: string): Promise<void> {
    store.foodPreferences.delete(id);
  }

  async addItineraryItem(dayId: string, actorTripMemberId: string, input: ItemInput): Promise<ItineraryItem> {
    const day = store.days.get(dayId);
    if (!day) throw new Error("Day not found");
    const place = input.placeName ? await upsertPlace(input.placeName, undefined) : undefined;

    const item: ItineraryItem = {
      id: uuid(),
      dayId,
      type: input.type,
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      placeId: place?.id,
      orderIndex: nextOrderIndex(dayId),
      notes: input.notes,
      source: "organizer_input",
      needsReview: false
    };
    store.items.set(item.id, item);
    logEdit(day.tripId, actorTripMemberId, "itinerary_item", item.id, { action: "create", title: item.title });
    return item;
  }

  async updateItineraryItem(itemId: string, actorTripMemberId: string, patch: ItemPatch): Promise<ItineraryItem> {
    const existing = store.items.get(itemId);
    if (!existing) throw new Error("Item not found");
    const day = store.days.get(existing.dayId);

    let placeId = existing.placeId;
    if (patch.placeName !== undefined) {
      placeId = patch.placeName ? (await upsertPlace(patch.placeName, undefined)).id : undefined;
    }

    const updated: ItineraryItem = {
      ...existing,
      title: patch.title ?? existing.title,
      type: (patch.type as ItineraryItemType) ?? existing.type,
      startTime: patch.startTime === undefined ? existing.startTime : patch.startTime || undefined,
      endTime: patch.endTime === undefined ? existing.endTime : patch.endTime || undefined,
      notes: patch.notes === undefined ? existing.notes : patch.notes,
      placeId,
      source: "organizer_input",
      needsReview: false
    };
    store.items.set(itemId, updated);
    if (day) logEdit(day.tripId, actorTripMemberId, "itinerary_item", itemId, { action: "update", patch });
    return updated;
  }

  async deleteItineraryItem(itemId: string, actorTripMemberId: string): Promise<void> {
    const existing = store.items.get(itemId);
    if (!existing) return;
    const day = store.days.get(existing.dayId);
    store.items.delete(itemId);
    if (day) logEdit(day.tripId, actorTripMemberId, "itinerary_item", itemId, { action: "delete", title: existing.title });
  }

  async moveItineraryItem(itemId: string, actorTripMemberId: string, direction: "up" | "down"): Promise<void> {
    const existing = store.items.get(itemId);
    if (!existing) return;
    const siblings = [...store.items.values()]
      .filter((i) => i.dayId === existing.dayId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = siblings.findIndex((i) => i.id === itemId);
    const swapWith = direction === "up" ? siblings[idx - 1] : siblings[idx + 1];
    if (!swapWith) return;

    const a = existing.orderIndex;
    const b = swapWith.orderIndex;
    store.items.set(existing.id, { ...existing, orderIndex: b });
    store.items.set(swapWith.id, { ...swapWith, orderIndex: a });

    const day = store.days.get(existing.dayId);
    if (day) logEdit(day.tripId, actorTripMemberId, "itinerary_item", itemId, { action: "move", direction });
  }

  async addDayAfter(tripId: string, afterDayId: string, actorTripMemberId: string): Promise<Day> {
    const anchor = store.days.get(afterDayId);
    if (!anchor || anchor.tripId !== tripId) throw new Error("Day not found");

    const laterDays = [...store.days.values()]
      .filter((d) => d.tripId === tripId && d.dayIndex > anchor.dayIndex)
      .sort((a, b) => b.dayIndex - a.dayIndex); // shift highest first, avoids transient collisions

    for (const day of laterDays) {
      const shiftedDate = DateTime.fromISO(day.date, { zone: day.timezone || "Etc/UTC" }).plus({ days: 1 }).toISODate()!;
      store.days.set(day.id, { ...day, date: shiftedDate, dayIndex: day.dayIndex + 1 });
    }

    const newDate = DateTime.fromISO(anchor.date, { zone: anchor.timezone || "Etc/UTC" }).plus({ days: 1 }).toISODate()!;
    const newDay: Day = {
      id: uuid(),
      tripId,
      date: newDate,
      dayIndex: anchor.dayIndex + 1,
      cityPlaceId: anchor.cityPlaceId,
      timezone: anchor.timezone,
      isTravelDay: false
    };
    store.days.set(newDay.id, newDay);

    const trip = store.trips.get(tripId);
    if (trip) {
      const tripEnd = DateTime.fromISO(trip.endDate, { zone: "utc" });
      const newEnd = DateTime.fromISO(newDate, { zone: "utc" });
      if (newEnd > tripEnd) store.trips.set(tripId, { ...trip, endDate: newDate });
    }

    logEdit(tripId, actorTripMemberId, "day", newDay.id, { action: "create", afterDayId, date: newDate });
    return newDay;
  }

  async deleteDay(dayId: string, actorTripMemberId: string): Promise<void> {
    const day = store.days.get(dayId);
    if (!day) return;
    const siblingCount = [...store.days.values()].filter((d) => d.tripId === day.tripId).length;
    if (siblingCount <= 1) throw new Error("A trip needs at least one day — can't delete the last one.");

    for (const item of [...store.items.values()]) {
      if (item.dayId === dayId) store.items.delete(item.id);
    }
    for (const t of [...store.transport.values()]) {
      if (t.dayId === dayId) store.transport.delete(t.id);
    }
    store.days.delete(dayId);

    const laterDays = [...store.days.values()]
      .filter((d) => d.tripId === day.tripId && d.dayIndex > day.dayIndex)
      .sort((a, b) => a.dayIndex - b.dayIndex); // shift lowest first, avoids transient collisions

    for (const later of laterDays) {
      const shiftedDate = DateTime.fromISO(later.date, { zone: later.timezone || "Etc/UTC" }).minus({ days: 1 }).toISODate()!;
      store.days.set(later.id, { ...later, date: shiftedDate, dayIndex: later.dayIndex - 1 });
    }

    const trip = store.trips.get(day.tripId);
    const remaining = [...store.days.values()].filter((d) => d.tripId === day.tripId);
    if (trip && remaining.length > 0) {
      const lastDate = remaining.reduce((max, d) => (d.date > max ? d.date : max), remaining[0]!.date);
      if (lastDate !== trip.endDate) store.trips.set(day.tripId, { ...trip, endDate: lastDate });
    }

    logEdit(day.tripId, actorTripMemberId, "day", dayId, { action: "delete", date: day.date });
  }

  async listDismissedRecommendationIds(tripId: string, type: AIRecommendation["type"]): Promise<string[]> {
    return [...store.recommendations.values()]
      .filter((r) => r.tripId === tripId && r.type === type && r.status !== "pending")
      .map((r) => r.id);
  }

  async dismissRecommendation(tripId: string, id: string, type: AIRecommendation["type"], actorTripMemberId: string): Promise<void> {
    store.recommendations.set(id, {
      id,
      tripId,
      type,
      payload: {},
      status: "dismissed",
      createdAt: new Date().toISOString(),
      resolvedByTripMemberId: actorTripMemberId
    });
  }

  async createPoll(tripId: string, actorTripMemberId: string, question: string, optionLabels: string[]): Promise<PollWithResults> {
    const poll: Poll = {
      id: uuid(),
      tripId,
      question,
      createdByTripMemberId: actorTripMemberId,
      status: "open",
      createdAt: new Date().toISOString()
    };
    store.polls.set(poll.id, poll);
    for (const label of optionLabels) {
      const option: PollOption = { id: uuid(), pollId: poll.id, label };
      store.pollOptions.set(option.id, option);
    }
    logEdit(tripId, actorTripMemberId, "poll", poll.id, { action: "create", question });
    return hydratePoll(poll);
  }

  async listPolls(tripId: string): Promise<PollWithResults[]> {
    return [...store.polls.values()]
      .filter((p) => p.tripId === tripId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(hydratePoll);
  }

  async getPoll(pollId: string): Promise<PollWithResults | null> {
    const poll = store.polls.get(pollId);
    return poll ? hydratePoll(poll) : null;
  }

  async castVote(pollId: string, tripMemberId: string, optionId: string): Promise<void> {
    const existing = [...store.pollVotes.values()].find((v) => v.pollId === pollId && v.tripMemberId === tripMemberId);
    if (existing) {
      store.pollVotes.set(existing.id, { ...existing, optionId });
    } else {
      const vote: PollVote = { id: uuid(), pollId, optionId, tripMemberId };
      store.pollVotes.set(vote.id, vote);
    }
  }

  async closePoll(pollId: string, actorTripMemberId: string): Promise<void> {
    const poll = store.polls.get(pollId);
    if (!poll) return;
    store.polls.set(pollId, { ...poll, status: "closed" });
    logEdit(poll.tripId, actorTripMemberId, "poll", pollId, { action: "close" });
  }
}
