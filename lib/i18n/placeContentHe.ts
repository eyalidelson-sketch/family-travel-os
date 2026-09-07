// Hebrew mirror of lib/enrichment/curated.ts and lib/enrichment/service.ts's
// genericFallback — hand-translated, not machine-translated, matching the
// project's "curated, not AI" convention for demo content. Applied at the
// display layer (see localizeEnrichment below) rather than baked into the
// cache, so the same cached PlaceEnrichment record serves both languages —
// see the comment on PlaceEnrichment.textOrigin in lib/types.ts for why.
//
// Only curated- and generic-sourced text can be localized this way: live
// Claude-generated content (textOrigin: "claude") has no Hebrew counterpart
// here and is shown in whatever language Claude wrote it in — see
// lib/ai/enrichPlace.ts, which does ask Claude to answer in Hebrew when the
// viewer's locale is Hebrew, but that only affects *freshly fetched* content,
// not whatever is already sitting in the 30-day cache from an English visit.

import type { PlaceEnrichment } from "../types";

type CuratedHe = Pick<PlaceEnrichment, "description" | "practicalInfo">;

export const CURATED_ENRICHMENT_HE: Record<string, CuratedHe> = {
  "hilton tokyo": {
    description: "מלון גבוה ואמין למשפחות בניישי-שינג'וקו, הליכה קצרה מהיציאה המערבית של תחנת שינג'וקו.",
    practicalInfo: {
      nearestStation: "תחנת שינג'וקו (6 דקות הליכה)",
      checkIn: "15:00",
      checkOut: "11:00",
      amenities: ["בר על הגג", "בריכה מקורה", "מכבסה אסימונית", "חדרים מחוברים זמינים"],
      familyTips: "שאלו בקבלה לגבי חדרים מחוברים — הם לא תמיד מוצגים כניתנים להזמנה באינטרנט.",
      estimatedCost: "חדרים בדרך כלל מ-28,000–45,000 ין ללילה, תלוי בעונה",
      familyAccessibility: "גישה נטולת מדרגות מהלובי לקומות האורחים; הבריכה המקורה והחדרים המחוברים הופכים אותו לבסיס נוח לילדים קטנים."
    }
  },
  "meiji shrine": {
    description: "מקדש שינטו יערי בלב טוקיו, המוקדש לקיסר מייג'י ולקיסרית שוקן.",
    practicalInfo: {
      whatToDo:
        "טיילו בשביל החצץ דרך היער אל בנייני המקדש הראשיים, שימו לב לתהלוכת חתונה מסורתית (נפוצה בסופי שבוע), וסיירו בקיר חביות הסאקה והיין שנתרמו למקדש ליד הכניסה.",
      estimatedVisitMinutes: 75,
      familyTips: "שבילי החצץ מתאימים לעגלות; החצר הפנימית שקטה גם כשהראג'וקו הסמוכה עמוסה.",
      openingHours: "מזריחה עד שקיעה, השעות משתנות לפי עונה — בדרך כלל 5:00–18:00",
      estimatedCost: "כניסה חינם לשטח המקדש",
      familyAccessibility: "שבילי חצץ רחבים ושטוחים מתאימים לעגלות, אם כי המשטח יכול להיות איטי לגלגלים קטנים מאוד; אין מדרגות משמעותיות אל הבניינים הראשיים."
    }
  },
  "tokyo disneyland": {
    description: "פארק הדיסני המקורי של טוקיו — דומה בפריסתו למקור האמריקאי, עם מספר אטרקציות ייחודיות ליפן.",
    practicalInfo: {
      whatToDo:
        "רכבו על Pooh's Hunny Hunt ו-Monsters, Inc. Ride & Go Seek! (שתיהן ייחודיות ליפן), צפו במצעד לאורך World Bazaar, ושמרו זמן למופע ההקרנה הערבי על הטירה.",
      estimatedVisitMinutes: 480,
      familyTips: "רכשו כרטיסים עם כניסה מתוזמנת מראש; התור הווירטואלי באפליקציה למתקנים הפופולריים מתמלא תוך דקות מהפתיחה.",
      openingHours: "בדרך כלל 9:00–21:00, משתנה לפי עונה ויום — בדקו בלוח השנה הרשמי לפני ההגעה",
      estimatedCost: "כרטיס יום 7,900–10,900 ין לגילאי 12 ומעלה; 4,700–5,600 ין לגילאי 4–11 (משתנה לפי ביקוש)",
      familyAccessibility: "ניתן לשכור עגלות בכניסה; רוב התורים והאטרקציות נגישים לכיסאות גלגלים/עגלות עם כניסה נגישה נפרדת, וחדרי טיפול בתינוקות זמינים בכל אזור."
    }
  },
  shibuya: {
    description: "אחד מאזורי המסחר העמוסים בטוקיו, ידוע בעיקר בזכות מעבר החציה ההמוני מחוץ לתחנה.",
    practicalInfo: {
      whatToDo:
        "צפו במעבר החציה מהקומה השנייה של הסטארבקס או ממצפה Shibuya Sky, אמרו שלום לפסל האצ'יקו, וסיירו בקניון שיבויה 109 או בפארק מיאשיטה לקניות.",
      estimatedVisitMinutes: 120,
      familyTips: "הבקרים שקטים בהרבה מאשר אחר הצהריים אם העומס מהווה בעיה עם ילדים.",
      estimatedCost: "טיול ברגל חינם; מצפה Shibuya Sky עולה כ-2,000–2,500 ין למבוגר, פחות לילדים",
      familyAccessibility: "שטוח ומרוצף לכל אורכו, אך עמוס מאוד בשעות השיא — סלינג עשוי להיות נוח יותר מעגלה בקטעים הצפופים ביותר ליד המעבר."
    }
  },
  shinjuku: {
    description: "תמהיל צפוף של כלבו, סמטאות איזקאיה, ומצפי הממשל המטרופוליני של טוקיו.",
    practicalInfo: {
      whatToDo:
        "עלו במעלית החינמית למצפה של בניין ממשל מטרופוליני טוקיו לנוף על קו הרקיע, ולאחר מכן טיילו בסמטאות המוארות בפנסים של אומוידה יוקוצ'ו לנשנוש.",
      estimatedVisitMinutes: 150,
      openingHours: "המצפה בדרך כלל 9:30–22:00, סגור בחלק מימי שלישי — בדקו מראש",
      estimatedCost: "המצפה חינם; תקצבו בנפרד לאוכל",
      familyAccessibility: "מעליות משרתות את המצפה; אזור התחנה הסובב כרוך בהליכה ומדרגות רבות ביציאות העמוסות, אז הקדישו זמן נוסף עם עגלה."
    }
  },
  "fushimi inari": {
    description: "אלפי שערי טוריי אדומים מטפסים על הר אינארי מאחורי המקדש — אחד האתרים המצולמים ביותר בקיוטו.",
    practicalInfo: {
      whatToDo:
        "טפסו דרך המנהרות הראשונות של השערים לתמונה הקלאסית, עצרו בצומת יוצוטסוג'י (כ-30-40 דקות מעלה) לנוף על העיר אם הרגליים מאפשרות, וחפשו את פסלוני השועלים הקטנים לאורך הדרך.",
      estimatedVisitMinutes: 90,
      familyTips: "אין צורך להגיע לפסגה (2+ שעות הלוך ושוב) — 20 הדקות הראשונות כבר מספקות את התמונה הקלאסית.",
      openingHours: "פתוח 24 שעות, אך מומלץ לבקר באור יום",
      estimatedCost: "חינם",
      familyAccessibility: "מרוצף ליד הכניסה, הופך למדרגות אבן וקרקע לא אחידה בהמשך — לא מתאים לעגלות מעבר למאות המטרים הראשונים; סלינג עדיף לטיפוס."
    }
  },
  "hotel granvia kyoto": {
    description: "מחובר ישירות לתחנת קיוטו — בסיס נוח ביותר ליציאות ליום בקיוטו.",
    practicalInfo: {
      nearestStation: "תחנת קיוטו (בתוך הבניין)",
      checkIn: "15:00",
      checkOut: "11:00",
      amenities: ["מספר מסעדות", "גישה ישירה לתחנה"],
      estimatedCost: "חדרים בדרך כלל מ-30,000–50,000 ין ללילה, תלוי בעונה",
      familyAccessibility: "גישת מעלית ישירות ממסוף התחנה — אחד המלונות הנוחים ביותר בקיוטו למזוודות ולעגלות."
    }
  },
  gion: {
    description: "אזור הגיישות (geiko) המוכר ביותר בקיוטו — סמטאות צרות של בתי עץ מסורתיים (מאצ'יה).",
    practicalInfo: {
      whatToDo:
        "טיילו ברחוב האנמיקוג'י ולאורך תעלת שירקאווה בשעות הערב המוקדמות, סיירו בחנויות מלאכת יד מסורתיות, וחפשו (מרחוק, בכבוד) גייקו או מייקו בדרכן לפגישות.",
      estimatedVisitMinutes: 90,
      familyTips: "אנא הימנעו מלהתקרב או לצלם גייקו/מייקו מקרוב — איסור צילום פרטי נאכף עם קנסות בחלקים מהאזור.",
      estimatedCost: "טיול ברגל חינם",
      familyAccessibility: "סמטאות שטוחות ומרוצפות, אך צרות ועלולות להיות עמוסות בערב — מתאים לעגלה מוקדם יותר ביום."
    }
  },
  "gyeongbokgung palace": {
    description: "הגדול מבין חמשת ארמונות המלוכה של סיאול, שנבנה לראשונה ב-1395, ומהווה את הרקע לטקס חילופי המשמר.",
    practicalInfo: {
      whatToDo:
        "צפו בטקס חילופי המשמר בשער הראשי, טיילו באולם כס המלוכה ובמגורי המלוכה, וסיירו במוזיאון הפולקלור הלאומי בשטח הארמון.",
      estimatedVisitMinutes: 120,
      familyTips: "טקס חילופי המשמר מתקיים מספר פעמים ביום ומהווה מבנה טוב לטווח הקשב של ילדים צעירים.",
      openingHours: "בדרך כלל 9:00–18:00, סגור בימי שלישי — השעות מתארכות בקיץ",
      estimatedCost: "מבוגרים 3,000 וון, חינם לילדים מתחת לגיל 7 ולקשישים מעל גיל 65",
      familyAccessibility: "בעיקר חצץ שטוח וחצרות מרוצפות, מתאים לעגלות; מספר ספי עץ מוגבהים בכניסות לבניינים אינם מתאימים."
    }
  },
  myeongdong: {
    description: "אזור קניות ואוכל רחוב צפוף במרכז סיאול, עמוס עד שעות הערב המאוחרות.",
    practicalInfo: {
      whatToDo: "טעמו מדוכני אוכל הרחוב לאורך הרחוב הראשי להולכי רגל, סיירו בחנויות קוסמטיקה ואופנה, ונסו מסעדת ברביקיו או עוף מטוגן קוריאני סמוכה לארוחת ערב.",
      estimatedVisitMinutes: 90,
      estimatedCost: "טיול ברגל חינם; אוכל רחוב בדרך כלל 3,000–6,000 וון לפריט",
      familyAccessibility: "שטוח ומיועד להולכי רגל, אך עמוס מאוד בערב — סלינג נוח יותר מעגלה בשעות השיא."
    }
  },
  insadong: {
    description: "אזור האומנות והמלאכה המסורתי של סיאול — בתי תה, גלריות, וחצר הקניות סאמזיגיל.",
    practicalInfo: {
      whatToDo: "סיירו בדוכני המלאכה הקטנים בחצר הקניות סאמזיגיל, עצרו לתה בבית תה מסורתי, והציצו בגלריות הקטנות לאורך הרחוב הראשי.",
      estimatedVisitMinutes: 120,
      estimatedCost: "טיול ברגל חינם; רוב הגלריות חינם, בתי תה בדרך כלל 8,000–15,000 וון לאדם",
      familyAccessibility: "רחוב שטוח ברובו, ידידותי להולכי רגל, עם רמפה שמתאימה לעגלות עד לחצר סאמזיגיל."
    }
  },
  "l7 myeongdong": {
    description: "מלון בעיצוב עדכני ובמחיר בינוני ממש במיונגדונג, במרחק הליכה מרוב אתרי סיאול המרכזיים.",
    practicalInfo: {
      nearestStation: "תחנת אולג'ירו 1(איל)-גה (4 דקות הליכה)",
      checkIn: "15:00",
      checkOut: "12:00",
      amenities: ["מרפסת גג", "חדר כושר 24 שעות"],
      estimatedCost: "חדרים בדרך כלל מ-150,000–250,000 וון ללילה, תלוי בעונה",
      familyAccessibility: "גישת מעלית בכל הבניין; המיקום המרכזי מקצר את ההליכה עם ילדים לאתרים המרכזיים."
    }
  },
  "n seoul tower": {
    description: "מגדל תצפית בראש הר נאמסאן עם נוף פנורמי על העיר.",
    practicalInfo: {
      whatToDo: "עלו ברכבל על נאמסאן, תיהנו מהמצפה בזווית 360°, וחפשו את אלפי המנעולים שהשאירו זוגות לאורך מעקות המרפסת.",
      estimatedVisitMinutes: 90,
      familyTips: "הרכבל למעלה כיפי יותר לילדים מהאוטובוס, ומקצר את הביקור אם הרגליים עייפות.",
      openingHours: "בדרך כלל 10:00–23:00, מאוחר יותר בסופי שבוע",
      estimatedCost: "רכבל הלוך ושוב כ-15,000 וון למבוגר; כניסה למצפה כ-16,000 וון למבוגר, פחות לילדים",
      familyAccessibility: "מעליות משרתות את המצפה עצמו; אזור הבסיס סביב תחנת הרכבל כולל כמה שבילים משופעים ומדרגות."
    }
  }
};

