import Link from "next/link";
import { CalendarDays, MapPinned, Route, UserCircle } from "lucide-react";
import { getLocale } from "@/lib/i18n/locale";
import { t, type TranslationKey } from "@/lib/i18n/translations";

type Tab = "today" | "trip" | "map" | "profile";

const TABS: { key: Tab; labelKey: TranslationKey; icon: typeof CalendarDays; path: string }[] = [
  { key: "today", labelKey: "tabToday", icon: CalendarDays, path: "today" },
  { key: "trip", labelKey: "tabTrip", icon: MapPinned, path: "trip" },
  { key: "map", labelKey: "tabMap", icon: Route, path: "map" },
  { key: "profile", labelKey: "tabProfile", icon: UserCircle, path: "profile" }
];

export function TabBar({ tripId, active }: { tripId: string; active: Tab }) {
  const locale = getLocale();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map(({ key, labelKey, icon: Icon, path }) => (
          <Link
            key={key}
            href={`/t/${tripId}/${path}`}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
              active === key ? "text-accent" : "text-inkFaint"
            }`}
          >
            <Icon size={20} />
            {t(locale, labelKey)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
