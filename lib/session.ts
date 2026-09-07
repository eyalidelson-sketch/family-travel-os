import { cookies } from "next/headers";
import { repo } from "./repo";
import type { TripMember } from "./types";

// No login system in this pass — "who's viewing" is a per-trip cookie set
// the moment a browser creates or joins a trip. It's enough to gate the
// Organizer's edit affordances and to know whose food profile "You" means,
// without asking a family to create accounts to plan a vacation.

function cookieName(tripId: string): string {
  return `ftos_member_${tripId}`;
}

export function setCurrentMemberCookie(tripId: string, tripMemberId: string) {
  cookies().set(cookieName(tripId), tripMemberId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
}

export async function getCurrentMember(tripId: string): Promise<TripMember | null> {
  const id = cookies().get(cookieName(tripId))?.value;
  if (!id) return null;
  return repo.getTripMember(id);
}

export async function isOrganizerForTrip(tripId: string): Promise<boolean> {
  const member = await getCurrentMember(tripId);
  return member?.role === "organizer";
}
