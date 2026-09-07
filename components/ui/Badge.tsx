type Tone = "organizer" | "member" | "good" | "warn" | "critical" | "neutral";

const tones: Record<Tone, string> = {
  organizer: "bg-accentSoft text-accent",
  member: "bg-indigoSoft text-indigo",
  good: "bg-goodSoft text-good",
  warn: "bg-warnSoft text-warn",
  critical: "bg-criticalSoft text-critical",
  neutral: "bg-surface3 text-inkFaint"
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Small dot signaling provenance — organizer fact vs. AI/external — reused across every entity card. */
export function ProvenanceDot({ kind }: { kind: "organizer" | "member" | "ai" }) {
  const color = kind === "organizer" ? "bg-ink" : kind === "member" ? "bg-indigo" : "bg-accent";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} aria-hidden />;
}