export function getCuratedEnrichmentHe(canonicalName: string): CuratedHe | undefined {
  return CURATED_ENRICHMENT_HE[canonicalName.trim().toLowerCase()];
}

// Mirrors genericFallback's category tables in lib/enrichment/service.ts —
// keep the two in sync if a category's English wording changes meaningfully.
import type { Place } from "../types";

const CATEGORY_LABEL_HE: Record<Place["category"], string> = {
  hotel: "מלון",
  attraction: "אתר תיירות",
  restaurant: "מסעדה",
  station: "תחנת תחבורה",
  airport: "שדה תעופה",
  neighborhood: "שכונה",
  other: "מקום"
};

const CATEGORY_NUDGE_HE: Record<Place["category"], string> = {
  hotel: "כדאי לבדוק במייל האישור את השירותים ואת שעות הצ'ק-אין/צ'ק-אאוט המדויקות.",
  attraction: "כדאי לבדוק שעות פתיחה ומחירי כניסה עדכניים לפני ההגעה.",
  restaurant: "כדאי לבדוק שעות פתיחה עדכניות, או להזמין מקום מראש אם זה נראה פופולרי.",
  station: "השילוט ופריסת הרציפים משתנים מתחנה לתחנה — הקדישו כמה דקות נוספות למציאת הרציף הנכון.",
  airport: "כדאי לבדוק מראש את הטרמינל ואת חלון הצ'ק-אין המומלץ אצל חברת התעופה.",
  neighborhood: "אזור נעים לשוטט בו ברגל — בחרו נקודת עוגן אחת או שתיים במקום לתכנן דקה אחר דקה.",
  other: "כדאי חיפוש מהיר קרוב יותר למועד הביקור כדי לדעת למה לצפות."
};

