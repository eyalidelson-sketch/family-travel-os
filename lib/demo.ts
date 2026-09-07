import { DateTime } from "luxon";
import type { ParsedDay, ParsedItem, ParsedTrip } from "./parsing-types";
import { repo } from "./repo";
import type { Trip } from "./types";

// Hardcoded real photos for the 13 curated demo places (lib/enrichment/curated.ts)
// — direct Unsplash links, not the live Unsplash/Google Places APIs, so every
// card in the sample trip shows a real photo the instant the app starts, with
// zero environment variables set. Each URL is Unsplash's own public,
// key-free per-photo download redirect (the same link the "Download" button
// on unsplash.com/photos/<id> uses) rather than a hand-copied CDN hash, so
// there's nothing here that can silently drift out of date or 404 from a
// typo in a long random hash. Keyed exactly like CURATED_ENRICHMENT — lowercased,
// trimmed canonical name — so lib/enrichment/service.ts can look photos up
// the same way it looks up curated text, and merge the two independently.
export const DEMO_PLACE_PHOTOS: Record<string, string> = {
  "hilton tokyo": "https://unsplash.com/photos/pRAs34PRUuU/download?w=1600&q=80",
  "meiji shrine": "https://unsplash.com/photos/BOQGF_zvmVw/download?w=1600&q=80",
  "tokyo disneyland": "https://unsplash.com/photos/JXfHZYoEIM0/download?w=1600&q=80",
  shibuya: "https://unsplash.com/photos/3sOs1jSpbU4/download?w=1600&q=80",
  shinjuku: "https://unsplash.com/photos/8Tlrh8aPFw0/download?w=1600&q=80",
  "fushimi inari": "https://unsplash.com/photos/VulPpt46fXk/download?w=1600&q=80",
  "hotel granvia kyoto": "https://unsplash.com/photos/EQm0ctEJa2A/download?w=1600&q=80",
  gion: "https://unsplash.com/photos/Sj2K8XcIW54/download?w=1600&q=80",
  "gyeongbokgung palace": "https://unsplash.com/photos/T5NIVYYfynY/download?w=1600&q=80",
  myeongdong: "https://unsplash.com/photos/UAh5DRV_4pI/download?w=1600&q=80",
  insadong: "https://unsplash.com/photos/1zC9UAMO20o/download?w=1600&q=80",
  "l7 myeongdong": "https://unsplash.com/photos/k9hnlQTccgk/download?w=1600&q=80",
  "n seoul tower": "https://unsplash.com/photos/RxWUBc0womc/download?w=1600&q=80"
};

// Seed data for the "view a sample trip" link on the Welcome screen — the
// Tokyo/Kyoto/Seoul trip from the product plan, anchored so that "today"
// (whenever this happens to run) always lands on day 12, in Seoul, matching
// the approved Today wireframe exactly.
//
// The anchor is computed in Seoul's own local date — not the server's OS
// timezone — for the same reason every other date in this app is: "today"
// must mean today for the destination, not wherever the process happens to
// be running.
const ANCHOR_ZONE = "Asia/Seoul";
const TODAY_LOCAL = DateTime.now().setZone(ANCHOR_ZONE).startOf("day");

function iso(offsetDays: number): string {
  return TODAY_LOCAL.plus({ days: offsetDays }).toISODate()!;
}

function item(partial: Partial<ParsedItem> & Pick<ParsedItem, "type" | "title">): ParsedItem {
  return { source: "organizer_input", confidence: 1, needsReview: false, ...partial };
}

const TOTAL_DAYS = 30;
const TODAY_INDEX = 12; // 1-based — "Day 12 of 30"
const START_OFFSET = -(TODAY_INDEX - 1);

