"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { setLocaleAction } from "@/lib/actions/locale";

/**
 * The one global, always-present control the app has — mounted once from
 * the root layout (see app/layout.tsx) rather than duplicated into every
 * page's own header, since there's no single shared header component across
 * ~15 routes. Fixed to the top corner so it reads as app chrome on every
 * screen, English/Hebrew per the plan's "language toggle in the app header".
 */
export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div
      className="fixed top-[calc(env(safe-area-inset-top)+10px)] z-30 flex items-center gap-0.5 rounded-full border border-border bg-surface/95 p-0.5 shadow-card backdrop-blur ltr:right-3 rtl:left-3"
      role="group"
      aria-label="Language"
    >
      <Languages size={13} className="mx-1.5 flex-none text-inkFaint" />
      <button
        type="button"
        onClick={() => switchTo("en")}
        aria-pressed={locale === "en"}
        disabled={isPending}
        className={`rounded-full px-2 py-1 text-[11px] font-bold transition ${
          locale === "en" ? "bg-ink text-bg" : "text-inkFaint hover:text-ink"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo("he")}
        aria-pressed={locale === "he"}
        disabled={isPending}
        className={`rounded-full px-2 py-1 text-[11px] font-bold transition ${
          locale === "he" ? "bg-ink text-bg" : "text-inkFaint hover:text-ink"
        }`}
      >
        עברית
      </button>
    </div>
  );
}
