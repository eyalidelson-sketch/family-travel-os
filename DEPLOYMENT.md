# Deployment Plan — Family Travel OS

This is the ordered path from "running in a sandbox with `npm run dev`" to
"a real, shareable website your family can actually use." Do the steps in
order — each one only matters once the step before it is done, and doing
them out of order (deploying before the database is real, for instance)
just means redoing work.

Everything in this app already degrades gracefully with nothing configured
(see `.env.example`), so none of this is required to keep developing
locally. It's required once you want a link you can send to family members
that still works tomorrow.

## Why this order

1. **Database first.** Right now the app stores everything — trips, places,
   photo/text enrichment — in plain JavaScript memory (`lib/repo/memory.ts`,
   `lib/repo/placeStore.ts`). That's perfect for `npm run dev`: one process,
   one machine, memory sticks around until you stop it. It is **not**
   compatible with a real host. Vercel (and most serverless hosts) can run
   your app on a different, freshly-started instance for every single
   request — there is no guarantee two requests ten seconds apart share any
   memory at all. Deployed as-is, trips would appear to save and then
   randomly vanish. This has to be fixed before deploying, not after.
2. **API keys second**, because they're what turn "honest placeholder"
   content into real content, and it's easier to verify each one works
   against a database that's actually persisting data.
3. **Deployment last**, once there's something real underneath it worth
   putting a URL on.

## Step 1 — A real database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com) (the free
   tier is enough to start).
2. In that project's SQL Editor, paste the entire contents of `db/schema.sql`
   from this repo and run it once. This creates every table the app needs
   (trips, days, itinerary items, places, hotel stays, transport, food
   preferences, polls, and more) — it's already written to match the app's
   TypeScript types exactly, including the corrections made in this pass
   (see "What changed in this pass" below).
3. In that project's **Settings → API** page, copy the **Project URL** and
   the **`service_role` key** (not the `anon`/public key — the server needs
   the service-role key to act on any trip regardless of Row Level
   Security; see the honest caveat in `db/schema.sql`'s own RLS section
   about what that policy layer does and doesn't do yet).
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — locally in a
   `.env.local` file (copy `.env.example`), and later in your hosting
   provider's environment variable settings (step 3 below).
5. That's it — `lib/repo/index.ts` automatically switches the entire app
   from the in-memory repository to `lib/repo/supabase.ts` the moment both
   variables are set. No code changes needed.

**Verify it worked:** run `npm run dev` with those two variables set,
create a trip, then check the Supabase dashboard's **Table Editor** — you
should see rows appear in `trips`, `days`, `trip_members`, etc. Restart the
dev server and reload the trip; if it's still there, the database is real.

## Step 2 — API keys (all optional, in order of impact)

Before adding any key: real photos and real place descriptions already work
with **zero** keys set, via Wikipedia's free public API (no signup — see
`lib/providers/photoSources/wikipedia.ts`). Every well-known place gets its
own Wikipedia photo and summary automatically, in both English and Hebrew.
The keys below are extra tiers on top of that free baseline — each one
narrows the set of places that still fall back to a generic tile or a
category-only sentence (a specific hotel or restaurant, mostly, since those
rarely have their own Wikipedia article).

Add these to the same `.env.local` (and later to your host), one at a time,
re-testing after each:

