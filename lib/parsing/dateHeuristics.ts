// Small date-math helpers shared between the heuristic day-by-day parser
// (lib/ai/heuristicParser.ts) and the reservation-summary table parser
// (lib/parsing/reservationSummary.ts) — both need to turn a bare "15
// September" or "15 Sep" into a real ISO date using the same
// no-year-stated-so-infer-the-nearest-upcoming-one rule, and disagreeing
// between the two would silently break the date-matching that links a
// reservation-table row back to the right day.

export const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

/**
 * No year is ever stated in these documents — assume the trip is upcoming
 * relative to `today` unless that reading would place it more than three
 * weeks in the past, in which case assume next year instead. Mirrors the
 * same rule lib/ai/anthropicParser.ts's SYSTEM_PROMPT gives Claude.
 */
export function inferYear(monthIdx: number, day: number, today: Date): number {
  const candidate = new Date(today.getFullYear(), monthIdx, day);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 21);
  return candidate < cutoff ? today.getFullYear() + 1 : today.getFullYear();
}

export function toISODate(monthIdx: number, day: number, year: number): string {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Matches the compact "9 Sep" / "15-17 Sep" / "2-6 Oct" date shape used in
 * reservation-summary tables (a hotel/train/flight row's Date column) —
 * looser than the day-header regexes since there's no separator/trailing
 * text to worry about here, just a bare date or a short date range.
 */
export function matchShortDate(text: string): { dayStart: number; dayEnd: number; monthIdx: number } | null {
  const m = text.trim().match(/^(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?\s+([A-Za-z]{3,9})\.?$/);
  if (!m) return null;
  const abbrev = m[3]!.toLowerCase().slice(0, 3);
  const monthIdx = MONTHS.findIndex((month) => month.startsWith(abbrev));
  if (monthIdx === -1) return null;
  const dayStart = parseInt(m[1]!, 10);
  return { dayStart, dayEnd: m[2] ? parseInt(m[2], 10) : dayStart, monthIdx };
}
