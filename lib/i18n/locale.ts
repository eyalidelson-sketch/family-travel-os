import { cookies } from "next/headers";

// A cookie, not a route param — same "no accounts needed" philosophy as
// lib/session.ts's per-trip member cookie. Every server component reads the
// active locale with getLocale(); the toggle in components/nav/LanguageToggle
// flips it via the setLocaleAction server action, which revalidates the
// whole layout so app/layout.tsx re-renders with the new lang/dir.

export type Locale = "en" | "he";
export const LOCALE_COOKIE = "ftos_locale";
export const DEFAULT_LOCALE: Locale = "en";

export function getLocale(): Locale {
  return cookies().get(LOCALE_COOKIE)?.value === "he" ? "he" : DEFAULT_LOCALE;
}

export function isRtl(locale: Locale): boolean {
  return locale === "he";
}