const CATEGORY_WHAT_TO_DO_HE: Record<Place["category"], string> = {
  hotel: "התארגנו בחדר, ואז שאלו בקבלה להמלצות משלהם על מקומות קרובים — לרוב הם מכירים את האפשרויות הטובות ביותר במרחק הליכה.",
  attraction: "הקדישו זמן לסיור בקצב נוח; בהגעה שאלו אם יש מסלול מומלץ או נקודת שיא שכדאי לא לפספס.",
  restaurant: "שאלו מה טרי או עונתי היום, במקום להזמין לפי רעיון קבוע מראש על התפריט.",
  station: "עקבו אחר השילוט לרציף או ליציאה המתאימים — צוות התחנה יכול לכוון אתכם אם לא ברור.",
  airport: "לאחר הצ'ק-אין המשיכו לביקורת הביטחון, ונצלו את הזמן הפנוי לארוחה או לסידור אחרון.",
  neighborhood: "שוטטו בקצב שלכם — אזור כזה מתגמל הליכה איטית יותר מרשימת מטלות קבועה.",
  other: "הביטו סביב והתמצאו לפני שתחליטו כמה זמן להקדיש למקום."
};

/**
 * Hebrew counterpart of lib/enrichment/service.ts's genericDescription/
 * genericWhatToDo — same idea, same honesty rule: derive a real sentence
 * from the place's own name/category/city rather than a flat "we don't know
 * anything about this" line, without inventing any specific fact about the
 * place. Place names/cities are stored in English (KNOWN_PLACES has no
 * Hebrew transliteration table), so they appear un-translated inside the
 * Hebrew sentence — an honest gap, same as any Hebrew travel app mixing in
 * an untranslated proper noun, and still far more useful than an empty
 * placeholder.
 */