function buildDays(): ParsedDay[] {
  const days: ParsedDay[] = [];

  const content: Record<number, { city: string; isTravelDay?: boolean; items?: ParsedItem[] }> = {
    1: { city: "Tokyo", items: [item({ type: "note", title: "Arrive Tokyo" })] },
    2: {
      city: "Tokyo",
      items: [
        item({ type: "activity", title: "Shibuya morning", startTime: "09:30", placeName: "Shibuya" }),
        item({ type: "activity", title: "Meiji Shrine", startTime: "12:00", placeName: "Meiji Shrine" }),
        item({ type: "meal", title: "Dinner in Shinjuku", startTime: "19:00", placeName: "Shinjuku" })
      ]
    },
    3: { city: "Tokyo", items: [item({ type: "activity", title: "Tokyo Disneyland", startTime: "09:00", endTime: "20:00", placeName: "Tokyo Disneyland" })] },
    4: { city: "Tokyo", items: [item({ type: "free_time", title: "Free morning · Ginza shopping in the afternoon", startTime: "14:00" })] },
    5: { city: "Tokyo", items: [item({ type: "note", title: "Pack up — last night in Tokyo" })] },
    6: {
      city: "Kyoto",
      isTravelDay: true,
      items: [
        item({ type: "note", title: "Checkout: Hilton Tokyo", startTime: "10:00" }),
        item({ type: "activity", title: "Fushimi Inari at sunset", startTime: "17:00", placeName: "Fushimi Inari" })
      ]
    },
    7: { city: "Kyoto", items: [item({ type: "activity", title: "Arashiyama bamboo grove", startTime: "09:00" }), item({ type: "meal", title: "Lunch near Gion", startTime: "12:30", placeName: "Gion" })] },
    8: { city: "Kyoto", items: [item({ type: "free_time", title: "Free day in Kyoto" })] },
    9: { city: "Kyoto", items: [item({ type: "activity", title: "Evening walk in Gion", startTime: "18:00", placeName: "Gion" })] },
    10: {
      city: "Seoul",
      isTravelDay: true,
      items: [
        item({ type: "note", title: "Checkout: Hotel Granvia Kyoto", startTime: "09:00" }),
        item({ type: "meal", title: "Dinner in Myeongdong", startTime: "20:00", placeName: "Myeongdong" })
      ]
    },
    11: {
      city: "Seoul",
      items: [
        item({ type: "activity", title: "Insadong morning", startTime: "10:00", placeName: "Insadong" }),
        item({ type: "activity", title: "N Seoul Tower at sunset", startTime: "17:30", placeName: "N Seoul Tower" }),
        item({ type: "meal", title: "Dinner in Myeongdong", startTime: "20:00", placeName: "Myeongdong" })
      ]
    },
    12: {
      city: "Seoul",
      items: [
        item({ type: "meal", title: "Breakfast", startTime: "09:00" }),
        item({ type: "activity", title: "Gyeongbokgung Palace", startTime: "10:30", endTime: "13:00", placeName: "Gyeongbokgung Palace" }),
        item({ type: "meal", title: "Lunch in Myeongdong", startTime: "13:30", endTime: "14:45", placeName: "Myeongdong" }),
        item({ type: "activity", title: "Insadong", startTime: "15:00", endTime: "18:30", placeName: "Insadong" }),
        item({ type: "meal", title: "Dinner reservation", startTime: "19:30", placeName: "Myeongdong", notes: "Table for the whole family" })
      ]
    },
    13: { city: "Seoul", items: [item({ type: "activity", title: "Dongdaemun market", startTime: "11:00", placeName: "Dongdaemun" })] },
    14: { city: "Seoul", items: [item({ type: "free_time", title: "Free day" })] },
    15: { city: "Seoul", items: [item({ type: "activity", title: "Namsan cable car", startTime: "10:00" })] },
    16: { city: "Seoul", items: [item({ type: "free_time", title: "Free day — laundry & rest" })] },
    20: { city: "Busan", isTravelDay: true, items: [item({ type: "note", title: "KTX to Busan", startTime: "09:30" })] },
    25: { city: "Jeju", isTravelDay: true, items: [item({ type: "note", title: "Flight to Jeju", startTime: "11:00" })] }
  };

  let lastCity = "Tokyo";
  for (let i = 1; i <= TOTAL_DAYS; i++) {
    const c = content[i];
    if (c) lastCity = c.city;
    days.push({
      date: iso(START_OFFSET + (i - 1)),
      cityHint: lastCity,
      isTravelDay: c?.isTravelDay ?? false,
      items: c?.items ?? []
    });
  }

  days[0]!.hotel = { placeName: "Hilton Tokyo", cityHint: "Tokyo", checkIn: days[0]!.date, checkOut: days[5]!.date, confidence: 1 };
  days[5]!.hotel = { placeName: "Hotel Granvia Kyoto", cityHint: "Kyoto", checkIn: days[5]!.date, checkOut: days[9]!.date, confidence: 1 };
  days[9]!.hotel = { placeName: "L7 Myeongdong", cityHint: "Seoul", checkIn: days[9]!.date, checkOut: days[19]!.date, confidence: 1 };

  days[5]!.transport = [{ mode: "train", fromPlaceName: "Tokyo Station", toPlaceName: "Kyoto Station", carrier: "Shinkansen Nozomi", confidence: 1 }];
  days[9]!.transport = [{ mode: "flight", fromPlaceName: "Kansai International Airport", toPlaceName: "Incheon International Airport", carrier: "Asiana Airlines", confidence: 1 }];

  return days;
}

function buildDemoTrip(): ParsedTrip {
  return {
    name: "Japan & Korea 2026",
    countries: ["Japan", "South Korea"],
    startDate: iso(START_OFFSET),
    endDate: iso(START_OFFSET + TOTAL_DAYS - 1),
    days: buildDays(),
    warnings: []
  };
}

const globalForDemo = globalThis as unknown as { __travelOsDemoTripId?: string };

async function seedDemoMembersAndProfiles(tripId: string, organizerId: string) {
  await repo.addFoodRestriction(organizerId, { type: "diet", label: "Gluten-free" });
  await repo.addFoodPreference(organizerId, { category: "like", label: "Ramen", weight: 5 });
  await repo.addFoodPreference(organizerId, { category: "like", label: "Sushi", weight: 5 });
  await repo.addFoodPreference(organizerId, { category: "like", label: "Korean BBQ", weight: 4 });
  await repo.addFoodPreference(organizerId, { category: "like", label: "Medium spicy food", weight: 3 });
  await repo.addFoodPreference(organizerId, { category: "dislike", label: "Seafood stew", weight: 4 });

  const tamar = await repo.joinTrip(tripId, "Tamar");
  await repo.addFoodRestriction(tamar.id, { type: "diet", label: "Vegetarian" });
  await repo.addFoodPreference(tamar.id, { category: "like", label: "Mild flavors", weight: 4 });

  const noa = await repo.joinTrip(tripId, "Noa");
  await repo.addFoodPreference(noa.id, { category: "like", label: "Noodles", weight: 5 });
  await repo.addFoodPreference(noa.id, { category: "dislike", label: "Very spicy food", weight: 4 });

  await repo.joinTrip(tripId, "Gil");
}

export async function getOrCreateDemoTrip(): Promise<Trip> {
  if (globalForDemo.__travelOsDemoTripId) {
    const existing = await repo.getTripBundle(globalForDemo.__travelOsDemoTripId);
    if (existing) return existing.trip;
  }
  const bundle = await repo.createTripFromParsed(buildDemoTrip(), "Danny");
  globalForDemo.__travelOsDemoTripId = bundle.trip.id;
  await seedDemoMembersAndProfiles(bundle.trip.id, bundle.trip.createdByTripMemberId);
  return bundle.trip;
}
