"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CreateTripResult } from "@/lib/actions";

export function TripCreated({ result }: { result: CreateTripResult }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center px-6 pb-10 pt-16 text-center">
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-goodSoft text-good">
        <Check size={24} strokeWidth={2.5} />
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-ink">{result.name}</h1>
      <p className="mt-1 text-[15px] text-inkSoft">Your trip is ready. Share the code to bring everyone in.</p>

      <div className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={result.qrDataUrl} alt="QR code to join this trip" className="mx-auto h-48 w-48" />
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-inkFaint">Trip code</p>
        <p className="font-mono text-4xl font-bold tracking-[0.2em] text-ink">{result.inviteCode}</p>
      </div>

      <button
        onClick={() => {
          navigator.clipboard?.writeText(result.joinUrl).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        className="mt-4 flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[13px] font-semibold text-inkSoft hover:bg-surface2"
      >
        {copied ? <Check size={14} className="text-good" /> : <Copy size={14} />}
        {copied ? "Link copied" : result.joinUrl.replace(/^https?:\/\//, "")}
      </button>

      <div className="mt-auto w-full pt-10">
        <Link href={`/t/${result.tripId}/today`}>
          <Button size="lg" className="w-full">
            Go to Today
          </Button>
        </Link>
      </div>
    </div>
  );
}
