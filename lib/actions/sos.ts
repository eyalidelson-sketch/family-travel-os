"use server";

import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import { repo } from "../repo";
import { getCurrentMember, isOrganizerForTrip } from "../session";
import { remainingItems, type SosAction } from "../sos/plans";

async function requireOrganizer(tripId: string): Promise<string> {
  const [isOrganizer, member] = await Promise.all([isOrganizerForTrip(tripId), getCurrentMember(tripId)]);
  if (!isOrganizer || !member) throw new Error("Only the trip organizer can apply a rescue plan.");
  return member.id;
}

/** Shifts a "HH:mm" time later within the same day, clamped to 23:59 rather than rolling into tomorrow (items belong to a fixed day). */
function shiftTime(date: string, timezone: string, time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const base = DateTime.fromISO(date, { zone: timezone || "Etc/UTC" }).set({ hour: h, minute: m, second: 0 });
  const shifted = base.plus({ minutes });
  if (shifted.toISODate() !== base.toISODate()) return "23:59";
  return shifted.toFormat("HH:mm");
}

export async function applySosPlanAction(tripId: string, dayId: string, afterTime: string, action: SosAction): Promise<{ error?: string }> {
  try {
    const actorId = await requireOrganizer(tripId);
    const bundle = await repo.getTripBundle(tripId);
    const day = bundle?.days.find((d) => d.id === dayId);
    if (!day) return { error: "That day couldn't be found." };

    const remaining = remainingItems(day.items, afterTime);

    switch (action.kind) {
      case "clear_remaining": {
        for (const item of remaining) await repo.deleteItineraryItem(item.id, actorId);
        await repo.addItineraryItem(dayId, actorId, { type: "free_time", title: action.replacementTitle, startTime: afterTime });
        break;
      }
      case "keep_types": {
        for (const item of remaining) {
          if (!action.types.includes(item.type)) await repo.deleteItineraryItem(item.id, actorId);
        }
        break;
      }
      case "keep_next_only": {
        const sorted = [...remaining].sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));
        const keepId = sorted[0]?.id;
        for (const item of remaining) {
          if (item.id !== keepId) await repo.deleteItineraryItem(item.id, actorId);
        }
        break;
      }
      case "push_later": {
        for (const item of remaining) {
          if (!item.startTime) continue;
          const newStart = shiftTime(day.date, day.timezone, item.startTime, action.minutes);
          const patch = item.endTime
            ? { startTime: newStart, endTime: shiftTime(day.date, day.timezone, item.endTime, action.minutes) }
            : { startTime: newStart };
          await repo.updateItineraryItem(item.id, actorId, patch);
        }
        break;
      }
    }

    revalidatePath(`/t/${tripId}/today`);
    revalidatePath(`/t/${tripId}/sos`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't apply that plan." };
  }
}
