import type { TransportMode } from "../types";
import { inferYear, toISODate, matchShortDate } from "./dateHeuristics";

// Parses the "Reservation Summary" section real travel documents very often
// put up front — separate Hotels / Trains / Rental cars / Key flights
// tables, each row carrying the one thing free-text prose almost never
// includes: an actual booking/confirmation number. This runs once over the
// WHOLE document, independent of and before the day-by-day walk in
// lib/ai/heuristicParser.ts, and its output is then cross-referenced back
// onto each day by date (or by "Car N" label for rental cars) so a
// TRANSPORT cell that just says "Car 1" or "Hokuto 8" can still surface a
// real reference number on the map's transport-connector card — see the
// Combined Pass's Route Map feature.

export interface ReservationHotel {
  checkIn: string; // YYYY-MM-DD, the row's first date
  name: string;
  provider?: string;
  referenceNumber?: string;
}

export interface ReservationTrain {
  date: string;
  trainName: string; // e.g. "Hokuto 8" — matched against a TRANSPORT cell by substring
  routeTime?: string;
  seats?: string;
  referenceNumber?: string;
}

export interface ReservationCar {
  carLabel: string; // e.g. "Car 1" — matched against a TRANSPORT cell's "Car N" mention
  company?: string;
  pickup?: string;
  dropoff?: string;
  referenceNumber?: string;
}

export interface ReservationFlight {
  date: string;
  route?: string;
  time?: string;
  referenceNumber?: string;
}

export interface ReservationSummary {
  hotels: ReservationHotel[];
  trains: ReservationTrain[];
  cars: ReservationCar[];
  flights: ReservationFlight[];
}

const EMPTY_SUMMARY: ReservationSummary = { hotels: [], trains: [], cars: [], flights: [] };

type Section = "hotels" | "trains" | "cars" | "flights" | null;

/**
 * `lines` is the whole document, already split on "\n" (same input the
 * heuristic parser works from). Scans for "Hotels" / "Trains" / "Rental
 * cars" / "Key flights" heading lines, each followed by a `[table]` block
 * whose first row is a header (skipped) and whose remaining rows are
 * pipe-delimited cells (see lib/parsing/extractText.ts's tableToText).
 * Silently returns empty arrays for any section the document doesn't have —
 * this is a bonus enrichment pass, not a requirement.
 */
export function parseReservationSummary(lines: string[], today: Date): ReservationSummary {
  const hotels: ReservationHotel[] = [];
  const trains: ReservationTrain[] = [];
  const cars: ReservationCar[] = [];
  const flights: ReservationFlight[] = [];

  let section: Section = null;
  let inTable = false;
  let headerRowConsumed = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (/^hotels$/i.test(line)) {
      section = "hotels";
      headerRowConsumed = false;
      continue;
    }
    if (/^trains$/i.test(line)) {
      section = "trains";
      headerRowConsumed = false;
      continue;
    }
    if (/^rental cars$/i.test(line)) {
      section = "cars";
      headerRowConsumed = false;
      continue;
    }
    if (/^key flights$/i.test(line)) {
      section = "flights";
      headerRowConsumed = false;
      continue;
    }
    // Any other heading-shaped line (a date header, "Trip Planning
    // Principles", ...) ends the Reservation Summary section.
    if (/^\d{1,2}\s+[A-Za-z]{3,9}/.test(line) || /^trip planning principles$/i.test(line)) {
      section = null;
    }

    if (line === "[table]") {
      inTable = true;
      headerRowConsumed = false;
      continue;
    }
    if (line === "[/table]") {
      inTable = false;
      continue;
    }
    if (!inTable || !section) continue;
    if (!headerRowConsumed) {
      headerRowConsumed = true;
      continue; // the column-header row itself, e.g. "Date | Hotel | Provider | Booking No."
    }

    const cells = line.split("|").map((c) => c.trim());

    if (section === "hotels" && cells.length >= 2) {
      const dm = matchShortDate(cells[0]!);
      if (!dm) continue;
      hotels.push({
        checkIn: toISODate(dm.monthIdx, dm.dayStart, inferYear(dm.monthIdx, dm.dayStart, today)),
        name: cells[1]!,
        provider: cells[2],
        referenceNumber: cells[3]
      });
    } else if (section === "trains" && cells.length >= 2) {
      const dm = matchShortDate(cells[0]!);
      if (!dm) continue;
      trains.push({
        date: toISODate(dm.monthIdx, dm.dayStart, inferYear(dm.monthIdx, dm.dayStart, today)),
        trainName: cells[1]!,
        routeTime: cells[2],
        seats: cells[3],
        referenceNumber: cells[4]
      });
    } else if (section === "cars" && cells.length >= 2) {
      cars.push({
        carLabel: cells[0]!,
        company: cells[1],
        pickup: cells[2],
        dropoff: cells[3],
        referenceNumber: cells[4]
      });
    } else if (section === "flights" && cells.length >= 2) {
      const dm = matchShortDate(cells[0]!);
      if (!dm) continue;
      flights.push({
        date: toISODate(dm.monthIdx, dm.dayStart, inferYear(dm.monthIdx, dm.dayStart, today)),
        route: cells[1],
        time: cells[2],
        referenceNumber: cells[3]
      });
    }
  }

  if (hotels.length === 0 && trains.length === 0 && cars.length === 0 && flights.length === 0) {
    return EMPTY_SUMMARY;
  }
  return { hotels, trains, cars, flights };
}