export function genericDescriptionHe(place: Place): string {
  const location = [place.city, place.country].filter(Boolean).join(", ");
  const base = `${place.canonicalName} — ${CATEGORY_LABEL_HE[place.category]}${location ? ` ב${location}` : ""}.`;
  return `${base} ${CATEGORY_NUDGE_HE[place.category]}`;
}

export function genericWhatToDoHe(place: Place): string {
  return CATEGORY_WHAT_TO_DO_HE[place.category];
}

// Dynamic Category-Based Practical Tips (Hebrew twin): mirrors
// GENERIC_FAMILY_TIPS / GENERIC_ACCESSIBILITY in lib/enrichment/service.ts —
// keep both pairs of tables in sync if the English wording changes.
export const GENERIC_FAMILY_TIPS_HE: Record<Place["category"], string> = {
  hotel: "שאלו בקבלה על חדרים מחוברים, עריסה, או מיטה נוספת — כדאי לשאול גם אם לא הוצע בהזמנה.",
  attraction: "בדקו בכניסה אם יש מחיר כרטיס משפחתי או לילדים — לרוב לא מופיע ברישום הכללי.",
  restaurant: "התקשרו מראש או שאלו בהגעה לגבי תפריט ילדים או כיסאות תינוק אם צריך.",
  station: "הקדישו כמה דקות נוספות למציאת הרציף או היציאה הנכונים — השילוט משתנה מאוד בין מדינות.",
  airport: "הגיעו עם זמן חיץ נוסף לביטחון ולצ'ק-אין, במיוחד עם עגלות, כיסאות בטיחות או המון מזוודות.",
  neighborhood: "אזור נחמד סתם לשוטט בו — בחרו נקודת עוגן אחת או שתיים במקום לתכנן דקה אחר דקה.",
  other: "כדאי חיפוש מהיר קרוב יותר למועד הביקור כדי לדעת למה לצפות."
};

