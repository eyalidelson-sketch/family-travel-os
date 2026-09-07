"use server";

import { revalidatePath } from "next/cache";
import { repo } from "../repo";
import { getCurrentMember } from "../session";
import type { FoodPreference, FoodRestriction } from "../types";

// Anyone can EDIT their own profile without becoming the organizer — this is
// personal safety/preference data, not an itinerary fact — and the organizer
// can also edit any member's profile (a parent filling in a young kid's
// allergies, say). Every other combination is refused server-side.

async function canEdit(tripId: string, targetTripMemberId: string): Promise<boolean> {
  const viewer = await getCurrentMember(tripId);
  if (!viewer) return false;
  return viewer.id === targetTripMemberId || viewer.role === "organizer";
}

export async function addFoodRestrictionAction(
  tripId: string,
  tripMemberId: string,
  input: Omit<FoodRestriction, "id" | "tripMemberId">
): Promise<{ error?: string }> {
  if (!(await canEdit(tripId, tripMemberId))) return { error: "You can only edit your own food profile." };
  await repo.addFoodRestriction(tripMemberId, input);
  revalidatePath(`/t/${tripId}/profile`);
  return {};
}

export async function removeFoodRestrictionAction(tripId: string, tripMemberId: string, id: string): Promise<{ error?: string }> {
  if (!(await canEdit(tripId, tripMemberId))) return { error: "You can only edit your own food profile." };
  await repo.removeFoodRestriction(id);
  revalidatePath(`/t/${tripId}/profile`);
  return {};
}

export async function addFoodPreferenceAction(
  tripId: string,
  tripMemberId: string,
  input: Omit<FoodPreference, "id" | "tripMemberId">
): Promise<{ error?: string }> {
  if (!(await canEdit(tripId, tripMemberId))) return { error: "You can only edit your own food profile." };
  await repo.addFoodPreference(tripMemberId, input);
  revalidatePath(`/t/${tripId}/profile`);
  return {};
}

export async function removeFoodPreferenceAction(tripId: string, tripMemberId: string, id: string): Promise<{ error?: string }> {
  if (!(await canEdit(tripId, tripMemberId))) return { error: "You can only edit your own food profile." };
  await repo.removeFoodPreference(id);
  revalidatePath(`/t/${tripId}/profile`);
  return {};
}
