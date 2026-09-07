import Anthropic from "@anthropic-ai/sdk";
import type { ParsedTrip } from "../parsing-types";
import { parsedTripSchema } from "./schema";

const TOOL_NAME = "submit_itinerary";

const ITEM_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["activity", "meal", "transport", "note", "free_time"] },
    title: { type: "string", description: "The organizer's own wording for this line item, verbatim where possible." },
    startTime: { type: "string", description: "HH:mm 24h, local to the destination. Omit if not stated." },
    endTime: { type: "string" },
    placeName: { type: "string", description: "The real-world place this refers to, if any (hotel, attraction, restaurant, station...)." },
    cityHint: { type: "string" },
    notes: { type: "string" },
    confidence: { type: "number", description: "0-1. Lower this whenever you had to guess (time, which place, which day)." },
    needsReview: { type: "boolean", description: "true whenever confidence < 0.75 or the source text was genuinely ambiguous." },
    reviewReason: { type: "string", description: "One short phrase explaining what's uncertain, only when needsReview is true." }
  },
  required: ["type", "title", "confidence", "needsReview"]
};

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "A short trip name, e.g. \"Tokyo & Seoul\"." },
    countries: { type: "array", items: { type: "string" } },
    startDate: { type: "string", description: "YYYY-MM-DD — the very first date covered anywhere in the document." },
    endDate: { type: "string", description: "YYYY-MM-DD — the very last date covered anywhere in the document." },
    days: {
      type: "array",
      description:
        "One entry per day the organizer actually travels — see the system prompt's rules on filling gaps within one continuous leg but NOT inventing days across an explicit break between separate legs/extensions of the trip.",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          cityHint: { type: "string" },
          isTravelDay: { type: "boolean" },
          items: { type: "array", items: ITEM_SCHEMA },
          hotel: {
            type: "object",
            description:
              "Only set this on the day the stay actually check in — the app matches every night in [checkIn, checkOut) to this hotel automatically, so do not repeat the same hotel object on every night of a multi-night stay.",
            properties: {
              placeName: { type: "string" },
              cityHint: { type: "string" },
              checkIn: { type: "string" },
              checkOut: { type: "string" },
              referenceNumber: {
                type: "string",
                description: "The booking/reservation/confirmation number from a reservation table or booking email, copied verbatim. Omit if the document doesn't state one."
              },
              confidence: { type: "number" }
            },
            required: ["placeName", "checkIn", "checkOut", "confidence"]
          },
          transport: {
            type: "array",
            items: {
              type: "object",
              properties: {
                mode: { type: "string", enum: ["flight", "train", "car", "bus", "ferry", "other"] },
                fromPlaceName: { type: "string" },
                toPlaceName: { type: "string" },
                departTime: { type: "string" },
                arriveTime: { type: "string" },
                carrier: { type: "string", description: "Airline/train name, or the rental car company for mode \"car\"." },
                referenceNumber: {
                  type: "string",
                  description:
                    "The flight/train number, or the booking/reservation/confirmation number from a reservation table or booking email — copy it verbatim, digits and letters exactly as printed. Omit if the document doesn't state one."
                },
                confidence: { type: "number" }
              },
              required: ["mode", "confidence"]
            }
          }
        },
        required: ["date", "isTravelDay", "items"]
      }
    },
    warnings: {
      type: "array",
      items: { type: "string" },
      description: "Short, human-readable notes about anything ambiguous or missing across the whole itinerary — including any assumption you made about a gap between trip legs."
    }
  },
  required: ["name", "countries", "startDate", "endDate", "days", "warnings"]
} as const;