1. **`ANTHROPIC_API_KEY`** — the single highest-impact key. Get one at
   [console.anthropic.com](https://console.anthropic.com) → API Keys. With
   this set, itinerary parsing uses Claude's real document understanding
   instead of the offline heuristic parser, and place write-ups
   (description, what-to-do, family tips) come from Claude instead of the
   category-derived generic text this pass improved. `ANTHROPIC_MODEL` is
   optional and defaults to `claude-sonnet-4-5`.
2. **`GOOGLE_PLACES_API_KEY`** — real venue photos instead of placeholder
   tiles. Needs a Google Cloud project with the Places API enabled and
   billing on file (Google's free tier covers normal family-trip-planning
   volume). Get it at [console.cloud.google.com](https://console.cloud.google.com).
3. **`UNSPLASH_ACCESS_KEY`** — a fallback photo source for anything Google
   Places doesn't have a photo for. Free at
   [unsplash.com/developers](https://unsplash.com/developers) — no billing
   required.

None of these are required for the app to work — every one has a real,
honest fallback (see `.env.example` for exactly what each does and doesn't
change). Add them in the order above because that's the order of visible
improvement: Claude changes the most (parsing quality, place descriptions),
photos are a close second, and the rest is polish.

## Step 3 — Deploy (Vercel)

This app is a standard Next.js 14 App Router project — Vercel is the
natural host (it's built by the same team as Next.js, and needs no config
file for a project this shape).

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. At [vercel.com](https://vercel.com), **Add New → Project**, import that
   repo. Vercel auto-detects Next.js — the default build settings
   (`npm run build`, output directory auto-detected) are correct, no
   changes needed.
3. Before the first deploy, add every environment variable from Steps 1–2
   under **Project Settings → Environment Variables** — the exact same
   names as `.env.example`/`.env.local`, for the **Production** (and
   **Preview**, if you want preview deployments to also hit the real
   database) environment.
4. Deploy. Vercel gives you a `*.vercel.app` URL immediately; attach a
   custom domain afterward under **Project Settings → Domains** if you want
   one.
5. **Re-run the Step 1 verification against the deployed URL**, not just
   locally: create a trip on the live site, reload the page, and (ideally)
   check it again a few minutes later from a different device/browser. This
   is the real test that the database is actually shared and durable, not
   just working because your laptop happened to keep the same process
   running.

## What changed in this pass (for the record)

`db/schema.sql` had a real Postgres schema and `lib/repo/supabase.ts` had
the exact right shape (implements the same `TripRepository` interface as
the in-memory version, so swapping is a one-line change in
`lib/repo/index.ts`) — but every method in it just threw
`"not implemented yet"`, and the schema had drifted from the app's actual
TypeScript types in a few places. This pass:

- Implemented all 22 `TripRepository` methods in `lib/repo/supabase.ts`
  against `@supabase/supabase-js`, mirroring `lib/repo/memory.ts`'s exact
  business logic (invite-code generation, day insert/delete with cascading
  date/index shifts, poll cast-or-change voting, and so on).
- Added `lib/repo/supabasePlaceRepo.ts`, the Postgres-backed counterpart of
  `lib/repo/placeStore.ts`'s in-memory Place/PlaceEnrichment maps — this is
  the OTHER persistence seam the app has (deliberately separate from trips,
  so a place is enriched once and reused by every trip that mentions it),
  and it needed the exact same "real database" treatment or a deployed app
  would still lose all its place/photo/text data between requests even
  with `SUPABASE_URL` set.
- Fixed schema drift: renamed the `votes`/`vote_options`/`vote_responses`
  tables to `polls`/`poll_options`/`poll_votes` to match `lib/types.ts`'s
  `Poll`/`PollOption`/`PollVote` exactly; added the bilingual enrichment
  columns (`description_he`, `name_he`, `practical_info_he`, `photo_source`,
  `text_origin`) `place_enrichments` was missing; changed
  `transport.depart_time`/`arrive_time` from `timestamptz` to `text`, since
  every parser (Claude and offline) only ever extracts a local "HH:mm", not
  a resolved instant; added `on delete cascade` to `transport.day_id`,
  without which deleting a day with a transport leg attached would fail
  with a foreign-key violation.
- Wired `lib/repo/index.ts` to actually construct `SupabaseTripRepository`
  when configured, instead of silently staying on the in-memory one.
- Added `@supabase/supabase-js` to `package.json`.

**Known limitation, stated plainly:** `addDayAfter`/`deleteDay` each run as
a sequence of separate Postgres statements, not one atomic transaction —
`supabase-js`'s REST-based client doesn't expose `BEGIN`/`COMMIT` directly.
A request that fails partway through (a dropped connection mid-request, not
a normal validation error) could leave days partially renumbered. Wrapping
that logic in a single Postgres function (`create function ...` +
`supabase.rpc(...)`) is the right long-term fix if this feature sees real
concurrent use — it wasn't implemented here because this sandbox has no
credentials to write and test that function against a live project.

**Also worth knowing:** there's no real login yet. "Who's viewing" is a
plain `httpOnly` cookie set per trip (`lib/session.ts`), not a Supabase Auth
session — see the note added to `db/schema.sql`'s Row Level Security
section for exactly what that means (the short version: RLS policies are
there for the day a real login gets added, but they're not what's
protecting anything today — the server-side service-role key bypasses them
entirely, by design). Good enough for a family sharing one invite link;
worth knowing before assuming the database enforces who can see what.
