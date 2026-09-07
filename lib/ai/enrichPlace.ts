import Anthropic from "@anthropic-ai/sdk";
import type { Place } from "../types";
import { enrichmentSchema, type EnrichmentFromAI } from "./enrichSchema";

const TOOL_NAME = "submit_place_info";

// Automatic Bilingual Generation: every field below is requested in English
// and, alongside it, its own "...He" Hebrew field — filled in this ONE call,
// not a second request made only when a Hebrew viewer happens to visit
// first. That's what removes the old per-locale cache-collision problem
// (see lib/i18n/localizeEnrichment.ts): whichever locale fetches a place
// first, both languages are already sitting on the same cached record for
// whoever looks at it next, in either language.
const INPUT_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string", description: "1-2 sentences, useful and specific — never generic filler. Written in English." },
    descriptionHe: {
      type: "string",
      description: "The same description, written as natural Hebrew (not a literal word-for-word translation) — standard Hebrew travel-guide phrasing, right-to-left reading order."
    },
    nameHe: {
      type: "string",
      description:
        "How this place's name is naturally written or transliterated in Hebrew, e.g. \"מקדש מייג'י\" for \"Meiji Shrine\". Omit if the name is a brand that Israelis would just as commonly recognize in Latin script (e.g. most international hotel chain names)."
    },
    whatToDo: {
      type: "string",
      description:
        "2-4 sentences on what a family would actually do here — the main things to see or try, roughly in order. Only for attractions/neighborhoods/restaurants, omit for hotels/stations/airports."
    },
    whatToDoHe: { type: "string", description: "Natural Hebrew version of whatToDo, same content, same omission rule." },
    nearestStation: { type: "string" },
    nearestStationHe: { type: "string", description: "Hebrew version of nearestStation (the station's own name transliterated, distance phrase in Hebrew)." },
    checkIn: { type: "string", description: "Only for hotels, e.g. '15:00'." },
    checkOut: { type: "string" },
    amenities: { type: "array", items: { type: "string" }, description: "Only for hotels." },
    amenitiesHe: { type: "array", items: { type: "string" }, description: "Hebrew versions of the amenities list, same order, same length." },
    estimatedVisitMinutes: { type: "number", description: "Only for attractions/neighborhoods — a realistic optimal visit length." },
    familyTips: { type: "string", description: "One practical, specific tip. Omit rather than inventing something generic." },
    familyTipsHe: { type: "string", description: "Hebrew version of familyTips. Omit together with familyTips, never invent one that isn't there." },
    openingHours: {
      type: "string",
      description: "Typical opening hours, e.g. '9:00–17:00, closed Mondays'. Only include if you're confident this is generally accurate — omit rather than guess, since hours change seasonally."
    },
    openingHoursHe: { type: "string", description: "Hebrew version of openingHours — day names in Hebrew, times can stay numeric." },
    estimatedCost: {
      type: "string",
      description: "A rough entry cost, e.g. 'Adults ¥1,000 / kids under 12 free'. Omit for free attractions or if genuinely unsure — never invent a specific price you're not confident in."
    },
    estimatedCostHe: { type: "string", description: "Hebrew version of estimatedCost." },
    familyAccessibility: {
      type: "string",
      description: "1-2 sentences on stroller/kid accessibility: terrain (gravel, stairs, elevators), crowding, and nursing/changing facilities if notable. Omit if you don't have a genuine basis for it."
    },
    familyAccessibilityHe: { type: "string", description: "Hebrew version of familyAccessibility." }
  },
  required: ["description", "descriptionHe"]
} as const;

const SYSTEM_PROMPT = `You provide brief, practical, accurate information about real-world travel places for a family trip app that serves both English- and Hebrew-reading families from the exact same generated record.
Every field must be produced in BOTH languages in this one response: the plain field in English, and its "...He" counterpart in natural, idiomatic Hebrew — never a stiff literal translation, and never fill one language while silently skipping its twin for the same fact (if you omit a fact, omit it in both languages; if you include it, include both).
Only state things you're confident are generally true. Never invent operating hours, prices, or addresses.
If you don't have a genuinely useful family tip, omit "familyTips"/"familyTipsHe" entirely rather than writing something generic like "have fun!".
Treat "openingHours"/"openingHoursHe" and "estimatedCost"/"estimatedCostHe" the same way: omit them rather than fabricate a number or schedule you aren't confident in — a missing field is honest, a wrong one is not.
Output ONLY by calling the submit_place_info tool.`;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export async function enrichPlaceWithClaude(place: Place): Promise<EnrichmentFromAI | null> {
  const client = getClient();
  if (!client) return null;

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
  // See the matching comment in lib/ai/anthropicParser.ts's anthropicParseItinerary:
  // the request cast below erases the argument type overload resolution
  // depends on, so the awaited response also needs its own explicit cast to
  // the non-streaming Message type — without it tsc widens `response` to
  // `Stream<RawMessageStreamEvent> | Message` and `.content` doesn't exist
  // on the streaming half. This call never passes `stream: true`, so the
  // plain Message type is accurate here, not a workaround.
  const response = (await client.messages.create(
    {
      model,
      max_tokens: 1536,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Place: ${place.canonicalName}\nCategory: ${place.category}\nCity: ${place.city || "unknown"}\nCountry: ${place.country || "unknown"}`
        }
      ],
      tools: [
        {
          name: TOOL_NAME,
          description: "Submit practical info about this place, in English and Hebrew together.",
          input_schema: INPUT_SCHEMA
        }
      ],
      tool_choice: { type: "tool", name: TOOL_NAME }
    } as unknown as Parameters<typeof client.messages.create>[0]
  )) as Anthropic.Messages.Message;

  const content = response.content as Array<{ type: string; name?: string; input?: unknown }>;
  const toolUse = content.find((block) => block.type === "tool_use" && block.name === TOOL_NAME);
  if (!toolUse) return null;

  const result = enrichmentSchema.safeParse(toolUse.input);
  if (!result.success) {
    console.error("Claude place enrichment failed validation:", result.error.flatten());
    return null;
  }
  return result.data;
}
