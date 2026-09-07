import type { DayWithItems } from "./types";

// Full Trip is read as consecutive stays in one place, not a flat list of 30
// days — the spec calls this a "multi-city accordion." A travel/connector day
// already carries the destination city's cityPlaceId from parsing, so simply
// grouping consecutive days by cityPlaceId naturally attributes it to the
// place the family is headed to rather than splitting off its own block.

export interface CityBlock {
  cityPlaceId?: string;
  cityName: string;
  country?: string;
  days: DayWithItems[];
  startDate: string;
  endDate: string;
}

export function groupIntoCityBlocks(days: DayWithItems[]): CityBlock[] {
  const blocks: CityBlock[] = [];

  for (const day of days) {
    const last = blocks[blocks.length - 1];
    if (last && last.cityPlaceId === day.cityPlaceId) {
      last.days.push(day);
      last.endDate = day.date;
    } else {
      blocks.push({
        cityPlaceId: day.cityPlaceId,
        cityName: day.city?.city ?? day.city?.canonicalName ?? "Unassigned",
        country: day.city?.country,
        days: [day],
        startDate: day.date,
        endDate: day.date
      });
    }
  }

  return blocks;
}
