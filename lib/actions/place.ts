"use server";

import { repo } from "../repo";
import { placeRepo } from "../repo/placeRepo";
import { getOrCreateEnrichment } from "../enrichment/service";
import { answerPlaceQuestion } from "../ai/answerPlaceQuestion";
import { getCurrentMember } from "../session";

export interface AskResult {
  answer: string;
  source: "claude" | "fallback";
}

export async function askAboutPlaceAction(tripId: string, placeId: string, question: string): Promise<AskResult> {
  const [trip, place] = await Promise.all([repo.getTripBundle(tripId), placeRepo.getPlace(placeId)]);
  if (!trip || !place) {
    return { answer: "We couldn't find that place on this trip.", source: "fallback" };
  }
  const enrichment = await getOrCreateEnrichment(place);
  const member = await getCurrentMember(tripId);

  return answerPlaceQuestion({
    place,
    enrichment,
    trip: trip.trip,
    askerName: member?.displayName ?? "A trip member",
    question: question.trim()
  });
}
