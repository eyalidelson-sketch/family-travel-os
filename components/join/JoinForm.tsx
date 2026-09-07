"use client";

import { useFormState, useFormStatus } from "react-dom";
import { joinFormAction, type JoinFormState } from "@/lib/actions";
import { Button } from "@/components/ui/Button";

const initialState: JoinFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button size="lg" className="w-full" type="submit" disabled={pending}>
      {pending ? "Joining…" : "Join trip"}
    </Button>
  );
}

export function JoinForm() {
  const [state, formAction] = useFormState(joinFormAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-inkFaint">Trip code</label>
        <input
          name="code"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="K7P4Q"
          maxLength={6}
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-center font-mono text-2xl font-semibold tracking-[0.3em] text-ink placeholder:text-inkFaint/50 outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-inkFaint">Your name</label>
        <input
          name="displayName"
          autoComplete="name"
          placeholder="Tamar"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-[15px] text-ink placeholder:text-inkFaint/60 outline-none focus:border-accent"
        />
      </div>
      {state?.error && <p className="text-sm font-medium text-critical">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
