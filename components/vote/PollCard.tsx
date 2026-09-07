"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock } from "lucide-react";
import { castVoteAction, closePollAction } from "@/lib/actions/vote";
import type { PollWithResults } from "@/lib/repo/types";
import type { Locale } from "@/lib/i18n/locale";
import { t, voteCountLabel } from "@/lib/i18n/translations";

export function PollCard({
  tripId,
  data,
  myTripMemberId,
  isOrganizer,
  locale
}: {
  tripId: string;
  data: PollWithResults;
  myTripMemberId?: string;
  isOrganizer: boolean;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { poll, options, votes } = data;
  const totalVotes = votes.length;
  const myVote = votes.find((v) => v.tripMemberId === myTripMemberId);

  function vote(optionId: string) {
    startTransition(async () => {
      await castVoteAction(tripId, poll.id, optionId);
      router.refresh();
    });
  }

  function close() {
    startTransition(async () => {
      await closePollAction(tripId, poll.id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-[14.5px] font-bold text-ink">{poll.question}</p>
        {poll.status === "closed" && (
          <span className="flex flex-none items-center gap-1 rounded-full bg-surface2 px-2 py-0.5 text-[10.5px] font-bold text-inkFaint">
            <Lock size={10} /> {t(locale, "closed")}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const count = votes.filter((v) => v.optionId === option.id).length;
          const pct = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
          const isMine = myVote?.optionId === option.id;
          const canVote = poll.status === "open" && Boolean(myTripMemberId);

          return (
            <button
              key={option.id}
              type="button"
              disabled={!canVote || pending}
              onClick={() => vote(option.id)}
              className={`relative overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition ${
                isMine ? "border-accent" : "border-border"
              } ${canVote ? "hover:bg-surface2" : ""}`}
            >
              <div className="absolute inset-y-0 left-0 bg-accentSoft" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
                  {isMine && <Check size={13} className="text-accent" />}
                  {option.label}
                </span>
                <span className="ltr-nums flex-none text-[12px] font-bold text-inkFaint">
                  {pct}% · {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11.5px] text-inkFaint">{voteCountLabel(locale, totalVotes)}</p>
        {isOrganizer && poll.status === "open" && (
          <button type="button" disabled={pending} onClick={close} className="flex items-center gap-1 text-[11.5px] font-semibold text-inkFaint hover:text-ink">
            {pending ? <Loader2 size={11} className="animate-spin" /> : null} {t(locale, "closePoll")}
          </button>
        )}
      </div>
    </div>
  );
}