const SYSTEM_PROMPT = `You turn a family trip organizer's itinerary — free-form pasted text, or text extracted from a real-world PDF/Word document — into structured data.

Real organizer documents are messy on purpose: day headers can read either way ("September 15" or "15 September - Arrival in Seoul" or "10 September - Seoul → New Chitose → Furano"), the trip can jump straight from a city name to an arrow-separated route, and hard travel facts often live in tables or table-like blocks rather than prose — a "Reservation Summary" section with sub-tables for Hotels, Trains, Rental cars, and Flights (columns like Date / Hotel or Train or Route / Provider or Seats / Booking or Reservation No.), and/or a small per-day summary table right after each day's header — often 2-4 cells labeled something like OVERNIGHT, TRANSPORT, DAY TYPE. Extracted table text may arrive as plain rows (sometimes wrapped in [table]...[/table] markers) rather than as a visual grid — read it as a table regardless of how it's laid out on the page.

Hard rules:
- The organizer's original wording is the source of truth. Copy each line's meaning into "title" faithfully — never invent activities, times, or details that are not stated or very strongly implied.
- Extract EVERY table and table-like block, not just prose paragraphs. A hotel row (date + hotel name) becomes that day's "hotel" field (checkIn = that date, checkOut = the next different check-in date you can find for the same city/traveler, or the trip's last date if it's the final stay). A train/flight row becomes a "transport" entry on the matching day (mode "train" or "flight", fromPlaceName/toPlaceName/departTime/arriveTime/carrier from that row). A rental car row (pick-up date/place + return date/place) becomes a "transport" entry with mode "car" on the pick-up day (fromPlaceName = pick-up location, departTime = pick-up time, carrier = the rental company) — put the return as a short note item ("Return rental car by <time> at <location>") on the actual return day instead of a second transport entry, so the deadline shows up on the day it matters. A per-day OVERNIGHT/TRANSPORT/DAY TYPE block's OVERNIGHT value is that day's hotel; fold TRANSPORT/DAY TYPE into a brief note if it adds real information. Never drop a table's information just because it isn't written as a sentence.
- Whenever a reservation table or booking confirmation row includes a flight/train number or a booking/reservation/confirmation number, copy it verbatim into that transport entry's "referenceNumber" (or the hotel entry's "referenceNumber" for a hotel booking number) — this is what lets the app show a booking confirmation number back to the organizer later, so don't paraphrase or reformat it.
- Only set a day's "hotel" field once, on the check-in day, with the correct checkIn/checkOut span — the app already matches every night in between to that stay automatically, so repeating the identical hotel object on every night of the same stay is unnecessary (harmless, but skip it to save effort).
- If a detail is genuinely ambiguous or missing (no year, no end date for a hotel stay, no time of day), do not silently guess with high confidence: lower "confidence" and set "needsReview" to true with a short "reviewReason".
- Never mark something as a confirmed fact you inferred. Confidence near 1.0 is reserved for things stated plainly in the text.
- Fill in every calendar day within a single, clearly continuous stretch of travel, even if some have no listed activities (empty items array), so that one leg's timeline has no silent gaps. But when the document describes two or more separate legs with an explicit break between them — a main trip followed by a distinct later "extension" after returning home, or two date ranges that plainly don't connect (e.g. "9-18 September" and a separate "2-6 October") — do NOT invent empty filler days to bridge that gap. Simply omit the dates that fall inside the gap from "days" (keep every day from both legs, back to back in the array, numbered continuously) and add one line to "warnings" naming the gap you left unfilled.
- Today's date will be given to you for resolving dates that omit a year — assume the trip is upcoming relative to that date unless the text clearly says otherwise.
- Output ONLY by calling the submit_itinerary tool. Do not write prose.`;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export function isClaudeParsingConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function anthropicParseItinerary(rawText: string): Promise<ParsedTrip | null> {
  const client = getClient();
  if (!client) return null;

  const today = new Date().toISOString().slice(0, 10);
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

  // Cast the request body loosely: the exact nested type names for tool
  // schemas have shifted across SDK versions, and the wire shape (snake_case
  // fields matching the public API) is what actually matters here.
  const response = await client.messages.create({
    model,
    // Real documents (a multi-week, multi-city, table-heavy Word/PDF export)
    // can need a genuinely large structured-output payload — 15-20 days,
    // each with several items plus confidence/needsReview bookkeeping, adds
    // up fast. A cap that's too low doesn't error cleanly: the tool_use JSON
    // just gets cut off mid-object, fails schema validation below, and this
    // whole call silently returns null — which looks identical to "Claude
    // wasn't configured" from the caller's side. 16000 gives real multi-week
    // itineraries real headroom; a short pasted paragraph still finishes in
    // a few hundred tokens regardless.
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Today's date is ${today}. Parse this itinerary:\n\n${rawText}`
      }
    ],
    tools: [
      {
        name: TOOL_NAME,
        description: "Submit the structured itinerary extracted from the organizer's text.",
        input_schema: INPUT_SCHEMA
      }
    ],
    tool_choice: { type: "tool", name: TOOL_NAME }
  } as unknown as Parameters<typeof client.messages.create>[0]);

  if (response.stop_reason === "max_tokens") {
    console.error(
      "Claude itinerary parse hit the max_tokens ceiling before finishing — the tool call is almost certainly truncated/invalid. Falling back to the heuristic parser."
    );
    return null;
  }

  const content = response.content as Array<{ type: string; name?: string; input?: unknown }>;
  const toolUse = content.find((block) => block.type === "tool_use" && block.name === TOOL_NAME);
  if (!toolUse) return null;

  const result = parsedTripSchema.safeParse(toolUse.input);
  if (!result.success) {
    console.error("Claude itinerary output failed validation:", result.error.flatten());
    return null;
  }
  return result.data;
}
