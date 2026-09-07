import { DateTime } from "luxon";
import type { DayWithItems, ItineraryItem, Place, TripBundle } from "./types";

// Every calculation here is anchored to the destination's own IANA timezone
// (Day.timezone / Place.timezone) — never Intl's ambient default or the
// viewer's device clock. A family in Seoul should see Seoul's "now," even if
// one member's phone is still set to their home timezone back in Tel Aviv.

export type TripMode = "before" | "active" | "after";

export interface CurrentDayResult {
  day: DayWithItems;
  mode: TripMode;
  daysUntilStart?: number;
}

/** Which Day is "today," using each day's own local timezone — not the device's. */
export function findCurrentDay(bundle: TripBundle): CurrentDayResult {
  const days = bundle.days;
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) {
    throw new Error("Trip has no days");
  }

  for (const day of days) {
    const zone = day.timezone || "Etc/UTC";
    const start = DateTime.fromISO(day.date, { zone }).startOf("day");
    const end = start.plus({ days: 1 });
    const now = DateTime.now().setZone(zone);
    if (now >= start && now < end) {
      return { day, mode: "active" };
    }
  }

  const firstStart = DateTime.fromISO(first.date, { zone: first.timezone || "Etc/UTC" }).startOf("day");
  const nowInFirstZone = DateTime.now().setZone(first.timezone || "Etc/UTC");
  if (nowInFirstZone < firstStart) {
    const daysUntilStart = Math.ceil(firstStart.diff(nowInFirstZone, "days").days);
    return { day: first, mode: "before", daysUntilStart };
  }

  return { day: last, mode: "after" };
}

export function getDayByOffset(bundle: TripBundle, dayId: string, offset: number): DayWithItems | null {
  const idx = bundle.days.findIndex((d) => d.id === dayId);
  if (idx === -1) return null;
  const target = bundle.days[idx + offset];
  return target ?? null;
}

export function formatDayHeader(day: DayWithItems, locale: "en" | "he" = "en"): { weekday: string; monthDay: string } {
  const dt = DateTime.fromISO(day.date, { zone: "utc" }).setLocale(locale === "he" ? "he" : "en");
  return {
    weekday: dt.toFormat("cccc"),
    monthDay: dt.toFormat("LLL d")
  };
}

function itemInstant(day: DayWithItems, time: string): DateTime {
  const [h, m] = time.split(":").map(Number);
  return DateTime.fromISO(day.date, { zone: day.timezone || "Etc/UTC" }).set({ hour: h, minute: m, second: 0 });
}

export interface TimedItem {
  item: ItineraryItem & { place?: Place };
  start: DateTime;
  end: DateTime;
}

const DEFAULT_DURATION_MINUTES = 90;

function timedItems(day: DayWithItems): TimedItem[] {
  return day.items
    .filter((i): i is ItineraryItem & { place?: Place; startTime: string } => Boolean(i.startTime))
    .map((item) => {
      const start = itemInstant(day, item.startTime);
      const end = item.endTime ? itemInstant(day, item.endTime) : start.plus({ minutes: DEFAULT_DURATION_MINUTES });
      return { item, start, end };
    })
    .sort((a, b) => a.start.toMillis() - b.start.toMillis());
}

export interface NowNextResult {
  now: TimedItem | null;
  next: TimedItem | null;
  minutesUntilNext: number | null;
}

/** Deterministic Now/Next — pure time-window math, no AI involved. */
export function computeNowNext(day: DayWithItems, mode: TripMode): NowNextResult {
  const items = timedItems(day);
  if (items.length === 0) return { now: null, next: null, minutesUntilNext: null };

  const zone = day.timezone || "Etc/UTC";
  const nowInstant = mode === "before" ? items[0]!.start : mode === "after" ? items[items.length - 1]!.end : DateTime.now().setZone(zone);

  let current: TimedItem | null = null;
  let upcoming: TimedItem | null = null;

  for (const entry of items) {
    if (nowInstant >= entry.start && nowInstant < entry.end) {
      current = entry;
    }
    if (entry.start > nowInstant && !upcoming) {
      upcoming = entry;
    }
  }

  const minutesUntilNext = upcoming ? Math.round(upcoming.start.diff(nowInstant, "minutes").minutes) : null;
  return { now: current, next: upcoming, minutesUntilNext };
}

export function formatClock(dt: DateTime): string {
  return dt.toFormat("HH:mm");
}

export function formatMinutesAway(minutes: number): string {
  if (minutes < 1) return "starting now";
  if (minutes < 60) return `in ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`;
}
