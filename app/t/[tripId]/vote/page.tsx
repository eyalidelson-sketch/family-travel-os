import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { repo } from "@/lib/repo";
import { getCurrentMember, isOrganizerForTrip } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { t, noPollsLabel } from "@/lib/i18n/translations";
import { CreatePollForm } from "@/components/vote/CreatePollForm";
import { PollCard } from "@/components/vote/PollCard";

export default async function VotePage({ params }: { params: { tripId: string } }) {
  const bundle = await repo.getTripBundle(params.tripId);
  if (!bundle) notFound();

  const [polls, member, isOrganizer] = await Promise.all([
    repo.listPolls(params.tripId),
    getCurrentMember(params.tripId),
    isOrganizerForTrip(params.tripId)
  ]);

  const openPolls = polls.filter((p) => p.poll.status === "open");
  const closedPolls = polls.filter((p) => p.poll.status === "closed");
  const locale = getLocale();

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md pb-14">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 backdrop-blur">
        <Link href={`/t/${params.tripId}/today`} className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-inkFaint hover:text-ink">
          <ChevronLeft size={16} className="rtl:rotate-180" /> {t(locale, "tabToday")}
        </Link>
        <h1 className="font-display text-[19px] font-semibold text-ink">{t(locale, "familyVoting")}</h1>
      </header>

      <div className="flex flex-col gap-4 px-5 pt-4">
        {isOrganizer && <CreatePollForm tripId={params.tripId} locale={locale} />}

        {openPolls.length === 0 && closedPolls.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-inkFaint">{noPollsLabel(locale, isOrganizer)}</p>
        )}

        {openPolls.length > 0 && (
          <div className="flex flex-col gap-3">
            {openPolls.map((p) => (
              <PollCard key={p.poll.id} tripId={params.tripId} data={p} myTripMemberId={member?.id} isOrganizer={isOrganizer} locale={locale} />
            ))}
          </div>
        )}

        {closedPolls.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-inkFaint">{t(locale, "pastVotes")}</p>
            <div className="flex flex-col gap-3">
              {closedPolls.map((p) => (
                <PollCard key={p.poll.id} tripId={params.tripId} data={p} myTripMemberId={member?.id} isOrganizer={isOrganizer} locale={locale} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
