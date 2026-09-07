// A small, curated named-entity list for the heuristic (offline, no-Claude-key)
// parser: real-world itinerary documents mention specific attractions,
// stations and neighborhoods inline in free-text schedule rows ("Biei:
// Patchwork Road...", "Fly ICN → CTS.", "Take the ropeway to Sugatami
// Station...") with no structural markup at all — there's no table column
// telling the parser "this word is a place." Claude can infer that from
// context; the offline fallback can't, so instead it matches against a
// closed list of names it actually knows about and stays honestly silent
// (no placeName) for anything outside that list, rather than guessing.
//
// Canonical names here are chosen to exactly match (case-insensitively) the
// keys added to lib/providers/places.ts's KNOWN_PLACES — that's what turns a
// gazetteer hit into a real pin with real coordinates instead of another
// unverified guess. Keep the two lists in sync when either changes.
//
// This is deliberately scoped to the kind of place names that show up in
// real Japan/Korea travel documents (the same shape as every curated demo
// place already in this project) rather than an attempt at general-purpose
// place-name recognition — see lib/providers/places.ts's own comment on why
// a hand-curated seam like this is the right size for a project without a
// live geocoding API key.
const GAZETTEER: [canonical: string, aliases: string[]][] = [
  // Existing curated demo places (already in KNOWN_PLACES) — included so a
  // document that mentions them inline (not just as a hotel/day city) is
  // still recognized.
  ["Tokyo", ["Tokyo"]],
  ["Kyoto", ["Kyoto"]],
  ["Seoul", ["Seoul"]],
  ["Busan", ["Busan"]],
  ["Jeju", ["Jeju"]],
  ["Shibuya", ["Shibuya Sky", "Shibuya Crossing", "Hachiko", "Shibuya"]],
  ["Shinjuku", ["Shinjuku"]],
  ["Meiji Shrine", ["Meiji Jingu", "Meiji Shrine"]],
  ["Tokyo Disneyland", ["Tokyo Disneyland"]],
  ["Tokyo Station", ["Tokyo Station"]],
  ["Fushimi Inari", ["Fushimi Inari Taisha", "Fushimi Inari"]],
  ["Gion", ["Gion"]],
  ["Kyoto Station", ["Kyoto Station"]],
  ["Gyeongbokgung Palace", ["Gyeongbokgung Palace", "Gyeongbokgung"]],
  ["Myeongdong", ["Myeongdong"]],
  ["Insadong", ["Insadong"]],
  ["N Seoul Tower", ["N Seoul Tower", "Namsan Tower"]],
  ["Dongdaemun", ["Dongdaemun"]],
  ["Kansai International Airport", ["Kansai International Airport", "Kansai Airport", "KIX"]],
  ["Incheon International Airport", ["Incheon International Airport", "ICN", "Incheon"]],

  // This trip's Hokkaido / Aomori / Tokyo places.
  ["Nest Hotel Incheon", ["Nest Hotel Incheon", "Nest Hotel"]],
  ["New Chitose Airport", ["New Chitose Airport", "New Chitose", "CTS"]],
  ["Furano Natulux Hotel", ["Furano Natulux Hotel"]],
  ["Furano", ["Furano", "Kamifurano"]],
  ["Biei", ["Biei", "Patchwork Road", "Panorama Road"]],
  ["Shirogane Blue Pond", ["Shirogane Blue Pond", "Blue Pond"]],
  ["Shirahige Falls", ["Shirahige Falls"]],
  ["Asahidake", ["Asahidake Onsen", "Asahidake"]],
  ["La Vista Daisetsuzan", ["La Vista Daisetsuzan"]],
  ["Sugatami Station", ["Sugatami Station", "Sugatami Pond", "Sugatami"]],
  ["Sounkyo", ["Sounkyo Onsen", "Sounkyo"]],
  ["Hotel Kumoi, Sounkyo", ["Hotel Kumoi, Sounkyo", "Hotel Kumoi"]],
  ["Ginga-no-Taki", ["Ginga-no-Taki", "Ginga no Taki"]],
  ["Ryusei-no-Taki", ["Ryusei-no-Taki", "Ryusei no Taki"]],
  ["Sapporo", ["Sapporo"]],
  ["Keio Plaza Hotel Sapporo", ["Keio Plaza Hotel Sapporo", "Keio Plaza"]],
  ["JR Sapporo Station", ["JR Sapporo Station", "Sapporo Station"]],
  ["Hakodate", ["Hakodate"]],
  ["HakoBA Hakodate by THE SHARE HOTELS", ["HakoBA Hakodate by THE SHARE HOTELS", "HakoBA Hakodate", "HakoBA"]],
  ["Kanemori Red Brick Warehouses", ["Kanemori Red Brick Warehouses", "Red Brick Warehouses", "Kanemori"]],
  ["Motomachi", ["Motomachi"]],
  ["Mt. Hakodate Ropeway", ["Mt. Hakodate Ropeway", "Mt Hakodate", "Mount Hakodate"]],
  ["Hakodate Morning Market", ["Hakodate Morning Market"]],
  ["Goryokaku", ["Goryokaku Tower", "Goryokaku Park", "Goryokaku"]],
  ["Shin-Hakodate-Hokuto", ["Shin-Hakodate-Hokuto"]],
  ["Shin-Aomori", ["Shin-Aomori Station", "Shin-Aomori"]],
  ["Oirase", ["Oirase Gorge", "Oirase Mori no Hotel", "Oirase"]],
  ["Lake Towada", ["Lake Towada", "Towada Shrine", "Yasumiya", "Nenokuchi"]],
  ["Hakkoda", ["Hakkoda Ropeway", "Hakkoda"]],
  ["Sukayu Onsen", ["Sukayu Onsen", "Sukayu", "Jigokunuma"]],
  ["Aomori", ["Aomori Yasukata", "Aomori"]],
  ["Richmond Hotel Aomori", ["Richmond Hotel Aomori"]],
  ["Nebuta Museum Wa Rasse", ["Nebuta Museum Wa Rasse", "Nebuta Museum"]],
  ["Aomori Airport", ["AOJ", "Aomori Airport"]],
  ["Hotel Gracery Shinjuku", ["Hotel Gracery Shinjuku"]],
  ["Shinjuku Gyoen", ["Shinjuku Gyoen"]],
  ["Harajuku", ["Harajuku", "Takeshita Street", "Omotesando", "Cat Street"]],
  ["Asakusa", ["Senso-ji", "Kaminarimon", "Nakamise", "Asakusa"]],
  ["Ueno", ["Ueno Park", "Ameyoko Market", "Ueno"]],
  ["Akihabara", ["Akihabara"]],
  ["Tsukiji", ["Tsukiji Outer Market", "Tsukiji"]],
  ["Ginza", ["Ginza"]],
  ["Marunouchi", ["Marunouchi", "Imperial Palace East Gardens"]],
  ["Roppongi", ["Roppongi", "Azabudai Hills"]]
];

interface GazetteerEntry {
  canonical: string;
  alias: string;
}

const FLAT: GazetteerEntry[] = GAZETTEER.flatMap(([canonical, aliases]) => aliases.map((alias) => ({ canonical, alias })))
  // Longest alias first, so "Shirogane Blue Pond" wins over the shorter,
  // less specific "Blue Pond" when both would match the same text.
  .sort((a, b) => b.alias.length - a.alias.length);

/**
 * Finds the longest known place name mentioned anywhere in `text` (a single
 * schedule-row description, a day-header title, ...) and returns its
 * canonical form, or undefined if nothing in the gazetteer matches. Matching
 * is a plain case-insensitive substring search — deliberately simple, since
 * the whole point is a closed, curated vocabulary rather than general NLP.
 */
export function matchGazetteer(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const { canonical, alias } of FLAT) {
    if (lower.includes(alias.toLowerCase())) return canonical;
  }
  return undefined;
}
