import type { Locale } from "./locale";

// A hand-maintained dictionary, not a translation service — every string a
// family actually reads on the primary screens (Welcome, the tab bar, Today,
// Place Detail, Full Trip, Food Finder) has a real Hebrew translation here,
// not a machine pass. Screens not yet covered (edit-mode forms, AI Trip
// Check, Save Our Day, Family Voting, member profiles) still render in
// English even with Hebrew selected — an honest gap, not a silent one; see
// the README for exactly what's covered.
//
// t(locale, key) looks up a static string. A few labels need a number baked
// in (e.g. "Day 12 of 30") — those are small functions below instead of
// dictionary entries, since neither language's word order is enforceable at
// runtime for a translated key with %-style placeholders.

const dict = {
  // Welcome
  appName: { en: "Family Travel OS", he: "משפחה בדרך" },
  tagline: { en: "Your itinerary, brought to life.", he: "המסלול שלכם, קם לחיים." },
  createTrip: { en: "Create a trip", he: "יצירת טיול" },
  joinTrip: { en: "Join a trip", he: "הצטרפות לטיול" },
  viewSampleTrip: { en: "View a sample trip (Tokyo → Kyoto → Seoul)", he: "צפו בטיול לדוגמה (טוקיו ← קיוטו ← סיאול)" },

  // Tab bar
  tabToday: { en: "Today", he: "היום" },
  tabTrip: { en: "Trip", he: "טיול" },
  tabMap: { en: "Map", he: "מפה" },
  tabProfile: { en: "Profile", he: "פרופיל" },

  // Today
  todaySectionTitle: { en: "Today", he: "היום" },
  editThisDay: { en: "Edit this day", he: "עריכת היום" },
  editItinerary: { en: "Edit itinerary", he: "עריכת מסלול" },
  doneEditing: { en: "Done editing", he: "סיום עריכה" },
  yesterday: { en: "Yesterday", he: "אתמול" },
  tomorrow: { en: "Tomorrow", he: "מחר" },
  today: { en: "Today", he: "היום" },
  nothingScheduled: { en: "Nothing scheduled right now — enjoy the downtime.", he: "אין כרגע שום דבר בתוכנית — תיהנו מהזמן הפנוי." },
  nothingPlanned: { en: "Nothing planned — a free day.", he: "שום דבר לא מתוכנן — יום חופשי." },
  tonight: { en: "Tonight", he: "הלילה" },
  addressNotVerified: { en: "Address not verified yet", he: "הכתובת עדיין לא אומתה" },
  gettingThereToday: { en: "Getting there today", he: "ההגעה להיום" },
  tripStartsToday: { en: "Trip starts today", he: "הטיול מתחיל היום" },
  tripWrappedUp: { en: "This trip has wrapped up — hope it was a good one.", he: "הטיול הזה כבר הסתיים — מקווים שהיה נהדר." },
  now: { en: "Now", he: "עכשיו" },
  next: { en: "Next", he: "הבא בתור" },
  details: { en: "Details", he: "פרטים" },
  address: { en: "Address", he: "כתובת" },

  // Place detail
  back: { en: "Back", he: "חזרה" },
  illustrative: { en: "Illustrative", he: "המחשה" },
  photoViaGoogle: { en: "Photo via Google", he: "תמונה מ-Google" },
  photoViaUnsplash: { en: "Photo via Unsplash", he: "תמונה מ-Unsplash" },
  photoViaWikipedia: { en: "Photo via Wikipedia", he: "תמונה מוויקיפדיה" },
  yourStay: { en: "Your stay", he: "השהות שלכם" },
  onYourItinerary: { en: "On your itinerary", he: "במסלול שלכם" },
  whatToDoHere: { en: "What to do here", he: "מה לעשות כאן" },
  usefulInformation: { en: "Useful information", he: "מידע שימושי" },
  directions: { en: "Directions", he: "ניווט" },
  showLocalAddress: { en: "Show local address", he: "הצג כתובת מקומית" },
  askAboutThisPlace: { en: "Ask about this place", he: "שאלו על המקום הזה" },
  identifiedAutomatically: {
    en: "Identified automatically — verify anything time-sensitive",
    he: "זוהה אוטומטית — כדאי לוודא כל פרט תלוי-זמן"
  },
  fromExternalSource: { en: "From an external source", he: "ממקור חיצוני" },

  // Full trip
  fullTrip: { en: "Full trip", he: "כל הטיול" },
  nowBadge: { en: "NOW", he: "עכשיו" },
  freeDay: { en: "Free day", he: "יום חופשי" },

  // Route map
  routeMapTitle: { en: "Trip Route Map", he: "מפת המסלול" },
  routeMapSubtitle: {
    en: "Tap a photo pin for the stop, or a transport icon for the connection details.",
    he: "הקישו על תמונת עצירה לפרטי היעד, או על סמל תחבורה לפרטי החיבור."
  },
  routeMapEmpty: {
    en: "Add at least one destination with dates to see it on the route map.",
    he: "הוסיפו לפחות יעד אחד עם תאריכים כדי לראות אותו במפת המסלול."
  },
  // Shown when the trip has stops but none of them carry real coordinates
  // yet, so the real Leaflet/OpenStreetMap map (which only ever plots real
  // pins — see components/map/LeafletRouteMap.tsx) has nothing to draw.
  routeMapNoCoordinates: {
    en: "None of this trip's stops have real map coordinates yet, so there's nothing to plot on the map.",
    he: "לאף אחת מהעצירות בטיול הזה אין עדיין קואורדינטות מדויקות, ולכן אין מה להציג על המפה."
  },
  routeMapLoading: { en: "Loading map…", he: "טוען מפה…" },
  approximateLocation: {
    en: "Approximate position — exact coordinates aren't available for this place yet",
    he: "מיקום משוער — קואורדינטות מדויקות עדיין לא זמינות למקום הזה"
  },
  viewFullDetails: { en: "View full details", he: "לצפייה בפרטים המלאים" },
  close: { en: "Close", he: "סגירה" },
  departure: { en: "Departure", he: "יציאה" },
  arrival: { en: "Arrival", he: "הגעה" },
  confirmationNumber: { en: "Booking / confirmation number", he: "מספר הזמנה / אישור" },
  carrierLabel: { en: "Carrier", he: "מפעיל/ה" },
  transportModeFlight: { en: "Flight", he: "טיסה" },
  transportModeTrain: { en: "Train", he: "רכבת" },
  transportModeCar: { en: "Rental car", he: "רכב שכור" },
  transportModeBus: { en: "Bus", he: "אוטובוס" },
  transportModeFerry: { en: "Ferry", he: "מעבורת" },
  transportModeOther: { en: "Transport", he: "תחבורה" },

  // Food finder
  familyFoodFinder: { en: "Family Food Finder", he: "מציאת מסעדות למשפחה" },
  foodFinderSubtitle: {
    en: "Hard restrictions always win — a 0% match means it's unsafe for someone, full stop.",
    he: "מגבלות קשות תמיד גוברות — התאמה של 0% אומרת שזה לא בטוח למישהו, נקודה."
  },
  bestCompromise: { en: "Best Compromise", he: "הפשרה הטובה ביותר" },
  prioritizeMember: { en: "Prioritize Member", he: "העדפה לבן משפחה" },
  addToToday: { en: "Add to today", he: "הוספה להיום" },
  addedToToday: { en: "Added to today", he: "נוסף להיום" },

  // Profile
  familyFoodProfiles: { en: "Family & food profiles", he: "פרופילי משפחה ואוכל" },
  you: { en: "(you)", he: "(אתם)" },
  allergiesRestrictions: { en: "Allergies & restrictions", he: "אלרגיות והגבלות" },
  noRestrictionsOnFile: { en: "No restrictions on file — assumed safe to serve anything.", he: "אין הגבלות רשומות — מניחים שבטוח להגיש כל דבר." },
  removeRestriction: { en: "Remove restriction", he: "הסרת הגבלה" },
  addRestriction: { en: "Add restriction", he: "הוספת הגבלה" },
  foodPreferences: { en: "Food preferences", he: "העדפות אוכל" },
  noPreferencesYet: { en: "No preferences added yet.", he: "עדיין לא נוספו העדפות." },
  removePreference: { en: "Remove preference", he: "הסרת העדפה" },
  addPreference: { en: "Add preference", he: "הוספת העדפה" },
  saving: { en: "Saving…", he: "שומר…" },
  cancel: { en: "Cancel", he: "ביטול" },
  add: { en: "Add", he: "הוספה" },
  notesOptional: { en: "Notes (optional)", he: "הערות (לא חובה)" },
  likes: { en: "Likes", he: "אוהב/ת" },
  dislikes: { en: "Dislikes", he: "לא אוהב/ת" },
  restrictionTypeAllergy: { en: "Allergy", he: "אלרגיה" },
  restrictionTypeMedical: { en: "Medical", he: "רפואי" },
  restrictionTypeReligious: { en: "Religious", he: "דתי" },
  restrictionTypeDiet: { en: "Diet", he: "תזונה" },

  // Voting
  familyVoting: { en: "Family Voting", he: "הצבעה משפחתית" },
  startFamilyVote: { en: "Start a family vote", he: "פתיחת הצבעה משפחתית" },
  pastVotes: { en: "Past votes", he: "הצבעות קודמות" },
  closed: { en: "Closed", he: "סגור" },
  closePoll: { en: "Close poll", he: "סגירת ההצבעה" },
  pollQuestionPlaceholder: { en: "What should we vote on? e.g. Afternoon activity", he: "על מה נצביע? למשל: פעילות אחר הצהריים" },
  removeOption: { en: "Remove option", he: "הסרת אפשרות" },
  addOption: { en: "Add option", he: "הוספת אפשרות" },
  startVote: { en: "Start vote", he: "פתיחת הצבעה" },

  // Language toggle
  language: { en: "Language", he: "שפה" }
} as const satisfies Record<string, Record<Locale, string>>;

