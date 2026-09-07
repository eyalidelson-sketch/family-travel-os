"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { repo } from "./repo";
import { setCurrentMemberCookie } from "./session";
import type { ParsedTrip } from "./parsing-types";
import type { Place, TripBundle } from "./types";
import { getOrCreateEnrichment } from "./enrichment/service";
import { getLocale } from "./i18n/locale";

export interface CreateTripResult {
  tripId: string;
  name: string;
  inviteCode: string;
  joinUrl: string;
  qrDataUrl: string;
}

function originFromHeaders(): string {
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Automatic Real-Photo & Detail Resolution (and, riding along on the same
 * call, Automatic Bilingual Generation — see lib/ai/enrichPlace.ts): every
 * place/hotel the AI parser just resolved into a real Place record gets its
 * enrichment cache warmed right here, synchronously, before the organizer
 * ever lands on Today. Without this, the exact same lookups would still
 * happen — just lazily, one place at a time, the first time each place's
 * card or detail page rendered. Warming them all at once, in parallel, means
 * the very first Today/Full Trip render already has real photos and
 * practical tips instead of a wave of individually-slow first-loads.
 *
 * Deliberately best-effort: allSettled, not all — a single broken/slow
 * lookup (a flaky Unsplash call, a place Claude can't say anything useful
 * about) must never fail trip creation itself. Worst case, that one place
 * falls back to its deterministic placeholder/generic text exactly as it
 * would have on a lazy first visit anyway.
 */
async function warmPlaceEnrichment(bundle: TripBundle): Promise<void> {
  const locale = getLocale();
  const unique = new Map<string, Place>();
  for (const day of bundle.days) {
    if (day.city) unique.set(day.city.id, day.city);
    if (day.hotel?.place) unique.set(day.hotel.place.id, day.hotel.place);
    for (const item of day.items) {
      if (item.place) unique.set(item.place.id, item.place);
    }
  }

  const results = await Promise.allSettled(Array.from(unique.values()).map((place) => getOrCreateEnrichment(place, locale)));
  const failures = results.filter((r) => r.status === "rejected").length;
  if (failures > 0) {
    console.error(`${failures} of ${unique.size} places failed to pre-enrich on trip creation — they'll enrich lazily on first view instead.`);
  }
}

export async function createTripAction(parsed: ParsedTrip, organizerName: string): Promise<CreateTripResult> {
  const name = organizerName.trim() || "Organizer";
  const bundle = await repo.createTripFromParsed(parsed, name);
  setCurrentMemberCookie(bundle.trip.id, bundle.trip.createdByTripMemberId);
  await warmPlaceEnrichment(bundle);
  const joinUrl = `${originFromHeaders()}/join?code=${bundle.trip.inviteCode}`;
  const qrDataUrl = await QRCode.toDataURL(joinUrl, {
    margin: 1,
    width: 320,
    color: { dark: "#1c2340", light: "#00000000" }
  });

  return {
    tripId: bundle.trip.id,
    name: bundle.trip.name,
    inviteCode: bundle.trip.inviteCode,
    joinUrl,
    qrDataUrl
  };
}

export async function joinTripAction(code: string, displayName: string): Promise<{ error: string } | never> {
  const trip = await repo.getTripByInviteCode(code);
  if (!trip) {
    return { error: "We couldn't find a trip with that code. Double-check it and try again." };
  }
  const member = await repo.joinTrip(trip.id, displayName.trim() || "Guest");
  setCurrentMemberCookie(trip.id, member.id);
  redirect(`/t/${trip.id}/today`);
}

export interface JoinFormState {
  error?: string;
}

export async function joinFormAction(_prevState: JoinFormState | null, formData: FormData): Promise<JoinFormState> {
  const code = String(formData.get("code") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  if (!code.trim()) return { error: "Enter the trip code you were given." };
  if (!displayName.trim()) return { error: "Tell us what to call you." };
  return joinTripAction(code, displayName);
}
