import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { ChevronLeft, LifeBuoy } from "lucide-react";
import { repo } from "@/lib/repo";
import { findCurrentDay } from "@/lib/time";
import { SOS_TAGS, buildRescuePlans, remainingItems, type SosTag } from "@/lib/sos/plans";
import { ApplyPlanButton } from "@/components/sos/ApplyPlanButton";

export default async function SosPage({ params, searchParams }: { params: { tripId: string }; searchParams: { tag?: string } }) {
  const bundle = await repo.getTripBundle(params.tripId);
  if (!bundle) notFound();

  const current = findCurrentDay(bundle);
  const day = current.day;
  const afterTime = current.mode === "active" ? DateTime.now().setZone(day.timezone || "Etc/UTC").toFormat("HH:mm") : "00:00";
  const remaining = remainingItems(day.items, afterTime);

  const tag = SOS_TAGS.find((t) => t.key === searchParams.tag)?.key as SosTag | undefined;
  const plans = tag ? buildRescuePlans(tag, remaining) : [];

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md pb-14">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 backdrop-blur">
        <Link href={`/t/${params.tripId}/today`} className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-inkFaint hover:text-ink">
          <ChevronLeft size={16} /> Today
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-criticalSoft text-critical">
            <LifeBuoy size={16} />
          </span>
          <h1 className="font-display text-[19px] font-semibold text-ink">Save Our Day</h1>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-5 pt-4">
        {!tag ? (
          <>
            <p className="text-[13.5px] text-inkSoft">What's going on? We'll build a couple of rescue plans for the {remaining.length} thing{remaining.length === 1 ? "" : "s"} still left today.</p>
            <div className="flex flex-col gap-2">
              {SOS_TAGS.map((t) => (
                <Link
                  key={t.key}
                  href={`/t/${params.tripId}/sos?tag=${t.key}`}
                  className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-card hover:bg-surface2"
                >
                  <p className="text-[14.5px] font-bold text-ink">{t.label}</p>
                  <p className="text-[12px] text-inkFaint">{t.hint}</p>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            <Link href={`/t/${params.tripId}/sos`} className="text-[12.5px] font-semibold text-inkFaint hover:text-ink">
              ← Choose a different situation
            </Link>

            {remaining.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-inkFaint">
                Nothing left scheduled for today — there's nothing to rescue.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4 shadow-card">
                    <p className="text-[15px] font-bold text-ink">{plan.title}</p>
                    <p className="text-[13px] text-inkSoft">{plan.description}</p>
                    <ApplyPlanButton tripId={params.tripId} dayId={day.id} afterTime={afterTime} plan={plan} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
