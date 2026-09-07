import type { ParsedDay, ParsedItem, ParsedTransport, ParsedTrip } from "../parsing-types";
import { MONTHS, inferYear, toISODate } from "../parsing/dateHeuristics";
import { matchGazetteer } from "../parsing/placeGazetteer";
import { stripStructuralNoise } from "../parsing/textCleanup";
import { parseReservationSummary, classifyTransportSegments, type ReservationSummary } from "../parsing/reservationSummary";

// Deterministic fallback parser. Used whenever ANTHROPIC_API_KEY is not
// configured, and as a safety net if the Claude call fails or returns
// something that doesn't validate. It understands two shapes:
//
// 1. The product brief's own loose shorthand — dated, one activity per
//    line — for simple pasted text with no tables at all.
// 2. A real Word/PDF export's table structure, as reconstructed by
//    lib/parsing/extractText.ts's `[table]...[/table]` markers: a compact
//    per-day "OVERNIGHT / X | TRANSPORT / Y | DAY TYPE / Z" summary row
//    right under each day's header, a "Recommended schedule" table of
//    "Time | Plan" rows, and a "Reservation Summary" section (Hotels /
//    Trains / Rental cars / Key flights) with real booking numbers.
//
// Shape 2 is what makes this parser usable on a genuinely real, table-heavy
// itinerary with zero Claude API key — see the Combined Pass / "CRITICAL &
// FINAL FIX" work this file was rewritten for. Before this rewrite, every
// table row fell straight through to shape 1's generic "just an activity
// line" fallback, which is what turned raw table noise ("[table]",
// "OVERNIGHT La Vista Daisetsuzan | TRANSPORT Car 1 | DAY TYPE ...") into
// place/day names, broke the Unsplash photo lookups keyed off those names,
// and collapsed the Route Map to a single "Unassigned" stop (its pin's
// fallback initial rendered as a lone "U").

// Two header shapes, tried in order: "September 15 - ..." (month first, the
// product brief's own example) and "15 September - ..." / "9 September -
// Arrival in Seoul" (day first — common in real-world exported itineraries).
// Group order differs between them, so callers check which one matched
// rather than assuming a fixed capture-group layout.
//
// Trailing text is only captured after an explicit dash/colon separator (or
// not at all, for a bare "September 15" header) — never directly glued onto
// the date with just a space. Real documents contain ordinary sentences that
// happen to start with a date too (e.g. a trip-planning note like "12
// September is the main hiking day..." appearing well before that day's own
// real header) — without the separator requirement, a line like that reads
// as a second, spurious "12 September" day header and duplicates the day it
// describes later on.
const DATE_LINE_MONTH_FIRST = new RegExp(
  `^(${MONTHS.join("|")})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*[-–—:]\\s*(.+)|\\s*)$`,
  "i"
);
const DATE_LINE_DAY_FIRST = new RegExp(
  `^(\\d{1,2})(?:st|nd|rd|th)?\\.?\\s+(${MONTHS.join("|")})(?:\\s*[-–—:]\\s*(.+)|\\s*)$`,
  "i"
);

