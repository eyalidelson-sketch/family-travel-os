import { DateTime } from "luxon";
import type { DayWithItems, ItineraryItem, Place, TripBundle } from "../types";

// Deterministic, not AI — the same "pure time-window math" philosophy as
// lib/time.ts's Now/Next. A trip-check warning should never depend on a
// model call succeeding or agreeing twice in a row, so every check here is a
// plain rule over the itinerary's own data. AI's place in the product is
// enrichment and narrative color, never the thing deciding whether a day is
// actually too packed.

export type TripCheckIssueType = "heavy_day" | "tight_transit" | "backtrack" | "missing_meal";

export type TripCheckFix =
  | { kind: "add_meal_break"; label: string; time: string }
  | { kind: "add_rest_block"; label: string; time: string }
  | { kind: "extend_buffer"; label: string; itemId: string; newEndTime: string }
  | { kind: "acknowledge"; label: string };

export interface TripCheckIssue {
  id: string;
  type: TripCheckIssueType;
  dayId: string;
  dayLabel: string;
  severity: "warn" | "info";
  title: string;
  detail: string;
  fix: TripCheckFix;
}

interface TimedEntry {
  item: ItineraryItem & { place?: Place };
  start: DateTime;
  end: DateTime;
}

const DEFAULT_DURATION_MINUTES = 90;
const TIGHT_TRANSIT_MINUTES = 20;
const HEAVY_DAY_ITEM_COUNT = 5;
const HEAVY_DAY_SPAN_HOURS = 11;
const MISSING_MEAL_SPAN_HOURS = 5.5;

function timedEntries(day: DayWithItems): TimedEntry[] {
  const zone = day.timezone || "Etc/UTC";
  return day.items
    .filter((i): i is ItineraryItem & { place?: Place; startTime: string } => Boolean(i.startTime))
    .map((item) => {
      const [h, m] = item.startTime.split(":").map(Number);
      const start = DateTime.fromISO(day.date, { zone }).set({ hour: h, minute: m, second: 0 });
      let end = start.plus({ minutes: DEFAULT_DURATION_MINUTES });
      if (item.endTime) {
        const [eh, em] = item.endTime.split(":").map(Number);
        const candidate = DateTime.fromISO(day.date, { zone }).set({ hour: eh, minute: em, second: 0 });
        if (candidate > start) end = candidate;
      }
      return { item, start, end };
    })
    .sort((a, b) => a.start.toMillis() - b.start.toMillis());
}

function dayLabel(day: DayWithItems): string {
  const dt = DateTime.fromISO(day.date, { zone: "utc" });
  return `Day ${day.dayIndex} · ${dt.toFormat("LLL d")}`;
}

function analyzeDay(day: DayWithItems): TripCheckIssue[] {
  const issues: TripCheckIssue[] = [];
  const entries = timedEntries(day);
  const label = dayLabel(day);
  const realItems = day.items.filter((i) => i.type !== "note");

  // Heavy day: either a lot of scheduled things, or a very long stretch from first to last.
  const span = entries.length >= 2 ? entries[entries.length - 1]!.end.diff(entries[0]!.start, "hours").hours : 0;
  if (realItems.length >= HEAVY_DAY_ITEM_COUNT || span >= HEAVY_DAY_SPAN_HOURS) {
    const midpoint = entries.length > 0 ? entries[0]!.start.plus({ hours: span / 2 || 2 }) : DateTime.fromISO(day.date, { zone: day.timezone }).set({ hour: 14 });
    issues.push({
      id: `heavy_day:${day.id}`,
      type: "heavy_day",
      dayId: day.id,
      dayLabel: label,
      severity: "warn",
      title: `${label} looks packed`,
      detail:
        realItems.length >= HEAVY_DAY_ITEM_COUNT
          ? `${realItems.length} activities/meals scheduled — worth a downtime block, especially with kids.`
          : `This day spans about ${Math.round(span)} hours from first to last item — consider a break in the middle.`,
      fix: { kind: "add_rest_block", label: "Add a rest block", time: midpoint.toFormat("HH:mm") }
    });
  }

  // Missing meal: a long active stretch with no meal item at all.
  const hasMeal = day.items.some((i) => i.type === "meal");
  if (!hasMeal && span >= MISSING_MEAL_SPAN_HOURS) {
    const midpoint = entries[0]!.start.plus({ hours: span / 2 });
    issues.push({
      id: `missing_meal:${day.id}`,
      type: "missing_meal",
      dayId: day.id,
      dayLabel: label,
      severity: "warn",
      title: `${label} has no meal scheduled`,
      detail: `About ${Math.round(span)} hours of activities with nothing marked as a meal — easy to forget to actually stop and eat.`,
      fix: { kind: "add_meal_break", label: "Add a meal break", time: midpoint.toFormat("HH:mm") }
    });
  }

  // Tight transit: two consecutive timed items, different places, with barely any gap between them.
  for (let i = 0; i < entries.length - 1; i++) {
    const cur = entries[i]!;
    const next = entries[i + 1]!;
    if (cur.item.placeId && next.item.placeId && cur.item.placeId === next.item.placeId) continue;
    const gapMinutes = next.start.diff(cur.end, "minutes").minutes;
    if (gapMinutes < TIGHT_TRANSIT_MINUTES) {
      issues.push({
        id: `tight_transit:${day.id}:${cur.item.id}`,
        type: "tight_transit",
        dayId: day.id,
        dayLabel: label,
        severity: gapMinutes < 0 ? "warn" : "info",
        title: `Tight turnaround between "${cur.item.title}" and "${next.item.title}"`,
        detail:
          gapMinutes < 0
            ? `These overlap by about ${Math.round(-gapMinutes)} minutes — one of them will run late.`
            : `Only about ${Math.round(gapMinutes)} minutes between the two — leaves little room for travel time.`,
        fix: { kind: "extend_buffer", label: "Add 30 min buffer", itemId: cur.item.id, newEndTime: cur.start.plus({ minutes: Math.max(30, cur.end.diff(cur.start, "minutes").minutes + 30) }).toFormat("HH:mm") }
      });
    }
  }

  // Backtracking: the same place shows up twice with something else scheduled in between.
  const placeAppearances = new Map<string, number[]>();
  day.items.forEach((item, idx) => {
    if (!item.placeId) return;
    const list = placeAppearances.get(item.placeId) ?? [];
    list.push(idx);
    placeAppearances.set(item.placeId, list);
  });
  for (const [placeId, indices] of placeAppearances) {
    if (indices.length < 2) continue;
    const first = indices[0]!;
    const last = indices[indices.length - 1]!;
    if (last - first <= 1) continue; // adjacent mentions aren't backtracking
    const place = day.items.find((i) => i.placeId === placeId)?.place;
    issues.push({
      id: `backtrack:${day.id}:${placeId}`,
      type: "backtrack",
      dayId: day.id,
      dayLabel: label,
      severity: "info",
      title: `Revisiting ${place?.canonicalName ?? "the same place"} later today`,
      detail: "This place shows up twice today with something else in between — combining the visits could save backtracking.",
      fix: { kind: "acknowledge", label: "Got it" }
    });
  }

  return issues;
}

export function analyzeTripCheck(bundle: TripBundle): TripCheckIssue[] {
  return bundle.days.flatMap(analyzeDay);
}
