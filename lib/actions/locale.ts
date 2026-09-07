"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, type Locale } from "../i18n/locale";

export async function setLocaleAction(locale: Locale) {
  cookies().set(LOCALE_COOKIE, locale, {
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
  // The locale/dir is read in the root layout, so the whole tree needs to
  // re-render — not just whatever page happened to host the toggle.
  revalidatePath("/", "layout");
}
