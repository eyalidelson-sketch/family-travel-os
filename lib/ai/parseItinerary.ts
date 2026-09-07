import type { ParsedTrip } from "../parsing-types";
import { anthropicParseItinerary, isClaudeParsingConfigured } from "./anthropicParser";
import { heuristicParseItinerary } from "./heuristicParser";

export interface ParseResult {
  trip: ParsedTrip;
  engine: "claude" | "heuristic";
  /**
   * Set only when the heuristic parser ran in a situation the organizer
   * should actually know about — Claude wasn't configured, or it was
   * configured but failed/returned nothing usable. The heuristic parser is a
   * deliberately simple, regex-based safety net (see heuristicParser.ts):
   * it understands one clean "Month Day" or "Day Month" date per line, not a
   * real-world Word/PDF export's tables, reservation summaries, or mixed
   * formatting. When that's what just got fed to it, the resulting "we
   * couldn't find any dates"-style warning is real but easy to misread as a
   * bug in the app rather than a missing/failed AI step — this note lets the
   * API route say so plainly instead of leaving the organizer guessing.
   */
  engineNote?: string;
}

export async function parseItinerary(rawText: string): Promise<ParseResult> {
  if (isClaudeParsingConfigured()) {
    try {
      const result = await anthropicParseItinerary(rawText);
      if (result) return { trip: result, engine: "claude" };
      console.warn("Claude parse returned nothing usable — falling back to the heuristic parser.");
      return {
        trip: heuristicParseItinerary(rawText),
        engine: "heuristic",
        engineNote:
          "AI parsing didn't return a usable result for this document (see the server logs for why — often the document is large/complex enough that the AI's structured response got cut off). The basic offline parser was used instead, and it only understands simple, one-date-per-line text — it can't read tables, reservation summaries, or varied date formats the way AI parsing can."
      };
    } catch (err) {
      console.error("Claude itinerary parsing failed — falling back to the heuristic parser.", err);
      return {
        trip: heuristicParseItinerary(rawText),
        engine: "heuristic",
        engineNote:
          "AI parsing hit an error and the basic offline parser was used instead. That parser only understands simple, one-date-per-line text — it can't read tables, reservation summaries, or varied date formats the way AI parsing can."
      };
    }
  }
  return {
    trip: heuristicParseItinerary(rawText),
    engine: "heuristic",
    engineNote:
      "No ANTHROPIC_API_KEY is configured, so this was parsed with the basic offline parser, which only understands simple, one-date-per-line text — it can't read tables, reservation summaries, or varied date formats. Set ANTHROPIC_API_KEY in .env.local to parse real documents like this one with AI instead."
  };
}