const TRAILING_DATE_MONTH_FIRST = new RegExp(`^(${MONTHS.join("|")})\\.?\\s+(\\d{1,2})`, "i");
const TRAILING_DATE_DAY_FIRST = new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?\\.?\\s+(${MONTHS.join("|")})`, "i");

/** Same month-first-or-day-first tolerance as matchDateLine, for a date that appears mid-sentence (e.g. "...until 19 September") rather than starting its own line. */
function matchTrailingDate(text: string): { monthIdx: number; day: number } | null {
  const monthFirst = text.match(TRAILING_DATE_MONTH_FIRST);
  if (monthFirst) return { monthIdx: MONTHS.indexOf(monthFirst[1]!.toLowerCase()), day: parseInt(monthFirst[2]!, 10) };
  const dayFirst = text.match(TRAILING_DATE_DAY_FIRST);
  if (dayFirst) return { monthIdx: MONTHS.indexOf(dayFirst[2]!.toLowerCase()), day: parseInt(dayFirst[1]!, 10) };
  return null;
}

function matchDateLine(line: string): { monthIdx: number; day: number; trailing: string } | null {
  const monthFirst = line.match(DATE_LINE_MONTH_FIRST);
  if (monthFirst) {
    return { monthIdx: MONTHS.indexOf(monthFirst[1]!.toLowerCase()), day: parseInt(monthFirst[2]!, 10), trailing: (monthFirst[3] ?? "").trim() };
  }
  const dayFirst = line.match(DATE_LINE_DAY_FIRST);
  if (dayFirst) {
    return { monthIdx: MONTHS.indexOf(dayFirst[2]!.toLowerCase()), day: parseInt(dayFirst[1]!, 10), trailing: (dayFirst[3] ?? "").trim() };
  }
  return null;
}

// A gap this small is almost always a data-entry omission (a day with
// nothing planned that the organizer just didn't mention) and safe to fill
// with an empty day, same as before. A gap bigger than this is far more
// likely a deliberate break between two separate legs of the trip — e.g. a
// main trip and a later "extension" after flying home in between — and
// filling it would silently invent a run of empty days across a break the
// organizer never traveled. See the matching guidance in
// lib/ai/anthropicParser.ts's SYSTEM_PROMPT for the AI parser's version of
// this same rule.
const MAX_AUTO_FILLED_GAP_DAYS = 3;

const STAYING_LINE = /^staying(?:\s+at)?\s+(.+?)\s+(?:until|through|till)\s+(.+)$/i;
const STAYING_LINE_NO_END = /^staying(?:\s+at)?\s+(.+)$/i;
const ARROW = /\s*(?:→|->|-{1,2}>)\s*/;
const TRANSPORT_KEYWORDS = /\b(shinkansen|flight|train|bullet train|ferry|bus|subway)\b/i;
const MEAL_KEYWORDS = /\b(breakfast|lunch|dinner|brunch)\b/i;

// Table-structure recognition. Section headings are matched as a WHOLE line
// (not a substring) so an ordinary sentence that happens to mention, say,
// "the important notes above" is never mistaken for the heading itself.
const SCHEDULE_HEADING_RE = /^recommended schedule$/i;
const SKIPPED_HEADING_RE = /^(what to eat|key highlights|important notes)$/i;
const RESERVATION_HEADING_RE = /^(hotels|trains|rental cars|key flights)$/i;
/** A per-day summary table cell: "OVERNIGHT / La Vista Daisetsuzan", "TRANSPORT: Car 1", "DAY TYPE - Scenery...". */
const SUMMARY_CELL_RE = /^\s*(OVERNIGHT|TRANSPORT|DAY TYPE)\s*[/:-]?\s*(.*)$/i;

function buildTransport(line: string) {
  if (!ARROW.test(line) && !TRANSPORT_KEYWORDS.test(line)) return null;
  const withoutMode = line.replace(TRANSPORT_KEYWORDS, "").trim();
  const parts = withoutMode.split(ARROW);
  if (parts.length !== 2) return null;
  const modeMatch = line.match(TRANSPORT_KEYWORDS);
  const modeWord = modeMatch?.[0]?.toLowerCase() ?? "";
  const mode = modeWord.includes("flight")
    ? "flight"
    : modeWord.includes("bus")
      ? "bus"
      : modeWord.includes("ferry")
        ? "ferry"
        : "train";
  return {
    mode: mode as "flight" | "train" | "bus" | "ferry",
    fromPlaceName: parts[0]!.trim(),
    toPlaceName: parts[1]!.trim(),
    confidence: 0.82
  };
}

function classifyItemLine(line: string): { type: ParsedItem["type"]; confidence: number } {
  if (MEAL_KEYWORDS.test(line)) return { type: "meal", confidence: 0.85 };
  return { type: "activity", confidence: 0.78 };
}

function cleanCityName(raw: string): string {
  return raw.replace(/^(arrive|arriving in|arrival in)\s+/i, "").trim().replace(/[.,]$/, "");
}

// "Shibuya morning" -> "Shibuya": strip common trailing descriptors so the
// place lookup has a fighting chance without a full NLP pass. Claude's own
// parse doesn't need this — it extracts placeName directly — this only
// helps the offline heuristic fallback.
function guessPlaceName(line: string): string {
  return line.replace(/\s+(morning|afternoon|evening|tour|visit|walk|walking|day trip)$/i, "").trim();
}

/** "16:00" -> start only. "17:00-17:30" / "13:39 → 14:36" -> start+end. "By 17:00" -> a deadline, captured as endTime. Loose labels ("Evening", "Around noon") intentionally yield neither — better no time than a fabricated one. */
function parseScheduleTime(cell: string): { startTime?: string; endTime?: string } {
  const range = cell.match(/(\d{1,2}):(\d{2})\s*(?:[-–—]|→|->)\s*(\d{1,2}):(\d{2})/);
  if (range) {
    return {
      startTime: `${range[1]!.padStart(2, "0")}:${range[2]}`,
      endTime: `${range[3]!.padStart(2, "0")}:${range[4]}`
    };
  }
  const deadline = cell.match(/^by\s+(\d{1,2}):(\d{2})$/i);
  if (deadline) return { endTime: `${deadline[1]!.padStart(2, "0")}:${deadline[2]}` };
  const single = cell.match(/(\d{1,2}):(\d{2})/);
  if (single) return { startTime: `${single[1]!.padStart(2, "0")}:${single[2]}` };
  return {};
}

export function heuristicParseItinerary(rawText: string): ParsedTrip {
  const today = new Date();
  const lines = rawText.split("\n").map((l) => l.trim());

  // Independent pre-pass: the Reservation Summary section (when present)
  // sits before any day header, so it needs its own walk over the whole
  // document rather than living inside the day-by-day state machine below.
  const reservations: ReservationSummary = parseReservationSummary(lines, today);

  const days: ParsedDay[] = [];
  const overnightRawByDay = new Map<ParsedDay, string>();
  const warnings: string[] = [];
  const cityTimeline: string[] = [];
  let currentCity: string | undefined;
  let currentDay: ParsedDay | null = null;
  let sawAnyDate = false;

  let inTable = false;
  let tableRows: string[] = [];
  let lastHeading: string | null = null;
  let perDaySummarySeenForCurrentDay = false;

  function handleTableBlock() {
    // Capture into a local `const` immediately: `currentDay` is a mutable
    // `let` from the enclosing scope, and relying on TypeScript to keep
    // narrowing a captured mutable binding across this whole closure body is
    // a known gray area — a local const is unambiguously narrowed instead.
    const day = currentDay;
    if (!day) return; // a Reservation Summary table before any date header — already handled above
    if (lastHeading && RESERVATION_HEADING_RE.test(lastHeading)) return; // ditto, mid-document

    if (lastHeading && SCHEDULE_HEADING_RE.test(lastHeading)) {
      for (const row of tableRows) {
        const cells = row.split("|").map((c) => c.trim());
        if (cells.length < 2) continue;
        if (/^time$/i.test(cells[0]!) && /^plan$/i.test(cells[1]!)) continue; // the "Time | Plan" header row itself
        const planText = cells[1]!;
        if (!planText) continue;
        const { startTime, endTime } = parseScheduleTime(cells[0]!);
        const placeName = matchGazetteer(planText);
        const { type, confidence: baseConfidence } = classifyItemLine(planText);
        const confidence = startTime || endTime ? baseConfidence + 0.05 : baseConfidence;
        day.items.push({
          type,
          title: planText,
          startTime,
          endTime,
          placeName,
          cityHint: currentCity,
          source: "ai_parsed",
          confidence,
          needsReview: confidence < 0.75
        });
      }
      return;
    }

    if (!perDaySummarySeenForCurrentDay) {
      // No heading precedes this table at all — the compact per-day
      // "OVERNIGHT / TRANSPORT / DAY TYPE" summary row that real exports put
      // directly under the day's own header.
      perDaySummarySeenForCurrentDay = true;
      for (const row of tableRows) {
        const cells = row.split("|").map((c) => c.trim());
        let overnight: string | null = null;
        let transportRaw: string | null = null;
        let dayType: string | null = null;
        for (const cell of cells) {
          const m = cell.match(SUMMARY_CELL_RE);
          if (!m) continue;
          const label = m[1]!.toUpperCase();
          const value = stripStructuralNoise(m[2] ?? "");
          if (label === "OVERNIGHT") overnight = value;
          else if (label === "TRANSPORT") transportRaw = value;
          else if (label === "DAY TYPE") dayType = value;
        }
        if (overnight !== null) overnightRawByDay.set(day, overnight);
        if (transportRaw) {
          const legs = classifyTransportSegments(transportRaw, day.date, reservations);
          for (const leg of legs) {
            const transport: ParsedTransport = { mode: leg.mode, carrier: leg.carrier, referenceNumber: leg.referenceNumber, confidence: 0.85 };
            day.transport = [...(day.transport ?? []), transport];
          }
          day.isTravelDay = day.isTravelDay || legs.length > 0;
        }
        if (dayType) {
          day.items.push({ type: "note", title: dayType, source: "ai_parsed", confidence: 0.8, needsReview: false });
        }
      }
    }
    // A further, unrecognized table with content we don't have a shape for
    // is silently ignored rather than dumped as raw rows — an honest gap,
    // not garbage in the itinerary.
  }

  for (const line of lines) {
    if (!line) continue;

    if (line === "[table]") {
      inTable = true;
      tableRows = [];
      continue;
    }
    if (line === "[/table]") {
      inTable = false;
      handleTableBlock();
      tableRows = [];
      continue;
    }
    if (inTable) {
      tableRows.push(line);
      continue;
    }

    if (SCHEDULE_HEADING_RE.test(line)) {
      lastHeading = "recommended schedule";
      continue;
    }
    if (SKIPPED_HEADING_RE.test(line) || RESERVATION_HEADING_RE.test(line) || /^reservation summary$/i.test(line)) {
      lastHeading = line.toLowerCase();
      continue;
    }

    const dateMatch = matchDateLine(line);
    if (dateMatch) {
      sawAnyDate = true;
      const { monthIdx, day, trailing } = dateMatch;
      const year = inferYear(monthIdx, day, today);

      if (currentDay) days.push(currentDay);
      currentDay = {
        date: toISODate(monthIdx, day, year),
        cityHint: currentCity,
        isTravelDay: false,
        items: []
      };
      lastHeading = null;
      perDaySummarySeenForCurrentDay = false;

      const arriveMatch =
        trailing.match(/^arrival\s+in\s+(.+)$/i) ?? trailing.match(/^arrive\s+(.+)$/i) ?? trailing.match(/^arriving in\s+(.+)$/i);
      if (arriveMatch) {
        currentCity = cleanCityName(arriveMatch[1]!);
        currentDay.cityHint = currentCity;
        currentDay.items.push({
          type: "note",
          title: trailing,
          source: "ai_parsed",
          confidence: 0.88,
          needsReview: false
        });
      } else if (trailing) {
        currentDay.items.push({
          type: "note",
          title: trailing,
          source: "ai_parsed",
          confidence: 0.8,
          needsReview: false
        });
      }
      continue;
    }

    if (!currentDay) {
      // Content before any recognizable date — most likely a trip title line.
      continue;
    }

    const stayingWithEnd = line.match(STAYING_LINE);
    if (stayingWithEnd) {
      const hotelName = stayingWithEnd[1]!.trim();
      const endRaw = stayingWithEnd[2]!.trim();
      const endMatch = matchTrailingDate(endRaw);
      let checkOut = currentDay.date;
      let confidence = 0.9;
      if (endMatch) {
        const y = inferYear(endMatch.monthIdx, endMatch.day, today);
        checkOut = toISODate(endMatch.monthIdx, endMatch.day, y);
      } else {
        confidence = 0.6;
        warnings.push(`Could not parse a clear checkout date for "${hotelName}" — please confirm.`);
      }
      currentDay.hotel = { placeName: hotelName, cityHint: currentCity, checkIn: currentDay.date, checkOut, confidence };
      continue;
    }

    const stayingNoEnd = line.match(STAYING_LINE_NO_END);
    if (stayingNoEnd) {
      const hotelName = stayingNoEnd[1]!.trim();
      currentDay.hotel = {
        placeName: hotelName,
        cityHint: currentCity,
        checkIn: currentDay.date,
        checkOut: currentDay.date,
        confidence: 0.55
      };
      warnings.push(`No checkout date given for "${hotelName}" — defaulted to a single night. Please confirm.`);
      continue;
    }

    const transport = buildTransport(line);
    if (transport) {
      currentDay.isTravelDay = true;
      currentDay.transport = [...(currentDay.transport ?? []), transport];
      if (transport.toPlaceName) {
        currentCity = cleanCityName(transport.toPlaceName);
        currentDay.cityHint = currentDay.cityHint ?? currentCity;
      }
      continue;
    }

    const dinnerInMatch = line.match(/^dinner in (.+)$/i) ?? line.match(/^lunch in (.+)$/i) ?? line.match(/^breakfast in (.+)$/i);
    const { type, confidence } = classifyItemLine(line);
    currentDay.items.push({
      type,
      title: line,
      placeName: dinnerInMatch ? dinnerInMatch[1]!.trim() : guessPlaceName(line),
      cityHint: currentCity,
      source: "ai_parsed",
      confidence,
      needsReview: confidence < 0.7
    });
  }

  if (currentDay) days.push(currentDay);

  if (!sawAnyDate) {
    warnings.push("We couldn't find any recognizable dates — try a format like \"September 15\" on its own line before that day's plans.");
  }

  // Fill small gap days between consecutive dates so a leg's timeline has no
  // silent holes (e.g. Sep 17–18 with no notes in the example) — but only up
  // to MAX_AUTO_FILLED_GAP_DAYS. A bigger gap is treated as a deliberate
  // break between two legs of the trip (e.g. a main trip and a later
  // "extension") and is left alone rather than filled with empty days; the
  // day sequence still continues right on from the leg before it, so a
  // later leg's "Day N" numbering picks up where the previous leg left off
  // instead of restarting at 1.
  if (days.length > 1) {
    const filled: ParsedDay[] = [];
    for (let i = 0; i < days.length; i++) {
      filled.push(days[i]!);
      const next = days[i + 1];
      if (!next) continue;
      const cur = new Date(days[i]!.date + "T00:00:00");
      const nxt = new Date(next.date + "T00:00:00");
      const gapDays = Math.round((nxt.getTime() - cur.getTime()) / 86_400_000) - 1;
      if (gapDays <= 0) continue;
      if (gapDays > MAX_AUTO_FILLED_GAP_DAYS) {
        warnings.push(
          `There's a ${gapDays}-day break between ${days[i]!.date} and ${next.date} — treated as a separate leg of the trip, nothing was invented in between. If that's not right, add the missing days yourself on the review screen.`
        );
        continue;
      }
      for (let g = 1; g <= gapDays; g++) {
        const gapDate = new Date(cur);
        gapDate.setDate(gapDate.getDate() + g);
        const iso = gapDate.toISOString().slice(0, 10);
        filled.push({ date: iso, cityHint: days[i]!.cityHint, isTravelDay: false, items: [] });
      }
    }
    days.length = 0;
    days.push(...filled);
  }

  // Coalesce the raw OVERNIGHT text collected per day (above) into proper
  // ParsedHotel entries, attached only on the check-in day with the correct
  // checkIn/checkOut span — the app matches every night in between to that
  // one stay automatically (same convention Claude's own SYSTEM_PROMPT
  // follows). A day with no OVERNIGHT value at all (a pure departure day —
  // "OVERNIGHT / —") ends whatever stay was open; it does NOT count as "the
  // same hotel continuing" just because nothing new was mentioned.
  let openHotelRaw: string | null = null;
  let openHotelCheckInIdx = -1;
  const closeOpenStay = (checkOutIdx: number) => {
    if (openHotelCheckInIdx === -1 || !openHotelRaw) return;
    const checkInDay = days[openHotelCheckInIdx]!;
    const checkOutDate = days[checkOutIdx]?.date ?? days[days.length - 1]!.date;
    const placeName = stripStructuralNoise(openHotelRaw);
    const matchingReservation = reservations.hotels.find(
      (h) => h.checkIn === checkInDay.date || h.name.toLowerCase().includes(placeName.toLowerCase())
    );
    checkInDay.hotel = {
      placeName,
      checkIn: checkInDay.date,
      checkOut: checkOutDate,
      referenceNumber: matchingReservation?.referenceNumber,
      confidence: 0.9
    };
  };
  for (let i = 0; i < days.length; i++) {
    const day = days[i]!;
    // A day with no per-day summary table AT ALL — a gap day this same pass
    // auto-filled above, or a document that never had this table structure
    // to begin with — carries whatever stay is already open forward rather
    // than closing it; only an EXPLICIT "—"/empty OVERNIGHT value counts as
    // "nothing tonight."
    if (!overnightRawByDay.has(day)) continue;
    const raw = overnightRawByDay.get(day)!;
    const isEmpty = !raw || raw === "—" || raw === "-" || raw.trim().length === 0;
    if (isEmpty) {
      closeOpenStay(i);
      openHotelRaw = null;
      openHotelCheckInIdx = -1;
      continue;
    }
    if (raw !== openHotelRaw) {
      closeOpenStay(i);
      openHotelRaw = raw;
      openHotelCheckInIdx = i;
    }
  }
  closeOpenStay(days.length);

  // City-hint derivation, layered: a table-driven document (real hotel names
  // resolved above) always wins and carries forward across every night of
  // the same stay plus any hotel-less day in between (e.g. a departure
  // morning still "belongs" to the city it started in). Documents with no
  // OVERNIGHT data at all (the simple pasted-text shape) fall back to
  // whatever `currentCity` the old arrival/staying/transport-arrow tracking
  // above already produced for that day — unchanged behavior for that shape.
  let lastHotelCityHint: string | undefined;
  for (const day of days) {
    if (day.hotel) lastHotelCityHint = day.hotel.placeName;
    if (lastHotelCityHint) day.cityHint = lastHotelCityHint;
  }

  cityTimeline.push(...new Set(days.map((d) => d.cityHint).filter(Boolean) as string[]));
  const tripName =
    cityTimeline.length === 0
      ? "New Trip"
      : cityTimeline.length === 1
        ? `${cityTimeline[0]} Trip`
        : `${cityTimeline[0]} & ${cityTimeline[cityTimeline.length - 1]}`;

  return {
    name: tripName,
    countries: [],
    startDate: days[0]?.date ?? new Date().toISOString().slice(0, 10),
    endDate: days[days.length - 1]?.date ?? new Date().toISOString().slice(0, 10),
    days,
    warnings
  };
}
