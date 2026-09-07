// Shared data model — mirrors the approved product plan (see the published
// architecture doc). Canonical organizer facts, member-entered data, and
// AI/externally-sourced data are kept in visibly separate shapes on purpose:
// nothing here lets an enrichment field silently masquerade as a booking fact.

export type Role = "organizer" | "member";

export type ProvenanceSource = "organizer_input" | "member_input" | "ai_parsed" | "ai_generated" | "external_api";

export interface Trip {
  id: string;
  name: string;
  coverImage?: string;
  startDate: string; // YYYY-MM-DD, in the trip's overall reference frame
  endDate: string;
  countries: string[];
  status: "draft" | "confirmed" | "active" | "completed";
  inviteCode: string;
  createdByTripMemberId: string;
  createdAt: string;
}

export interface TripMember {
  id: string;
  tripId: string;
  displayName: string;
  role: Role;
  joinedAt: string;
}

export interface FoodRestriction {
  id: string;
  tripMemberId: string;
  type: "allergy" | "medical" | "religious" | "diet";
  label: string; // e.g. "Peanut allergy", "Gluten-free (celiac)"
  notes?: string;
  // Always a hard constraint — this table exists specifically so a
  // restriction can never be conflated with a soft preference.
}

export interface FoodPreference {
  id: string;
  tripMemberId: string;
  category: "like" | "dislike";
  label: string;
  weight: number; // 1-5, soft signal only
}

export interface MemberProfile {
  tripMemberId: string;
  restrictions: FoodRestriction[];
  preferences: FoodPreference[];
}

/** A real-world place: hotel, attraction, restaurant, station, airport, neighborhood... */
export interface Place {
  id: string;
  canonicalName: string;
  category: "hotel" | "attraction" | "restaurant" | "station" | "airport" | "neighborhood" | "other";
  city: string;
  country: string;
  timezone: string; // IANA zone, e.g. "Asia/Tokyo" — the timezone anchor for everything here
  lat?: number;
  lng?: number;
  addressLocalScript?: string; // native script, sourced from geocoding — never AI free text
  addressTranslit?: string;
  geocodeSource?: ProvenanceSource;
}

export interface PlaceEnrichmentPracticalInfo {
  whatToDo?: string; // a short "what to do here" paragraph — richer than the one-line description
  nearestStation?: string;
  checkIn?: string;
  checkOut?: string;
  amenities?: string[];
  estimatedVisitMinutes?: number; // optimal visit length, in minutes
  familyTips?: string;
  openingHours?: string; // e.g. "9:00–17:00 (last entry 16:30), closed Mondays" — never invented, omitted if unknown
  estimatedCost?: string; // e.g. "Adults ¥1,000 / kids free" — a rough figure, not a live price feed
  familyAccessibility?: string; // stroller/kid-friendliness: terrain, stairs, crowding, nursing/changing facilities
}

/** AI-written or provider-sourced color on top of a Place. Never overwrites Place's verified fields. */
export interface PlaceEnrichment {
  placeId: string;
  description?: string;
  /**
   * Hebrew counterpart of `description`. For textOrigin "claude" this is filled
   * atomically in the SAME Claude call that produced `description` (see
   * lib/ai/enrichPlace.ts) — Automatic Bilingual Generation, not a follow-up
   * translation pass — so an English viewer and a Hebrew viewer of the same
   * freshly-fetched place both get real, natural-language content with a
   * single fetch and a single cache entry. Absent on cache entries fetched
   * before this field existed, or in the rare case Claude omitted it; the
   * display layer (lib/i18n/localizeEnrichment.ts) falls back to `description`
   * when that happens, same honest-gap approach used for curated/generic text.
   */
  descriptionHe?: string;
  /** Natural Hebrew name/transliteration for this place (e.g. "מקדש מייג'י" for "Meiji Shrine"), from the same bilingual Claude call. Place.canonicalName itself is never touched — this is presentation-only, same rule as everything else in this record. */
  nameHe?: string;
  photos: string[];
  /** Which real photo API (if any) `photos` came from — unset means they're still the deterministic placeholder tiles. */
  photoSource?: "google_places" | "unsplash" | "wikipedia";
  /** Which text source populated description/practicalInfo below — lets the display layer pick a Hebrew translation for curated/generic content (see lib/i18n/placeContentHe.ts); live Claude text carries its own Hebrew twin directly on this record (descriptionHe/practicalInfoHe) instead. */
  textOrigin?: "claude" | "curated" | "generic" | "wikipedia";
  practicalInfo?: PlaceEnrichmentPracticalInfo;
  /** Hebrew counterpart of `practicalInfo`, same bilingual-in-one-call origin as `descriptionHe`. Only fields Claude actually filled in Hebrew are present. */
  practicalInfoHe?: PlaceEnrichmentPracticalInfo;
  source: ProvenanceSource;
  fetchedAt: string;
  staleAfter: string;
}