export interface ClassifiedTransportSegment {
  mode: TransportMode;
  carrier?: string;
  referenceNumber?: string;
}

const CAR_LABEL_RE = /\bcar\s*(\d+)\b/i;
const FLIGHT_TIME_ARROW_RE = /\d{1,2}:\d{2}\s*(?:→|->|-{1,2}>)\s*\d{1,2}:\d{2}/;

/**
 * Turns a TRANSPORT cell's free text (e.g. "Flight 12:35-15:20; Car 1 from
 * 17:00", "Hokuto 8, 09:45-13:35", "Car 2; return at Aomori Yasukata by
 * 15:00") into one or more structured transport legs, cross-referencing the
 * Reservation Summary data above by date, car label, or train name — so a
 * plain "Car 1" mention picks up the real rental company and booking number
 * without the day's own text ever having repeated them.
 */
export function classifyTransportSegments(raw: string, dayDate: string, reservations: ReservationSummary): ClassifiedTransportSegment[] {
  const segments = raw
    .split(/;|(?<!\d)\+(?!\d)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: ClassifiedTransportSegment[] = [];
  for (const seg of segments) {
    const carMatch = seg.match(CAR_LABEL_RE);
    if (carMatch) {
      const label = `Car ${carMatch[1]}`;
      const known = reservations.cars.find((c) => c.carLabel.toLowerCase() === label.toLowerCase());
      out.push({ mode: "car", carrier: known?.company ?? label, referenceNumber: known?.referenceNumber });
      continue;
    }

    const knownTrain = reservations.trains.find((t) => seg.toLowerCase().includes(t.trainName.toLowerCase()));
    if (knownTrain || /\b(hokuto|hayabusa|shinkansen|liner)\b/i.test(seg)) {
      out.push({ mode: "train", carrier: knownTrain?.trainName ?? seg, referenceNumber: knownTrain?.referenceNumber });
      continue;
    }

    if (/\bflight\b/i.test(seg) || FLIGHT_TIME_ARROW_RE.test(seg)) {
      const knownFlight = reservations.flights.find((f) => f.date === dayDate);
      out.push({ mode: "flight", referenceNumber: knownFlight?.referenceNumber });
      continue;
    }

    if (/\bbus\b/i.test(seg)) {
      out.push({ mode: "bus" });
      continue;
    }
    if (/\bferry\b/i.test(seg)) {
      out.push({ mode: "ferry" });
      continue;
    }
    if (/\b(subway|jr|train)\b/i.test(seg)) {
      out.push({ mode: "train" });
      continue;
    }
    if (/\b(shuttle|taxi|transfer|walking)\b/i.test(seg)) {
      out.push({ mode: "other" });
      continue;
    }
    // Anything else ("Optional short Sukayu Onsen bath", stray words left
    // over from a "+"-split like "walking") isn't a real transport leg —
    // silently dropped rather than forced into a mode that doesn't fit.
  }
  return out;
}