export type TranslationKey = keyof typeof dict;

export function t(locale: Locale, key: TranslationKey): string {
  return dict[key][locale];
}

export function dayOfLabel(locale: Locale, dayIndex: number, totalDays: number): string {
  return locale === "he" ? `יום ${dayIndex} מתוך ${totalDays}` : `Day ${dayIndex} of ${totalDays}`;
}

export function dayNLabel(locale: Locale, dayIndex: number): string {
  return locale === "he" ? `יום ${dayIndex}` : `Day ${dayIndex}`;
}

export function daysCountLabel(locale: Locale, days: number): string {
  if (locale === "he") return `${days} ${days === 1 ? "יום" : "ימים"}`;
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function moreCountLabel(locale: Locale, count: number): string {
  return locale === "he" ? `+${count} נוספים` : `+${count} more`;
}

export function noRestaurantsLabel(locale: Locale, city: string): string {
  return locale === "he" ? `אין עדיין מסעדות רשומות עבור ${city}.` : `No restaurants on file for ${city} yet.`;
}

export function viewingProfileLabel(locale: Locale, name: string): string {
  return locale === "he"
    ? `אתם צופים בפרופיל האוכל של ${name}. רק ${name} או מארגן/ת הטיול יכולים לשנות אותו.`
    : `You're viewing ${name}'s food profile. Only ${name} or the trip organizer can change it.`;
}

export function noPollsLabel(locale: Locale, isOrganizer: boolean): string {
  if (locale === "he") {
    return `אין עדיין הצבעות — ${isOrganizer ? "פתחו אחת למעלה עבור הפעילות האופציונלית הבאה." : "בקשו מהמארגן/ת לפתוח אחת."}`;
  }
  return `No polls yet — ${isOrganizer ? "start one above for the next optional activity." : "ask the organizer to start one."}`;
}

export function voteCountLabel(locale: Locale, count: number): string {
  return locale === "he" ? `${count} הצבעות` : `${count} vote${count === 1 ? "" : "s"}`;
}

export function optionNLabel(locale: Locale, n: number): string {
  return locale === "he" ? `אפשרות ${n}` : `Option ${n}`;
}

// `reason` is typed optional here because MemberMatch.unsafeReason
// (lib/food/match.ts) is `string | undefined` at the type level — in
// practice every `safe: false` branch in checkSafety() does set a reason,
// but TypeScript can't narrow that invariant through the object literal, so
// tsc correctly flags a plain `string` param as unsound. Handled with a
// real (if generic) fallback rather than `?? ""`, which would silently
// render "Unsafe for Danny: " with nothing after the colon if this ever did
// happen — a visibly broken safety message is worse than a slightly
// generic one.
export function unsafeForLabel(locale: Locale, name: string, reason: string | undefined): string {
  const why = reason ?? (locale === "he" ? "לא מתאים" : "not a safe match");
  return locale === "he" ? `לא בטוח עבור ${name}: ${why}` : `Unsafe for ${name}: ${why}`;
}

export function daysUntilStartLabel(locale: Locale, days: number): string {
  if (locale === "he") {
    return days === 1 ? "הטיול מתחיל מחר" : `הטיול מתחיל בעוד ${days} ימים`;
  }
  return `Trip starts in ${days} day${days === 1 ? "" : "s"}`;
}

export function minutesAwayLabel(locale: Locale, minutes: number): string {
  if (locale === "he") return minutes <= 0 ? "עכשיו" : `בעוד ${minutes} דק׳`;
  return minutes <= 0 ? "now" : `in ${minutes} min`;
}

export function nightsLabel(locale: Locale, nights: number): string {
  if (locale === "he") return `${nights} ${nights === 1 ? "לילה" : "לילות"}`;
  return `${nights} night${nights === 1 ? "" : "s"}`;
}

export function visitLengthLabel(locale: Locale, duration: string): string {
  return locale === "he" ? `כ-${duration} לביקור (משך ביקור אופטימלי)` : `About ${duration} to visit (optimal visit length)`;
}

export function checkInOutLabel(locale: Locale, checkIn?: string, checkOut?: string): string {
  const dash = "—";
  return locale === "he"
    ? `צ'ק-אין ${checkIn ?? dash} · צ'ק-אאוט ${checkOut ?? dash}`
    : `Check-in ${checkIn ?? dash} · Check-out ${checkOut ?? dash}`;
}