export const GENERIC_ACCESSIBILITY_HE: Record<Place["category"], string> = {
  hotel: "ודאו גישה נטולת מדרגות לחדר הספציפי שלכם בעת ההזמנה אם מישהו במשפחה משתמש בכיסא גלגלים או עגלה בתוך המלון — מעליות הן סטנדרט, אך הגישה ברמת החדר משתנה.",
  attraction: "התנאים והמדרגות משתנים מאתר לאתר — כדאי לבדוק את עמוד הנגישות של האתר עצמו לפני שמתחייבים להגיע עם עגלה או כיסא גלגלים.",
  restaurant: "רוב המסעדות עם ישיבה יכולות להכיל עגלה ליד השולחן; התקשרו מראש אם המקום נראה קטן מאוד או שיש מדרגות בכניסה.",
  station: "בתחנות גדולות בדרך כלל יש מעליות, אך לא בכל רציף — בדקו שילוט או שאלו את הצוות אם אתם נוסעים עם עגלה או מזוודות כבדות.",
  airport: "שדות תעופה נגישים בדרך כלל לעגלות וכיסאות גלגלים בכל השטח, עם סיוע זמין לפי בקשה בצ'ק-אין.",
  neighborhood: "המדרכות והצפיפות משתנות מרחוב לרחוב — מנשא או סלינג עשוי להיות מעשי יותר מעגלה בקטעים העמוסים ביותר.",
  other: "אין עדיין פרטי נגישות ספציפיים — כדאי לבדוק מראש אם גישה נטולת מדרגות חשובה למשפחה שלכם."
};