export interface Day {
  id: string;
  tripId: string;
  date: string; // YYYY-MM-DD, wall-clock date in `timezone`
  dayIndex: number; // 1-based, "Day 12 of 30"
  cityPlaceId?: string;
  timezone: string; // IANA zone this day's times are anchored to — the destination's zone, never the device's
  isTravelDay: boolean;
}

export type ItineraryItemType = "activity" | "meal" | "transport" | "note" | "free_time";

export interface ItineraryItem {
  id: string;
  dayId: string;
  type: ItineraryItemType;
  title: string; // organizer's own words when source = organizer_input — never silently rewritten
  startTime?: string; // "HH:mm" local wall-clock time in the Day's timezone
  endTime?: string;
  placeId?: string;
  orderIndex: number;
  notes?: string;
  source: ProvenanceSource;
  confidence?: number; // 0-1, only meaningful while source = ai_parsed and pending review
  needsReview?: boolean;
}

export interface HotelStay {
  id: string;
  tripId: string;
  placeId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  confirmationNumber?: string;
  source: ProvenanceSource;
}

export type TransportMode = "flight" | "train" | "car" | "bus" | "ferry" | "other";

export interface Transport {
  id: string;
  tripId: string;
  dayId?: string;
  mode: TransportMode;
  fromPlaceId?: string;
  toPlaceId?: string;
  departTime?: string; // ISO instant when both endpoints have known timezones
  arriveTime?: string;
  carrier?: string;
  referenceNumber?: string;
  seatInfo?: string;
  source: ProvenanceSource;
}

export interface Reservation {
  id: string;
  itineraryItemId: string;
  type: "restaurant" | "activity" | "ticket";
  time?: string;
  partySize?: number;
  confirmationNumber?: string;
  notes?: string;
  source: ProvenanceSource;
}

export interface AIRecommendation {
  id: string;
  tripId: string;
  type: "trip_check_issue" | "replacement" | "save_our_day_plan" | "food_match";
  payload: Record<string, unknown>;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
  resolvedByTripMemberId?: string;
}

/** A simple single-choice family poll — e.g. "What should we do this afternoon?" */
export interface Poll {
  id: string;
  tripId: string;
  dayId?: string;
  question: string;
  createdByTripMemberId: string;
  status: "open" | "closed";
  createdAt: string;
}

export interface PollOption {
  id: string;
  pollId: string;
  label: string;
}

/** One member's active choice on a poll — voting again replaces it rather than adding a second row. */
export interface PollVote {
  id: string;
  pollId: string;
  optionId: string;
  tripMemberId: string;
}

export interface EditHistoryEntry {
  id: string;
  tripId: string;
  actorTripMemberId: string;
  entityType: string;
  entityId: string;
  diff: Record<string, unknown>;
  createdAt: string;
}

/** Full hydrated shape used by the Today screen and the parse-preview screen. */
export interface DayWithItems extends Day {
  city?: Place;
  items: (ItineraryItem & { place?: Place })[];
  hotel?: (HotelStay & { place: Place }) | undefined;
  transport?: Transport[];
}

export interface TripBundle {
  trip: Trip;
  days: DayWithItems[];
}
