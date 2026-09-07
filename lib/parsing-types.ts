import type { ItineraryItemType, TransportMode } from "./types";

// The contract between "AI (or heuristic) parser output" and "repository
// input." Everything here is provisional until the organizer confirms it on
// the review screen — nothing in this shape has touched the database yet.
//
// `photoUrl` fields (on ParsedTrip/ParsedDay/ParsedItem/ParsedHotel) are a
// second, separate kind of provisional data: a best-effort real-photo guess
// made by name alone (lib/parsing/attachPhotos.ts), before any real Place
// record exists to key a proper PlaceEnrichment cache entry off of. They
// exist purely so the Review & Confirm screen can show real photos instead
// of only deterministic placeholder tiles — see components/create/ReviewItinerary.tsx.
// Once the trip is actually confirmed, Automatic Real-Photo & Detail
// Resolution takes over for good via the normal Place-keyed enrichment path
// (lib/enrichment/service.ts), which is the one that's actually cached.

export interface ParsedItem {
  type: ItineraryItemType;
  title: string;
  startTime?: string; // "HH:mm", local to the day's destination timezone
  endTime?: string;
  placeName?: string;
  cityHint?: string;
  notes?: string;
  source: "organizer_input" | "ai_parsed";
  confidence: number; // 0-1
  needsReview: boolean;
  reviewReason?: string;
  photoUrl?: string;
}

export interface ParsedHotel {
  placeName: string;
  cityHint?: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  /** Booking/confirmation number, copied verbatim from a reservation table or booking confirmation, if the document states one. */
  referenceNumber?: string;
  confidence: number;
  photoUrl?: string;
}

export interface ParsedTransport {
  mode: TransportMode;
  fromPlaceName?: string;
  toPlaceName?: string;
  departTime?: string;
  arriveTime?: string;
  carrier?: string;
  /** Booking/confirmation number, flight or train number — whatever the reservation table or booking confirmation actually printed, verbatim. */
  referenceNumber?: string;
  confidence: number;
}

export interface ParsedDay {
  date: string; // YYYY-MM-DD
  cityHint?: string;
  isTravelDay: boolean;
  items: ParsedItem[];
  hotel?: ParsedHotel;
  transport?: ParsedTransport[];
  photoUrl?: string;
}

export interface ParsedTrip {
  name: string;
  countries: string[];
  startDate: string;
  endDate: string;
  days: ParsedDay[];
  warnings: string[]; // human-readable flags surfaced on the review screen
  coverPhotoUrl?: string;
}

export type ParseStage =
  | "extracting"
  | "reading"
  | "dates"
  | "hotels"
  | "places"
  | "transport"
  | "finalizing"
  | "done";

export const PARSE_STAGE_LABELS: Record<ParseStage, string> = {
  extracting: "Reading your file or text…",
  reading: "Reading your itinerary…",
  dates: "Extracting dates and cities…",
  hotels: "Identifying hotels and stays…",
  places: "Recognizing attractions and restaurants…",
  transport: "Mapping flights and trains…",
  finalizing: "Checking for gaps and ambiguity…",
  done: "Done"
};

export const PARSE_STAGE_ORDER: ParseStage[] = [
  "extracting",
  "reading",
  "dates",
  "hotels",
  "places",
  "transport",
  "finalizing",
  "done"
];
