import type { Place } from "../types";

// Provider abstraction: nothing outside this file (and its future siblings —
// a GooglePlacesProvider, a MapboxProvider) should know or care which real
// geocoding vendor is behind place resolution. Swapping providers later is a
// one-file change.

export interface PlaceResolution {
  canonicalName: string;
  category: Place["category"];
  city: string;
  country: string;
  timezone: string;
  lat?: number;
  lng?: number;
  addressLocalScript?: string;
  addressTranslit?: string;
  verified: boolean; // false = heuristic guess, show as "unverified" rather than fact
}

export interface PlacesProvider {
  resolve(name: string, cityHint?: string): Promise<PlaceResolution>;
}

// A small, hand-curated lookup so the Tokyo/Kyoto/Seoul demo itinerary
// resolves to real coordinates and real native-script addresses without a
// live API key. This is exactly the seam a GooglePlacesProvider or
// MapboxProvider would occupy in production — see the plan's §08.
const KNOWN_PLACES: Record<string, PlaceResolution> = {
  tokyo: {
    canonicalName: "Tokyo",
    category: "neighborhood",
    city: "Tokyo",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 35.6762,
    lng: 139.6503,
    verified: true
  },
  "hilton tokyo": {
    canonicalName: "Hilton Tokyo",
    category: "hotel",
    city: "Tokyo",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 35.6913,
    lng: 139.6939,
    addressLocalScript: "東京都新宿区西新宿6-6-2",
    addressTranslit: "6-6-2 Nishi-Shinjuku, Shinjuku-ku, Tokyo",
    verified: true
  },
  shibuya: {
    canonicalName: "Shibuya",
    category: "neighborhood",
    city: "Tokyo",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 35.658,
    lng: 139.7016,
    addressLocalScript: "東京都渋谷区",
    addressTranslit: "Shibuya-ku, Tokyo",
    verified: true
  },
  "meiji shrine": {
    canonicalName: "Meiji Shrine",
    category: "attraction",
    city: "Tokyo",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 35.6764,
    lng: 139.6993,
    addressLocalScript: "東京都渋谷区代々木神園町1-1",
    addressTranslit: "1-1 Yoyogikamizonocho, Shibuya-ku, Tokyo",
    verified: true
  },
  shinjuku: {
    canonicalName: "Shinjuku",
    category: "neighborhood",
    city: "Tokyo",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 35.6938,
    lng: 139.7034,
    addressLocalScript: "東京都新宿区",
    addressTranslit: "Shinjuku-ku, Tokyo",
    verified: true
  },
  "tokyo disneyland": {
    canonicalName: "Tokyo Disneyland",
    category: "attraction",
    city: "Tokyo",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 35.6329,
    lng: 139.8804,
    addressLocalScript: "千葉県浦安市舞浜1-1",
    addressTranslit: "1-1 Maihama, Urayasu, Chiba",
    verified: true
  },
  "tokyo station": {
    canonicalName: "Tokyo Station",
    category: "station",
    city: "Tokyo",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 35.6812,
    lng: 139.7671,
    addressLocalScript: "東京都千代田区丸の内1丁目",
    addressTranslit: "1 Chome Marunouchi, Chiyoda-ku, Tokyo",
    verified: true
  },
  kyoto: {
    canonicalName: "Kyoto",
    category: "neighborhood",
    city: "Kyoto",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 35.0116,
    lng: 135.7681,
    verified: true
  },
  "kyoto station": {
    canonicalName: "Kyoto Station",
    category: "station",
    city: "Kyoto",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 34.9858,
    lng: 135.7588,
    addressLocalScript: "京都府京都市下京区東塩小路町",
    addressTranslit: "Higashishiokoji-cho, Shimogyo-ku, Kyoto",
    verified: true
  },
  "fushimi inari": {
    canonicalName: "Fushimi Inari Taisha",
    category: "attraction",
    city: "Kyoto",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 34.9671,
    lng: 135.7727,
    addressLocalScript: "京都府京都市伏見区深草藪之内町68",
    addressTranslit: "68 Fukakusa Yabunouchicho, Fushimi-ku, Kyoto",
    verified: true
  },
  seoul: {
    canonicalName: "Seoul",
    category: "neighborhood",
    city: "Seoul",
    country: "South Korea",
    timezone: "Asia/Seoul",
    lat: 37.5665,
    lng: 126.978,
    verified: true
  },
  myeongdong: {
    canonicalName: "Myeongdong",
    category: "neighborhood",
    city: "Seoul",
    country: "South Korea",
    timezone: "Asia/Seoul",
    lat: 37.5636,
    lng: 126.9834,
    addressLocalScript: "서울특별시 중구 명동",
    addressTranslit: "Myeong-dong, Jung-gu, Seoul",
    verified: true
  },
  insadong: {
    canonicalName: "Insadong",
    category: "neighborhood",
    city: "Seoul",
    country: "South Korea",
    timezone: "Asia/Seoul",
    lat: 37.5744,
    lng: 126.985,
    addressLocalScript: "서울특별시 종로구 인사동",
    addressTranslit: "Insa-dong, Jongno-gu, Seoul",
    verified: true
  },
  "gyeongbokgung palace": {
    canonicalName: "Gyeongbokgung Palace",
    category: "attraction",
    city: "Seoul",
    country: "South Korea",
    timezone: "Asia/Seoul",
    lat: 37.5796,
    lng: 126.977,
    addressLocalScript: "서울특별시 종로구 사직로 161",
    addressTranslit: "161 Sajik-ro, Jongno-gu, Seoul",
    verified: true
  },
  "hotel granvia kyoto": {
    canonicalName: "Hotel Granvia Kyoto",
    category: "hotel",
    city: "Kyoto",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 34.9858,
    lng: 135.7588,
    addressLocalScript: "京都府京都市下京区烏丸通塩小路下ル東塩小路町901",
    addressTranslit: "901 Higashishiokoji-cho, Karasuma-dori, Shimogyo-ku, Kyoto",
    verified: true
  },
  gion: {
    canonicalName: "Gion",
    category: "neighborhood",
    city: "Kyoto",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 35.0037,
    lng: 135.7752,
    addressLocalScript: "京都府京都市東山区祇園町",
    addressTranslit: "Gion-machi, Higashiyama-ku, Kyoto",
    verified: true
  },
  "kansai international airport": {
    canonicalName: "Kansai International Airport",
    category: "airport",
    city: "Osaka",
    country: "Japan",
    timezone: "Asia/Tokyo",
    lat: 34.4347,
    lng: 135.2441,
    addressLocalScript: "大阪府泉佐野市泉州空港北1",
    addressTranslit: "1 Senshukukokita, Izumisano, Osaka",
    verified: true
  },
  "incheon international airport": {
    canonicalName: "Incheon International Airport",
    category: "airport",
    city: "Incheon",
    country: "South Korea",
    timezone: "Asia/Seoul",
    lat: 37.4602,
    lng: 126.4407,
    addressLocalScript: "인천광역시 중구 공항로 272",
    addressTranslit: "272 Gonghang-ro, Jung-gu, Incheon",
    verified: true
  },
  "n seoul tower": {
    canonicalName: "N Seoul Tower",
    category: "attraction",
    city: "Seoul",
    country: "South Korea",
    timezone: "Asia/Seoul",
    lat: 37.5512,
    lng: 126.9882,
    addressLocalScript: "서울특별시 용산구 남산공원길 105",
    addressTranslit: "105 Namsangongwon-gil, Yongsan-gu, Seoul",
    verified: true
  },
  dongdaemun: {
    canonicalName: "Dongdaemun",
    category: "neighborhood",
    city: "Seoul",
    country: "South Korea",
    timezone: "Asia/Seoul",
    lat: 37.5714,
    lng: 127.0098,
    addressLocalScript: "서울특별시 중구 동대문",
    addressTranslit: "Dongdaemun, Jung-gu, Seoul",
    verified: true
  },
  busan: {
    canonicalName: "Busan",
    category: "neighborhood",
    city: "Busan",
    country: "South Korea",
    timezone: "Asia/Seoul",
    lat: 35.1796,
    lng: 129.0756,
    verified: true
  },
  jeju: {
    canonicalName: "Jeju",
    category: "neighborhood",
    city: "Jeju",
    country: "South Korea",
    timezone: "Asia/Seoul",
    lat: 33.4996,
    lng: 126.5312,
    verified: true
  },
  "l7 myeongdong": {
    canonicalName: "L7 Myeongdong",
    category: "hotel",
    city: "Seoul",
    country: "South Korea",
    timezone: "Asia/Seoul",
    lat: 37.5607,
    lng: 126.9838,
    addressLocalScript: "서울특별시 중구 명동10길 15",
    addressTranslit: "15 Myeongdong 10-gil, Jung-gu, Seoul",
    verified: true
  },

  // Hokkaido / Aomori / Tokyo — added so a real, freely-imported itinerary
  // (not just the five curated demo cities above) resolves to real
  // coordinates too. Keys here MUST exactly match (case-insensitively) both
  // the gazetteer's canonical names (lib/parsing/placeGazetteer.ts) and the
  // literal hotel-name strings the heuristic parser lifts straight out of a
  // document's OVERNIGHT rows — upsertPlace only ever normalizes with
  // `.trim().toLowerCase()`, no fuzzy matching, so a mismatch here silently
  // falls back to an unverified guess instead of a real pin on the map.
  "new chitose airport": { canonicalName: "New Chitose Airport", category: "airport", city: "Chitose", country: "Japan", timezone: "Asia/Tokyo", lat: 42.7752, lng: 141.6923, verified: true },
  furano: { canonicalName: "Furano", category: "neighborhood", city: "Furano", country: "Japan", timezone: "Asia/Tokyo", lat: 43.3417, lng: 142.3833, verified: true },
  "furano natulux hotel": { canonicalName: "Furano Natulux Hotel", category: "hotel", city: "Furano", country: "Japan", timezone: "Asia/Tokyo", lat: 43.3444, lng: 142.3822, verified: true },
  biei: { canonicalName: "Biei", category: "neighborhood", city: "Biei", country: "Japan", timezone: "Asia/Tokyo", lat: 43.5883, lng: 142.4614, verified: true },
  "shirogane blue pond": { canonicalName: "Shirogane Blue Pond", category: "attraction", city: "Biei", country: "Japan", timezone: "Asia/Tokyo", lat: 43.5169, lng: 142.6925, verified: true },
  "shirahige falls": { canonicalName: "Shirahige Falls", category: "attraction", city: "Biei", country: "Japan", timezone: "Asia/Tokyo", lat: 43.5219, lng: 142.6914, verified: true },
  asahidake: { canonicalName: "Asahidake", category: "attraction", city: "Asahidake Onsen", country: "Japan", timezone: "Asia/Tokyo", lat: 43.6706, lng: 142.8508, verified: true },
  "la vista daisetsuzan": { canonicalName: "La Vista Daisetsuzan", category: "hotel", city: "Asahidake Onsen", country: "Japan", timezone: "Asia/Tokyo", lat: 43.6703, lng: 142.8511, verified: true },
  "sugatami station": { canonicalName: "Sugatami Station", category: "station", city: "Asahidake Onsen", country: "Japan", timezone: "Asia/Tokyo", lat: 43.6764, lng: 142.8908, verified: true },
  sounkyo: { canonicalName: "Sounkyo", category: "neighborhood", city: "Sounkyo Onsen", country: "Japan", timezone: "Asia/Tokyo", lat: 43.6997, lng: 142.9814, verified: true },
  "hotel kumoi, sounkyo": { canonicalName: "Hotel Kumoi, Sounkyo", category: "hotel", city: "Sounkyo Onsen", country: "Japan", timezone: "Asia/Tokyo", lat: 43.6992, lng: 142.982, verified: true },
  "ginga-no-taki": { canonicalName: "Ginga-no-Taki", category: "attraction", city: "Sounkyo Onsen", country: "Japan", timezone: "Asia/Tokyo", lat: 43.6892, lng: 142.9584, verified: true },
  "ryusei-no-taki": { canonicalName: "Ryusei-no-Taki", category: "attraction", city: "Sounkyo Onsen", country: "Japan", timezone: "Asia/Tokyo", lat: 43.687, lng: 142.9601, verified: true },
  sapporo: { canonicalName: "Sapporo", category: "neighborhood", city: "Sapporo", country: "Japan", timezone: "Asia/Tokyo", lat: 43.0618, lng: 141.3545, verified: true },
  "keio plaza hotel sapporo": { canonicalName: "Keio Plaza Hotel Sapporo", category: "hotel", city: "Sapporo", country: "Japan", timezone: "Asia/Tokyo", lat: 43.0592, lng: 141.353, verified: true },
  "jr sapporo station": { canonicalName: "JR Sapporo Station", category: "station", city: "Sapporo", country: "Japan", timezone: "Asia/Tokyo", lat: 43.0682, lng: 141.3508, verified: true },
  hakodate: { canonicalName: "Hakodate", category: "neighborhood", city: "Hakodate", country: "Japan", timezone: "Asia/Tokyo", lat: 41.7687, lng: 140.7288, verified: true },
  "hakoba hakodate by the share hotels": { canonicalName: "HakoBA Hakodate by THE SHARE HOTELS", category: "hotel", city: "Hakodate", country: "Japan", timezone: "Asia/Tokyo", lat: 41.771, lng: 140.7291, verified: true },
  "kanemori red brick warehouses": { canonicalName: "Kanemori Red Brick Warehouses", category: "attraction", city: "Hakodate", country: "Japan", timezone: "Asia/Tokyo", lat: 41.7767, lng: 140.7168, verified: true },
  motomachi: { canonicalName: "Motomachi", category: "neighborhood", city: "Hakodate", country: "Japan", timezone: "Asia/Tokyo", lat: 41.7757, lng: 140.7134, verified: true },
  "mt. hakodate ropeway": { canonicalName: "Mt. Hakodate Ropeway", category: "attraction", city: "Hakodate", country: "Japan", timezone: "Asia/Tokyo", lat: 41.7594, lng: 140.7047, verified: true },
  "hakodate morning market": { canonicalName: "Hakodate Morning Market", category: "attraction", city: "Hakodate", country: "Japan", timezone: "Asia/Tokyo", lat: 41.7737, lng: 140.7266, verified: true },
  goryokaku: { canonicalName: "Goryokaku", category: "attraction", city: "Hakodate", country: "Japan", timezone: "Asia/Tokyo", lat: 41.7975, lng: 140.7565, verified: true },
  "shin-hakodate-hokuto": { canonicalName: "Shin-Hakodate-Hokuto", category: "station", city: "Hokuto", country: "Japan", timezone: "Asia/Tokyo", lat: 41.9066, lng: 140.6486, verified: true },
  "shin-aomori": { canonicalName: "Shin-Aomori", category: "station", city: "Aomori", country: "Japan", timezone: "Asia/Tokyo", lat: 40.8256, lng: 140.6969, verified: true },
  oirase: { canonicalName: "Oirase", category: "attraction", city: "Oirase", country: "Japan", timezone: "Asia/Tokyo", lat: 40.5231, lng: 140.9067, verified: true },
  "oirase mori no hotel": { canonicalName: "Oirase Mori no Hotel", category: "hotel", city: "Oirase", country: "Japan", timezone: "Asia/Tokyo", lat: 40.548, lng: 140.8993, verified: true },
  "lake towada": { canonicalName: "Lake Towada", category: "attraction", city: "Towada", country: "Japan", timezone: "Asia/Tokyo", lat: 40.4614, lng: 140.8814, verified: true },
  hakkoda: { canonicalName: "Hakkoda", category: "attraction", city: "Aomori", country: "Japan", timezone: "Asia/Tokyo", lat: 40.6547, lng: 140.8663, verified: true },
  "sukayu onsen": { canonicalName: "Sukayu Onsen", category: "attraction", city: "Aomori", country: "Japan", timezone: "Asia/Tokyo", lat: 40.6428, lng: 140.8494, verified: true },
  aomori: { canonicalName: "Aomori", category: "neighborhood", city: "Aomori", country: "Japan", timezone: "Asia/Tokyo", lat: 40.8244, lng: 140.74, verified: true },
  "richmond hotel aomori": { canonicalName: "Richmond Hotel Aomori", category: "hotel", city: "Aomori", country: "Japan", timezone: "Asia/Tokyo", lat: 40.8248, lng: 140.7386, verified: true },
  "nebuta museum wa rasse": { canonicalName: "Nebuta Museum Wa Rasse", category: "attraction", city: "Aomori", country: "Japan", timezone: "Asia/Tokyo", lat: 40.8235, lng: 140.7423, verified: true },
  "aomori airport": { canonicalName: "Aomori Airport", category: "airport", city: "Aomori", country: "Japan", timezone: "Asia/Tokyo", lat: 40.7347, lng: 140.6908, verified: true },
  "hotel gracery shinjuku": { canonicalName: "Hotel Gracery Shinjuku", category: "hotel", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", lat: 35.695, lng: 139.7016, verified: true },
  harajuku: { canonicalName: "Harajuku", category: "neighborhood", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", lat: 35.6702, lng: 139.7026, verified: true },
  asakusa: { canonicalName: "Asakusa", category: "neighborhood", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", lat: 35.7118, lng: 139.7966, verified: true },
  ueno: { canonicalName: "Ueno", category: "neighborhood", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", lat: 35.7141, lng: 139.7744, verified: true },
  akihabara: { canonicalName: "Akihabara", category: "neighborhood", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", lat: 35.6984, lng: 139.7731, verified: true },
  tsukiji: { canonicalName: "Tsukiji", category: "neighborhood", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", lat: 35.6654, lng: 139.7707, verified: true },
  ginza: { canonicalName: "Ginza", category: "neighborhood", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", lat: 35.6717, lng: 139.765, verified: true },
  marunouchi: { canonicalName: "Marunouchi", category: "neighborhood", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", lat: 35.6813, lng: 139.766, verified: true },
  roppongi: { canonicalName: "Roppongi", category: "neighborhood", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", lat: 35.6641, lng: 139.7293, verified: true },
  "shinjuku gyoen": { canonicalName: "Shinjuku Gyoen", category: "attraction", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", lat: 35.6852, lng: 139.71, verified: true },

  // Korea side of this same itinerary shape (arrival/departure hub + a hotel near the airport).
  "nest hotel incheon": { canonicalName: "Nest Hotel Incheon", category: "hotel", city: "Incheon", country: "South Korea", timezone: "Asia/Seoul", lat: 37.449, lng: 126.4505, verified: true }
};

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function guessTimezone(cityHint?: string): string {
  const c = (cityHint ?? "").toLowerCase();
  if (c.includes("seoul") || c.includes("korea") || c.includes("busan")) return "Asia/Seoul";
  if (c.includes("tokyo") || c.includes("kyoto") || c.includes("osaka") || c.includes("japan")) return "Asia/Tokyo";
  return "Etc/UTC";
}

function guessCategory(name: string): Place["category"] {
  const n = name.toLowerCase();
  if (/hotel|hilton|marriott|hyatt|inn|resort|l7|ryokan/.test(n)) return "hotel";
  if (/station|airport|terminal/.test(n)) return /airport|terminal/.test(n) ? "airport" : "station";
  if (/restaurant|dinner|lunch|cafe|bbq|izakaya/.test(n)) return "restaurant";
  if (/shrine|temple|palace|museum|tower|park|disneyland|castle/.test(n)) return "attraction";
  return "neighborhood";
}

export class MockPlacesProvider implements PlacesProvider {
  async resolve(name: string, cityHint?: string): Promise<PlaceResolution> {
    const key = normalize(name);
    const known = KNOWN_PLACES[key];
    if (known) return known;

    // Unresolved place: return a best-effort guess, clearly unverified.
    // A real provider swapped in here (Google Places, Mapbox) would attempt
    // geocoding before falling back to this.
    return {
      canonicalName: name.trim(),
      category: guessCategory(name),
      city: cityHint?.trim() ?? "",
      country: "",
      timezone: guessTimezone(cityHint),
      verified: false
    };
  }
}

export const placesProvider: PlacesProvider = new MockPlacesProvider();
