import Link from "next/link";
import { ChevronRight, Hotel, MapPin, StickyNote, TrainFront, Utensils } from "lucide-react";
import type { ItineraryItem, Place, Transport, HotelStay } from "@/lib/types";
import { ProvenanceDot } from "@/components/ui/Badge";
import { ShowDriverModal } from "@/components/today/ShowDriverModal";
import { photosProvider, tileForItemType } from "@/lib/providers/photos";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/translations";

function iconFor(type: ItineraryItem["type"]) {
  if (type === "meal") return <Utensils size={14} />;
  if (type === "transport") return <TrainFront size={14} />;
  if (type === "note") return <StickyNote size={14} />;
  return <MapPin size={14} />;
}

function coverFor(item: ItineraryItem & { place?: Place }, override?: string): string {
  if (override) return override;
  return item.place ? photosProvider.cover(item.place) : tileForItemType(item.id, item.type);
}

export function ItemRow({
  item,
  isNow,
  tripId,
  cover: coverOverride
}: {
  item: ItineraryItem & { place?: Place };
  isNow: boolean;
  tripId: string;
  cover?: string;
}) {
  const provenance = item.source === "organizer_input" || item.source === "member_input" ? "organizer" : "ai";
  const cover = coverFor(item, coverOverride);

  const card = (
    <div
      className={`relative h-[92px] overflow-hidden rounded-2xl ${isNow ? "ring-2 ring-accent" : ""}`}
      style={{ backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />

      <div className="absolute inset-x-3 top-2.5 flex items-center justify-between">
        <span className="ltr-nums flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[11.5px] font-semibold text-white backdrop-blur-sm">
          {iconFor(item.type)}
          {item.startTime ?? "—"}
        </span>
        <span className="flex items-center gap-1.5">
          {item.placeId && <ChevronRight size={15} className="text-white/70" />}
          <ProvenanceDot kind={provenance} />
        </span>
      </div>

      <div className="absolute inset-x-3 bottom-2.5">
        <p className="truncate text-[15px] font-bold leading-tight text-white drop-shadow-sm">{item.title}</p>
        {item.notes && <p className="truncate text-[12px] text-white/75">{item.notes}</p>}
      </div>
    </div>
  );

  if (item.placeId) {
    return (
      <li>
        <Link href={`/t/${tripId}/place/${item.placeId}`} className="block active:scale-[0.98] transition">
          {card}
        </Link>
      </li>
    );
  }

  return <li>{card}</li>;
}

export function TravelCard({ transport }: { transport: Transport[] }) {
  const locale = getLocale();
  return (
    <div className="rounded-2xl border border-indigo/25 bg-indigoSoft px-4 py-3.5">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-indigo">{t(locale, "gettingThereToday")}</p>
      <div className="flex flex-col gap-2">
        {transport.map((t) => (
          <div key={t.id} className="flex items-center gap-2.5 text-[14px] font-semibold text-ink">
            <TrainFront size={16} className="flex-none text-indigo" />
            <span className="capitalize">{t.mode}</span>
            <span className="font-normal text-inkSoft">{t.carrier ? `· ${t.carrier}` : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TonightCard({ hotel, tripId, cover: coverOverride }: { hotel: HotelStay & { place: Place }; tripId: string; cover?: string }) {
  const locale = getLocale();
  const cover = coverOverride ?? photosProvider.cover(hotel.place);
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-inkFaint">{t(locale, "tonight")}</p>
      <div
        className="relative h-24 overflow-hidden rounded-2xl shadow-card"
        style={{ backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/20 to-transparent" />
        <Link href={`/t/${tripId}/place/${hotel.place.id}`} className="absolute inset-0 flex items-end p-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm">
              <Hotel size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-bold text-white drop-shadow-sm">{hotel.place.canonicalName}</p>
              {!hotel.place.addressLocalScript && <p className="text-[11.5px] text-white/70">{t(locale, "addressNotVerified")}</p>}
            </div>
          </div>
        </Link>
        <div className="absolute right-3 top-3">
          <ShowDriverModal
            place={hotel.place}
            label={t(locale, "address")}
            triggerClassName="inline-flex items-center gap-1.5 rounded-xl bg-black/40 px-3 py-2 text-[13px] font-semibold text-white backdrop-blur-sm hover:bg-black/55"
          />
        </div>
      </div>
    </div>
  );
}
