"use server";

import { revalidatePath } from "next/cache";
import { repo } from "../repo";
import { getCurrentMember, isOrganizerForTrip } from "../session";
import type { TripCheckIssue } from "../tripcheck/analyze";

async function requireOrganizer(tripId: string): Promise<string> {
  const [isOrganizer, member] = await Promise.all([isOrganizerForTrip(tripId), getCurrentMember(tripId)]);
  if (!isOrganizer || !member) throw new Error("Only the trip organizer can act on Trip Check.");
  return member.id;
}

export async function dismissTripCheckIssueAction(tripId: string, issueId: string): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    await repo.dismissRecommendation(tripId, issueId, "trip_check_issue", actorId);
    revalidatePath(`/t/${tripId}/check`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't dismiss that." };
  }
}

/** Applies the issue's structured fix (a real itinerary mutation where one exists) and always dismisses the issue either way. */
export async function applyTripCheckFixAction(tripId: string, issue: TripCheckIssue): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);

    switch (issue.fix.kind) {
      case "add_meal_break":
        await repo.addItineraryItem(issue.dayId, actorId, { type: "meal", title: "Meal break", startTime: issue.fix.time });
        break;
      case "add_rest_block":
        await repo.addItineraryItem(issue.dayId, actorId, { type: "free_time", title: "Rest block", startTime: issue.fix.time });
        break;
      case "extend_buffer":
        await repo.updateItineraryItem(issue.fix.itemId, actorId, { endTime: issue.fix.newEndTime });
        break;
      case "acknowledge":
        break;
    }

    await repo.dismissRecommendation(tripId, issue.id, "trip_check_issue", actorId);
    // The fix itself may have added/changed an itinerary item (see the
    // switch above), which Full Trip and the Route Map also derive from
    // (lib/trip-blocks.ts, lib/map/waypoints.ts) — revalidate all four tabs
    // that read itinerary state, same as lib/actions/itinerary.ts's own
    // mutations, not just the two this action happens to render itself.
    revalidatePath(`/t/${tripId}/check`);
    revalidatePath(`/t/${tripId}/today`);
    revalidatePath(`/t/${tripId}/trip`);
    revalidatePath(`/t/${tripId}/map`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't apply that fix." };
  }
}
