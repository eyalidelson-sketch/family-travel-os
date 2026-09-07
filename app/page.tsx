import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, QrCode, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getOrCreateDemoTrip } from "@/lib/demo";
import { setCurrentMemberCookie } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/translations";

async function viewSampleTrip() {
  "use server";
  const trip = await getOrCreateDemoTrip();
  setCurrentMemberCookie(trip.id, trip.createdByTripMemberId);
  redirect(`/t/${trip.id}/today`);
}

export default function WelcomePage() {
  const locale = getLocale();
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-10 pt-16">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-indigo text-accentInk shadow-card">
          <Compass size={30} strokeWidth={2.2} />
        </div>
        <h1 className="text-[28px] font-semibold leading-tight text-ink">{t(locale, "appName")}</h1>
        <p className="mt-2 max-w-[26ch] text-[15px] text-inkSoft">{t(locale, "tagline")}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/create">
          <Button size="lg" className="w-full">
            <Sparkles size={18} /> {t(locale, "createTrip")}
          </Button>
        </Link>
        <Link href="/join">
          <Button size="lg" variant="ghost" className="w-full">
            <QrCode size={18} /> {t(locale, "joinTrip")}
          </Button>
        </Link>

        <form action={viewSampleTrip} className="mt-2 text-center">
          <button type="submit" className="text-[13px] font-semibold text-inkFaint underline decoration-border underline-offset-4 hover:text-ink">
            {t(locale, "viewSampleTrip")}
          </button>
        </form>
      </div>
    </main>
  );
}
