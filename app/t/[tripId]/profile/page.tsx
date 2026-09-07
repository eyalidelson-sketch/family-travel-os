import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown } from "lucide-react";
import { repo } from "@/lib/repo";
import { getCurrentMember } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { t, viewingProfileLabel } from "@/lib/i18n/translations";
import { FoodProfileEditor } from "@/components/profile/FoodProfileEditor";
import { TabBar } from "@/components/nav/TabBar";

export default async function ProfilePage({
  params,
  searchParams
}: {
  params: { tripId: string };
  searchParams: { member?: string };
}) {
  const [trip, members, viewer] = await Promise.all([
    repo.getTripBundle(params.tripId),
    repo.listTripMembers(params.tripId),
    getCurrentMember(params.tripId)
  ]);
  if (!trip || members.length === 0) notFound();

  const selected = members.find((m) => m.id === searchParams.member) ?? viewer ?? members[0]!;
  const profile = await repo.getMemberProfile(selected.id);
  const canEdit = Boolean(viewer && (viewer.id === selected.id || viewer.role === "organizer"));
  const locale = getLocale();

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 backdrop-blur">
        <p className="text-[11px] font-bold uppercase tracking-widest text-accent">{trip.trip.name}</p>
        <h1 className="mt-0.5 font-display text-[19px] font-semibold text-ink">{t(locale, "familyFoodProfiles")}</h1>
      </header>

      <div className="flex flex-col gap-4 px-5 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/t/${params.tripId}/profile?member=${m.id}`}
              className={`flex flex-none items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold ${
                selected.id === m.id ? "bg-ink text-bg" : "bg-surface2 text-inkSoft"
              }`}
            >
              {m.role === "organizer" && <Crown size={13} className={selected.id === m.id ? "text-accent" : "text-inkFaint"} />}
              {m.displayName}
              {viewer?.id === m.id && <span className="text-[10.5px] font-medium opacity-70">{t(locale, "you")}</span>}
            </Link>
          ))}
        </div>

        {!canEdit && (
          <p className="rounded-xl bg-surface2 px-3.5 py-2.5 text-[12.5px] text-inkSoft">{viewingProfileLabel(locale, selected.displayName)}</p>
        )}

        <FoodProfileEditor
          tripId={params.tripId}
          tripMemberId={selected.id}
          restrictions={profile.restrictions}
          preferences={profile.preferences}
          canEdit={canEdit}
          locale={locale}
        />
      </div>

      <TabBar tripId={params.tripId} active="profile" />
    </main>
  );
}
