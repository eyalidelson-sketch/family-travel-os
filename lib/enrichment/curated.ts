import type { PlaceEnrichment } from "../types";

type Curated = Omit<PlaceEnrichment, "placeId" | "fetchedAt" | "staleAfter">;

// Hand-written, not AI-generated — a deliberately better fallback than the
// generic one for the handful of real places the demo trip actually visits,
// so trying the app without ANTHROPIC_API_KEY still feels like a finished
// product rather than a placeholder. Keyed the same way lib/providers/places
// resolves names. A real deployment would rely on Claude (or a live places
// API) for the long tail this list doesn't cover.
export const CURATED_ENRICHMENT: Record<string, Curated> = {
  "hilton tokyo": {
    description: "A reliable, family-friendly high-rise in Nishi-Shinjuku, a short walk from Shinjuku Station's west exit.",
    photos: [],
    practicalInfo: {
      nearestStation: "Shinjuku Station (6 min walk)",
      checkIn: "15:00",
      checkOut: "11:00",
      amenities: ["Rooftop bar", "Indoor pool", "Coin laundry", "Connecting rooms available"],
      familyTips: "Ask at check-in about connecting rooms — they're not always shown as bookable online.",
      estimatedCost: "Rooms typically from ¥28,000–45,000/night depending on season",
      familyAccessibility: "Step-free from the lobby to guest floors; the indoor pool and connecting rooms make it an easy base for younger kids."
    },
    source: "ai_generated"
  },
  "meiji shrine": {
    description: "A forested Shinto shrine in the middle of Tokyo, dedicated to Emperor Meiji and Empress Shoken.",
    photos: [],
    practicalInfo: {
      whatToDo:
        "Walk the gravel approach through the forest to the main shrine buildings, watch for a traditional wedding procession (common on weekends), and browse the wall of sake and wine barrels donated to the shrine near the entrance.",
      estimatedVisitMinutes: 75,
      familyTips: "The gravel paths are stroller-friendly; the inner courtyard is calm even when Harajuku next door is packed.",
      openingHours: "Sunrise to sunset, hours shift seasonally — typically 5:00–18:00",
      estimatedCost: "Free to enter the shrine grounds",
      familyAccessibility: "Wide, flat gravel paths suit strollers, though the surface can be slow going for very small wheels; no major stairs to the main buildings."
    },
    source: "ai_generated"
  },
  "tokyo disneyland": {
    description: "Tokyo's original Disney park — similar in layout to the US original, with several Japan-only attractions.",
    photos: [],
    practicalInfo: {
      whatToDo:
        "Ride Pooh's Hunny Hunt and Monsters, Inc. Ride & Go Seek! (both Japan-exclusive), catch a parade down World Bazaar, and save time for the evening projection show on the castle.",
      estimatedVisitMinutes: 480,
      familyTips: "Buy timed-entry tickets in advance; the app's virtual queue for popular rides fills up within minutes of opening.",
      openingHours: "Typically 9:00–21:00, varies by season and day — check the official calendar before you go",
      estimatedCost: "1-Day Passport ¥7,900–10,900 for ages 12+; ¥4,700–5,600 for ages 4–11 (age-banded, changes with demand)",
      familyAccessibility: "Strollers can be rented at the entrance; most queues and attractions are wheelchair/stroller accessible with a separate accessible entrance, and baby-care rooms are available in each land."
    },
    source: "ai_generated"
  },
  shibuya: {
    description: "One of Tokyo's busiest commercial districts, best known for the scramble crossing outside the station.",
    photos: [],
    practicalInfo: {
      whatToDo:
        "Watch the scramble crossing from the Starbucks second floor or the Shibuya Sky observation deck, say hello to the Hachiko statue, and browse Shibuya 109 or Miyashita Park for shopping.",
      estimatedVisitMinutes: 120,
      familyTips: "Mornings are far calmer than afternoons if crowds are a concern with kids.",
      estimatedCost: "Free to walk around; Shibuya Sky observation deck is roughly ¥2,000–2,500 for adults, less for children",
      familyAccessibility: "Flat and paved throughout, but extremely crowded at peak times — a carrier can be easier than a stroller in the densest stretches near the crossing."
    },
    source: "ai_generated"
  },
  shinjuku: {
    description: "A dense mix of department stores, izakaya alleys, and the Tokyo Metropolitan Government observatories.",
    photos: [],
    practicalInfo: {
      whatToDo:
        "Ride the free elevator to the Tokyo Metropolitan Government Building's observation deck for skyline views, then wander the narrow lantern-lit lanes of Omoide Yokocho for a snack.",
      estimatedVisitMinutes: 150,
      openingHours: "Observation deck typically 9:30–22:00, closed some Tuesdays — check ahead",
      estimatedCost: "The observation deck is free; budget for food separately",
      familyAccessibility: "Elevators serve the observation deck; the surrounding station area involves a lot of walking and stairs at busy exits, so allow extra time with a stroller."
    },
    source: "ai_generated"
  },
  "fushimi inari": {
    description: "Thousands of vermillion torii gates climb Mount Inari behind the shrine — one of Kyoto's most photographed sights.",
    photos: [],
    practicalInfo: {
      whatToDo:
        "Walk up through the first tunnels of gates for the classic photo, stop at Yotsutsuji intersection (about 30-40 minutes up) for a city view if legs allow, and look out for the small fox statues along the way.",
      estimatedVisitMinutes: 90,
      familyTips: "You don't need to reach the summit (2+ hours round trip) — the first 20 minutes already deliver the classic photo.",
      openingHours: "Open 24 hours, but best visited in daylight",
      estimatedCost: "Free",
      familyAccessibility: "Paved near the entrance, turning to stone steps and uneven ground further up — not stroller-friendly past the first few hundred meters; a carrier works better for the climb."
    },
    source: "ai_generated"
  },
  "hotel granvia kyoto": {
    description: "Directly connected to Kyoto Station — about as convenient a base for day trips as Kyoto offers.",
    photos: [],
    practicalInfo: {
      nearestStation: "Kyoto Station (in-building)",
      checkIn: "15:00",
      checkOut: "11:00",
      amenities: ["Multiple restaurants", "Direct station access"],
      estimatedCost: "Rooms typically from ¥30,000–50,000/night depending on season",
      familyAccessibility: "Elevator access straight from the station concourse — one of the easiest hotels in Kyoto for luggage and strollers."
    },
    source: "ai_generated"
  },
  gion: {
    description: "Kyoto's best-known geisha (geiko) district — narrow lanes of wooden machiya townhouses.",
    photos: [],
    practicalInfo: {
      whatToDo:
        "Stroll Hanamikoji-dori and Shirakawa Canal in the early evening, browse traditional craft shops, and watch (from a respectful distance) for geiko or maiko heading to appointments.",
      estimatedVisitMinutes: 90,
      familyTips: "Please don't approach or photograph geiko/maiko up close — a private-photography ban is enforced with fines in parts of the district.",
      estimatedCost: "Free to walk around",
      familyAccessibility: "Flat paved lanes, but narrow and can get crowded in the evening — fine for a stroller earlier in the day."
    },
    source: "ai_generated"
  },
  "gyeongbokgung palace": {
    description: "The largest of Seoul's five grand palaces, first built in 1395 and the backdrop for the changing-of-the-guard ceremony.",
    photos: [],
    practicalInfo: {
      whatToDo:
        "Catch the changing-of-the-guard ceremony at the main gate, walk through the throne hall and royal residences, and visit the National Folk Museum on the palace grounds.",
      estimatedVisitMinutes: 120,
      familyTips: "The changing-of-the-guard ceremony runs a few times a day and is a good structure for younger kids' attention spans.",
      openingHours: "Typically 9:00–18:00, closed Tuesdays — hours extend in summer",
      estimatedCost: "Adults ₩3,000, free for children under 7 and seniors over 65",
      familyAccessibility: "Mostly flat gravel and paved courtyards, stroller-friendly; a few raised wooden thresholds at building entrances aren't."
    },
    source: "ai_generated"
  },
  myeongdong: {
    description: "A dense shopping and street-food district in central Seoul, busy well into the evening.",
    photos: [],
    practicalInfo: {
      whatToDo: "Graze the street-food carts along the main pedestrian strip, browse cosmetics and fashion shops, and try a nearby BBQ or Korean fried chicken spot for dinner.",
      estimatedVisitMinutes: 90,
      estimatedCost: "Free to walk around; street food is typically ₩3,000–6,000 per item",
      familyAccessibility: "Flat and pedestrianized, but very crowded in the evening — a carrier is easier than a stroller at peak hours."
    },
    source: "ai_generated"
  },
  insadong: {
    description: "Seoul's traditional arts-and-crafts district — teahouses, galleries, and Ssamziegil's shopping courtyard.",
    photos: [],
    practicalInfo: {
      whatToDo: "Browse the Ssamziegil shopping courtyard's small craft stalls, stop for tea at a traditional teahouse, and duck into the small galleries along the main street.",
      estimatedVisitMinutes: 120,
      estimatedCost: "Free to walk around; galleries are mostly free, tea houses typically ₩8,000–15,000 per person",
      familyAccessibility: "Mostly flat, pedestrian-friendly street with a stroller-manageable ramp up through Ssamziegil's courtyard."
    },
    source: "ai_generated"
  },
  "l7 myeongdong": {
    description: "A design-forward mid-range hotel right in Myeongdong, walkable to most central Seoul sights.",
    photos: [],
    practicalInfo: {
      nearestStation: "Euljiro 1(il)-ga Station (4 min walk)",
      checkIn: "15:00",
      checkOut: "12:00",
      amenities: ["Rooftop terrace", "24hr gym"],
      estimatedCost: "Rooms typically from ₩150,000–250,000/night depending on season",
      familyAccessibility: "Elevator access throughout; central location means less walking with kids to reach major sights."
    },
    source: "ai_generated"
  },
  "n seoul tower": {
    description: "An observation tower atop Namsan mountain with panoramic views over the city.",
    photos: [],
    practicalInfo: {
      whatToDo: "Ride the cable car up Namsan, take in the 360° observation deck, and look for the thousands of padlocks left by couples along the terrace railings.",
      estimatedVisitMinutes: 90,
      familyTips: "The cable car up is more fun for kids than the bus, and cuts the visit short if legs are tired.",
      openingHours: "Typically 10:00–23:00, later on weekends",
      estimatedCost: "Cable car round-trip ~₩15,000 for adults; observation deck admission ~₩16,000 for adults, less for children",
      familyAccessibility: "Elevators serve the observation deck itself; the base area around the cable car station has some sloped paths and stairs."
    },
    source: "ai_generated"
  }
};

export function getCuratedEnrichment(canonicalName: string): Curated | undefined {
  return CURATED_ENRICHMENT[canonicalName.trim().toLowerCase()];
}
