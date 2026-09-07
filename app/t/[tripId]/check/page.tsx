import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, PartyPopper } from "lucide-react";
import { repo } from "@/lib/repo";
import { analyzeTripCheck } from "@/lib/tripcheck/analyze";
import { IssueCard } from "@/components/tripcheck/IssueCard";

export default async function TripCheckPage({ params }: { params: { tripId: string } }) {
  const bundle = await repo.getTripBundle(params.tripId);
  if (!bundle) notFound();

  const [allIssues, dismissedIds] = await Promise.all([
    Promise.resolve(analyzeTripCheck(bundle)),
    repo.listDismissedRecommendationIds(params.tripId, "trip_check_issue")
  ]);
  const dismissed = new Set(dismissedIds);
  const issues = allIssues.filter((i) => !dismissed.has(i.id));
  const warnCount = issues.filter((i) => i.severity === "warn").length;

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md pb-14">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 backdrop-blur">
        <Link href={`/t/${params.tripId}/today`} className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-inkFaint hover:text-ink">
          <ChevronLeft size={16} /> Today
        </Link>
        <h1 className="font-display text-[19px] font-semibold text-ink">AI Trip Check</h1>
        <p className="mt-0.5 text-[12.5px] text-inkFaint">
          {issues.length === 0
            ? "Nothing flagged right now."
            : `${issues.length} thing${issues.length === 1 ? "" : "s"} worth a look${warnCount > 0 ? ` — ${warnCount} worth prioritizing` : ""}.`}
        </p>
      </header>

      <div className="flex flex-col gap-3 px-5 pt-4">
        {issues.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <PartyPopper size={22} className="text-good" />
            <p className="text-[14px] font-semibold text-ink">Looks like a well-paced trip.</p>
            <p className="text-[12.5px] text-inkFaint">No heavy days, tight transitions, backtracking, or missing meals detected — this re-checks automatically as the itinerary changes.</p>
          </div>
        ) : (
          issues.map((issue) => <IssueCard key={issue.id} tripId={params.tripId} issue={issue} />)
        )}
      </div>
    </main>
  );
}
