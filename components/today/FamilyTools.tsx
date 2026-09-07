import Link from "next/link";
import { LifeBuoy, Utensils, Vote, AlertTriangle } from "lucide-react";

const TOOLS = [
  { key: "food", label: "Food Finder", icon: Utensils, path: "food", tint: "bg-warnSoft text-warn" },
  { key: "check", label: "Trip Check", icon: AlertTriangle, path: "check", tint: "bg-indigoSoft text-indigo" },
  { key: "sos", label: "Save Our Day", icon: LifeBuoy, path: "sos", tint: "bg-criticalSoft text-critical" },
  { key: "vote", label: "Vote", icon: Vote, path: "vote", tint: "bg-goodSoft text-good" }
];

/** The Today screen doubles as the family's control center — these are the cross-cutting tools every member (not just the organizer) can reach from here. */
export function FamilyTools({ tripId }: { tripId: string }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {TOOLS.map(({ key, label, icon: Icon, path, tint }) => (
        <Link key={key} href={`/t/${tripId}/${path}`} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface py-3 shadow-card">
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tint}`}>
            <Icon size={17} />
          </span>
          <span className="text-center text-[11px] font-semibold leading-tight text-inkSoft">{label}</span>
        </Link>
      ))}
    </div>
  );
}
