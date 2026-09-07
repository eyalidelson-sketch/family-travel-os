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

export async function addItineraryItemAction(tripId: string, dayId: string, input: ItemInput): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    await repo.addItineraryItem(dayId, actorId, input);
    revalidatePath(`/t/${tripId}/today`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't add that item." };
  }
}

export async function updateItineraryItemAction(tripId: string, itemId: string, patch: ItemPatch): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    await repo.updateItineraryItem(itemId, actorId, patch);
    revalidatePath(`/t/${tripId}/today`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't update that item." };
  }
}

export async function deleteItineraryItemAction(tripId: string, itemId: string): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    await repo.deleteItineraryItem(itemId, actorId);
    revalidatePath(`/t/${tripId}/today`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't delete that item." };
  }
}

export async function moveItineraryItemAction(tripId: string, itemId: string, direction: "up" | "down"): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    await repo.moveItineraryItem(itemId, actorId, direction);
    revalidatePath(`/t/${tripId}/today`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't reorder that item." };
  }
}

export async function addDayAction(tripId: string, afterDayId: string): Promise<{ error?: string; dayId?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    const day = await repo.addDayAfter(tripId, afterDayId, actorId);
    revalidatePath(`/t/${tripId}/today`);
    revalidatePath(`/t/${tripId}/trip`);
    return { dayId: day.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't add a day." };
  }
}

export async function deleteDayAction(tripId: string, dayId: string): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    await repo.deleteDay(dayId, actorId);
    revalidatePath(`/t/${tripId}/today`);
    revalidatePath(`/t/${tripId}/trip`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't delete that day." };
  }
}
