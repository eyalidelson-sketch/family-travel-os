"use server";

import { revalidatePath } from "next/cache";
import { repo } from "../repo";
import { getCurrentMember, isOrganizerForTrip } from "../session";
import type { ItemInput, ItemPatch } from "../repo/types";

// Every mutation here is organizer-gated server-side (not just hidden in the
// UI) and stamped with whichever trip member actually clicked the button, so
// the edit-history audit log in lib/repo/memory.ts always has a real actor.

async function requireOrganizer(tripId: string): Promise<string> {
  const [isOrganizer, member] = await Promise.all([isOrganizerForTrip(tripId), getCurrentMember(tripId)]);
  if (!isOrganizer || !member) throw new Error("Only the trip organizer can edit the itinerary.");
  return member.id;
}

// Every one of these tabs is derived, one way or another, from itinerary
// items/days: Full Trip groups them into city blocks (lib/trip-blocks.ts),
// the Route Map turns those blocks into waypoints (lib/map/waypoints.ts —
// adding/removing/reordering an item can add or remove a highlighted pin,
// and adding/deleting a day changes which city block owns which items), and
// Trip Check re-analyzes the schedule itself for gaps/conflicts. All three
// pages are already dynamically rendered per-request (they read the current
// viewer's session cookie), so the *server* data is never stale — this list
// is what keeps the *client-side* Router Cache from showing an up-to-30s-old
// copy of one of those tabs immediately after an edit made from another tab.
function revalidateDerivedTabs(tripId: string): void {
  revalidatePath(`/t/${tripId}/today`);
  revalidatePath(`/t/${tripId}/trip`);
  revalidatePath(`/t/${tripId}/map`);
  revalidatePath(`/t/${tripId}/check`);
}

export async function addItineraryItemAction(tripId: string, dayId: string, input: ItemInput): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    await repo.addItineraryItem(dayId, actorId, input);
    revalidateDerivedTabs(tripId);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't add that item." };
  }
}

export async function updateItineraryItemAction(tripId: string, itemId: string, patch: ItemPatch): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    await repo.updateItineraryItem(itemId, actorId, patch);
    revalidateDerivedTabs(tripId);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't update that item." };
  }
}

export async function deleteItineraryItemAction(tripId: string, itemId: string): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    await repo.deleteItineraryItem(itemId, actorId);
    revalidateDerivedTabs(tripId);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't delete that item." };
  }
}

export async function moveItineraryItemAction(tripId: string, itemId: string, direction: "up" | "down"): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    await repo.moveItineraryItem(itemId, actorId, direction);
    // Reordering within a day can't change which places are highlighted, so
    // the Route Map's own pin set never changes here — but it CAN change
    // which stop within the map's already-listed pins looks like "first" if
    // ever surfaced positionally elsewhere, so this still clears the map's
    // Router Cache entry alongside Today's, matching the other three actions
    // rather than special-casing "move" as the one action that doesn't.
    revalidateDerivedTabs(tripId);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't reorder that item." };
  }
}

export async function addDayAction(tripId: string, afterDayId: string): Promise<{ error?: string; dayId?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    const day = await repo.addDayAfter(tripId, afterDayId, actorId);
    revalidateDerivedTabs(tripId);
    return { dayId: day.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't add a day." };
  }
}

export async function deleteDayAction(tripId: string, dayId: string): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    await repo.deleteDay(dayId, actorId);
    revalidateDerivedTabs(tripId);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't delete that day." };
  }
}
