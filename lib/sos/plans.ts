import type { ItineraryItem, ItineraryItemType, Place } from "../types";

// "Save Our Day" is deliberately structured, not free-text: every plan maps
// to one of a small set of real, deterministic mutations (drop the rest,
// keep only meals, keep just the next stop, or push everything later) so
// "Apply this plan" is always a safe, predictable action on the actual
// itinerary — never a paragraph of AI text the organizer has to translate
// into edits themselves.

export type SosTag = "kids_exhausted" | "weather" | "running_late" | "unwell";

export const SOS_TAGS: { key: SosTag; label: string; hint: string }[] = [
  { key: "kids_exhausted", label: "Kids are exhausted", hint: "Everyone's running on empty" },
  { key: "weather", label: "Weather ruined our plans", hint: "Rain, heat, or a closure changed things" },
  { key: "running_late", label: "Running very late", hint: "The schedule slipped and needs to catch up" },
  { key: "unwell", label: "Someone's not feeling well", hint: "Time to slow down, not push through" }
];

export type SosAction =
  | { kind: "clear_remaining"; replacementTitle: string }
  | { kind: "keep_types"; types: ItineraryItemType[] }
  | { kind: "keep_next_only" }
  | { kind: "push_later"; minutes: number };

export interface RescuePlan {
  id: string;
  title: string;
  description: string;
  action: SosAction;
}

type RemainingItem = ItineraryItem & { place?: Place };

export function remainingItems(items: RemainingItem[], afterTime: string): RemainingItem[] {
  return items.filter((i) => !i.startTime || i.startTime >= afterTime);
}

export function buildRescuePlans(tag: SosTag, remaining: RemainingItem[]): RescuePlan[] {
  const count = remaining.length;
  const mealCount = remaining.filter((i) => i.type === "meal").length;
  const countLabel = `${count} remaining thing${count === 1 ? "" : "s"}`;

  const plans: RescuePlan[] = [];

  const clearPlan = (title: string, description: string, replacementTitle: string): RescuePlan => ({
    id: "clear_remaining",
    title,
    description,
    action: { kind: "clear_remaining", replacementTitle }
  });
  const keepMealsPlan = (): RescuePlan => ({
    id: "keep_meals",
    title: "Keep meals, drop the rest",
    description: `Hang onto ${mealCount === 1 ? "tonight's meal" : "the remaining meals"} and clear everything else off today.`,
    action: { kind: "keep_types", types: ["meal"] }
  });
  const keepNextPlan = (description: string): RescuePlan => ({
    id: "keep_next_only",
    title: "Keep just the next stop",
    description,
    action: { kind: "keep_next_only" }
  });
  const pushLaterPlan = (minutes: number, description: string): RescuePlan => ({
    id: `push_later_${minutes}`,
    title: `Push the rest back ${minutes >= 60 ? `${minutes / 60}h` : `${minutes} min`}`,
    description,
    action: { kind: "push_later", minutes }
  });

  switch (tag) {
    case "kids_exhausted":
      plans.push(clearPlan("Call it a day", `Clear the ${countLabel} and head back — an early stop is often the actual win.`, "Rest at the hotel"));
      if (mealCount > 0) plans.push(keepMealsPlan());
      plans.push(keepNextPlan("Drop everything after the very next thing on the schedule — one activity, then done."));
      break;

    case "weather":
      plans.push(clearPlan("Go flexible for the rest of today", `Clear the ${countLabel} that assumed good weather and leave the afternoon open.`, "Flexible / indoor time"));
      plans.push(pushLaterPlan(120, "Give the weather two hours to pass and shift everything else back."));
      plans.push(keepNextPlan("Keep just the next stop in case it's indoors, and drop the rest to reassess later."));
      break;

    case "running_late":
      plans.push(pushLaterPlan(60, "Shift everything remaining back an hour instead of racing to catch up."));
      plans.push(keepNextPlan("Skip straight to the next reservation or stop and drop anything queued before it."));
      plans.push(clearPlan("Reset the rest of today", `Clear the ${countLabel} and treat the rest of the day as unplanned.`, "Unplanned time"));
      break;

    case "unwell":
      plans.push(clearPlan("Clear the rest of today", `Clear the ${countLabel} so there's nothing to feel behind on.`, "Rest / recover"));
      if (mealCount > 0) plans.push(keepMealsPlan());
      plans.push(pushLaterPlan(180, "Push everything back three hours in case a few hours of rest is all that's needed."));
      break;
  }

  return plans;
}
