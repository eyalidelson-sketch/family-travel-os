import Anthropic from "@anthropic-ai/sdk";
import type { Place, PlaceEnrichment, Trip } from "../types";

export interface AskContext {
  place: Place;
  enrichment: PlaceEnrichment | null;
  trip: Trip;
  askerName: string;
  question: string;
}

const SYSTEM_PROMPT = `You answer one short, practical question about a specific place for a family trip app.
Answer in 2-4 sentences, plainly, with no filler or enthusiasm padding. If you're not confident about a
specific fact (exact hours, prices, current availability), say so plainly instead of guessing — the
person asking may act on this immediately. You are not a general chatbot: only answer what was asked.`;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export async function answerPlaceQuestion(ctx: AskContext): Promise<{ answer: string; source: "claude" | "fallback" }> {
  const client = getClient();

  const context = [
    `Place: ${ctx.place.canonicalName} (${ctx.place.category}) in ${ctx.place.city || "an unspecified city"}, ${ctx.place.country || ""}`,
    ctx.enrichment?.description ? `Known description: ${ctx.enrichment.description}` : null,
    ctx.enrichment?.practicalInfo ? `Known practical info: ${JSON.stringify(ctx.enrichment.practicalInfo)}` : null,
    `Trip: "${ctx.trip.name}", ${ctx.trip.startDate} to ${ctx.trip.endDate}`,
    `Asked by: ${ctx.askerName}`
  ]
    .filter(Boolean)
    .join("\n");

  if (!client) {
    const fallback = ctx.enrichment?.description
      ? `AI answers aren't turned on for this trip yet, but here's what we know: ${ctx.enrichment.description}${
          ctx.enrichment.practicalInfo?.familyTips ? ` ${ctx.enrichment.practicalInfo.familyTips}` : ""
        }`
      : "AI answers aren't turned on for this trip yet (no ANTHROPIC_API_KEY configured), and we don't have anything on file for this place either.";
    return { answer: fallback, source: "fallback" };
  }

  try {
    const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
    const response = await client.messages.create({
      model,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `${context}\n\nQuestion: ${ctx.question}` }]
    });
    const content = response.content as Array<{ type: string; text?: string }>;
    const text = content.find((b) => b.type === "text")?.text;
    return { answer: text?.trim() || "Sorry, I couldn't come up with an answer to that.", source: "claude" };
  } catch (err) {
    console.error("answerPlaceQuestion failed:", err);
    return { answer: "Something went wrong reaching the AI just now — please try again in a moment.", source: "fallback" };
  }
}
