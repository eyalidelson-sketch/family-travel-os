import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft, ThumbsUp } from "lucide-react";
import { repo } from "@/lib/repo";
import { findCurrentDay } from "@/lib/time";
import { restaurantsForCity, citiesWithRestaurants } from "@/lib/food/restaurants";
import { matchRestaurant, displayScore, type FoodFinderMode, type MemberFoodProfile } from "@/lib/food/match";
import { tileForName } from "@/lib/providers/photos";
import { fetchRealPhotosForQuery } from "@/lib/enrichment/photos";
import { getLocale } from "@/lib/i18n/locale";
import { t, noRestaurantsLabel, unsafeForLabel } from "@/lib/i18n/translations";
import { AddToTodayButton } from "@/components/food/AddToTodayButton";

function scoreTone(score: number): string {
  if (score >= 75) return "bg-good text-white";
  if (score >= 45) return "bg-warn text-white";
  return "bg-critical text-white";
}

export default async function FoodFinderPage({
  params,
  searchParams
}: {
  params: { tripId: string };
  searchParams: { city?: string; mode?: string; member?: string };
}) {
  const locale = getLocale();
  const bundle = await repo.getTripBundle(params.tripId);
  if (!bundle) notFound();

  const members = await repo.listTripMembers(params.tripId);
  const profiles: MemberFoodProfile[] = await Promise.all(
    members.map(async (member) => {
      const profile = await repo.getMemberProfile(member.id);
      return { member, restrictions: profile.restrictions, preferences: profile.preferences };
    })
  );

  const availableCities = citiesWithRestaurants();
  const current = findCurrentDay(bundle);
  const defaultCity = current.day.city?.city ?? current.day.city?.canonicalName ?? availableCities[0] ?? "Tokyo";
  const city = searchParams.city && availableCities.includes(searchParams.city) ? searchParams.city : defaultCity;

  const mode: FoodFinderMode = searchParams.mode === "member" ? "member" : "compromise";
  const focusMember = members.find((m) => m.id === searchParams.member) ?? members[0];

  const restaurants = restaurantsForCity(city);
  const matches = restaurants
    .map((r) => matchRestaurant(r, profiles))
    .sort((a, b) => displayScore(b, mode, focusMember?.id) - displayScore(a, mode, focusMember?.id));

  // Same real-photo orchestrator as places, keyed by restaurant name + city
  // instead of a Place id since these come from the curated restaurant list,
  // not the places/enrichment store.
  const coverEntries = await Promise.all(
    restaurants.map(async (r) => [r.id, await fetchRealPhotosForQuery(`${r.name}, ${city}`, 1)] as const)
  );
  const realCovers = new Map(coverEntries.filter(([, result]) => result).map(([id, result]) => [id, result!.tiles[0]!.url]));

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md pb-14">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 backdrop-blur">
        <Link href={`/t/${params.tripId}/today`} className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-inkFaint hover:text-ink">
          <ChevronLeft size={16} className="rtl:rotate-180" /> {t(locale, "tabToday")}
        </Link>
        <h1 className="font-display text-[19px] font-semibold text-ink">{t(locale, "familyFoodFinder")}</h1>
        <p className="mt-0.5 text-[12.5px] text-inkFaint">{t(locale, "foodFinderSubtitle")}</p>
      </header>

      <div className="flex flex-col gap-4 px-5 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {availableCities.map((c) => (
            <Link
              key={c}
              href={`/t/${params.tripId}/food?city=${c}&mode=${mode}${mode === "member" && focusMember ? `&member=${focusMember.id}` : ""}`}
              className={`flex-none rounded-full px-3.5 py-1.5 text-[13px] font-bold ${c === city ? "bg-ink text-bg" : "bg-surface2 text-inkSoft"}`}
            >
              {c}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
          <div className="flex gap-2">
            <Link
              href={`/t/${params.tripId}/food?city=${city}&mode=compromise`}
              className={`flex-1 rounded-xl py-2 text-center text-[12.5px] font-bold ${mode === "compromise" ? "bg-accent text-accentInk" : "bg-surface2 text-inkSoft"}`}
            >
              {t(locale, "bestCompromise")}
            </Link>
            <Link
              href={`/t/${params.tripId}/food?city=${city}&mode=member&member=${focusMember?.id ?? ""}`}
              className={`flex-1 rounded-xl py-2 text-center text-[12.5px] font-bold ${mode === "member" ? "bg-accent text-accentInk" : "bg-surface2 text-inkSoft"}`}
            >
              {t(locale, "prioritizeMember")}
            </Link>
          </div>
          {mode === "member" && (
            <div className="flex gap-1.5 overflow-x-auto pt-1">
              {members.map((m) => (
                <Link
                  key={m.id}
                  href={`/t/${params.tripId}/food?city=${city}&mode=member&member=${m.id}`}
                  className={`flex-none rounded-full px-3 py-1 text-[12px] font-bold ${
                    focusMember?.id === m.id ? "bg-ink text-bg" : "bg-surface2 text-inkSoft"
                  }`}
                >
                  {m.displayName}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {matches.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-inkFaint">{noRestaurantsLabel(locale, city)}</p>
          )}

          {matches.map((match) => {
            const score = displayScore(match, mode, focusMember?.id);
            const unsafeMembers = match.members.filter((m) => !m.safe);
            const cover = realCovers.get(match.restaurant.id) ?? tileForName(match.restaurant.id);

            return (
              <div key={match.restaurant.id} className={`overflow-hidden rounded-2xl border bg-surface shadow-card ${match.anyUnsafe ? "border-critical/30 opacity-80" : "border-border"}`}>
                <div className="relative h-24" style={{ backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute inset-x-3 bottom-2 flex items-end justify-between">
                    <div>
                      <p className="text-[15px] font-bold text-white drop-shadow-sm">{match.restaurant.name}</p>
                      <p className="text-[11.5px] text-white/75">
                        {match.restaurant.cuisine} · {"$".repeat(match.restaurant.priceLevel)}
                      </p>
                    </div>
                    <span className={`flex-none rounded-full px-2.5 py-1 text-[13px] font-extrabold ${scoreTone(score)}`}>{score}%</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-3.5">
                  <p className="text-[12.5px] text-inkSoft">{match.restaurant.description}</p>

                  {unsafeMembers.length > 0 && (
                    <div className="flex flex-col gap-1 rounded-xl bg-criticalSoft px-3 py-2">
                      {unsafeMembers.map((m) => (
                        <p key={m.tripMemberId} className="flex items-start gap-1.5 text-[11.5px] font-medium text-critical">
                          <AlertTriangle size={12} className="mt-0.5 flex-none" /> {unsafeForLabel(locale, m.displayName, m.unsafeReason)}
                        </p>
                      ))}
                    </div>
                  )}

                  {!match.anyUnsafe && mode === "compromise" && (
                    <div className="flex flex-wrap gap-1">
                      {match.members
                        .filter((m) => m.score >= 75)
                        .map((m) => (
                          <span key={m.tripMemberId} className="flex items-center gap-1 rounded-full bg-goodSoft px-2 py-0.5 text-[11px] font-semibold text-good">
                            <ThumbsUp size={10} /> {m.displayName}
                          </span>
                        ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {match.restaurant.tags.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-md bg-surface2 px-2 py-0.5 text-[11px] font-medium text-inkFaint">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-end pt-1">
                    <AddToTodayButton
                      tripId={params.tripId}
                      dayId={current.day.id}
                      restaurant={match.restaurant}
                      label={t(locale, "addToToday")}
                      addedLabel={t(locale, "addedToToday")}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
