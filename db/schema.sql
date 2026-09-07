-- Family Travel OS — Supabase/Postgres schema
-- Mirrors lib/types.ts. Run this once a real Supabase project is connected;
-- the app runs on an in-memory repository until SUPABASE_URL /
-- SUPABASE_SERVICE_ROLE_KEY are set, so this file is not required for local dev.

create extension if not exists "uuid-ossp";

create table trips (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  cover_image text,
  start_date date not null,
  end_date date not null,
  countries text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','confirmed','active','completed')),
  invite_code text not null unique,
  created_by_trip_member_id uuid, -- fk added after trip_members exists
  created_at timestamptz not null default now()
);

create table trip_members (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid references auth.users(id),
  display_name text not null,
  role text not null default 'member' check (role in ('organizer','member')),
  joined_at timestamptz not null default now()
);

alter table trips add constraint trips_created_by_fk
  foreign key (created_by_trip_member_id) references trip_members(id);

create table food_restrictions (
  id uuid primary key default uuid_generate_v4(),
  trip_member_id uuid not null references trip_members(id) on delete cascade,
  type text not null check (type in ('allergy','medical','religious','diet')),
  label text not null,
  notes text
);

create table food_preferences (
  id uuid primary key default uuid_generate_v4(),
  trip_member_id uuid not null references trip_members(id) on delete cascade,
  category text not null check (category in ('like','dislike')),
  label text not null,
  weight smallint not null default 3
);

create table places (
  id uuid primary key default uuid_generate_v4(),
  canonical_name text not null,
  category text not null check (category in ('hotel','attraction','restaurant','station','airport','neighborhood','other')),
  city text not null,
  country text not null,
  timezone text not null, -- IANA zone; every downstream time is anchored to this, never the viewer's device zone
  lat double precision,
  lng double precision,
  address_local_script text,
  address_translit text,
  geocode_source text default 'external_api',
  unique (canonical_name, city, country)
);

create table place_enrichments (
  place_id uuid primary key references places(id) on delete cascade,
  description text,
  -- Hebrew twin of description, produced in the SAME Claude call as
  -- `description` (Automatic Bilingual Generation — see lib/ai/enrichPlace.ts
  -- and PlaceEnrichment.descriptionHe in lib/types.ts), not a separate
  -- translation pass. Null for curated/generic-sourced rows and for any
  -- record fetched before this field existed; the display layer
  -- (lib/i18n/localizeEnrichment.ts) falls back to `description` then.
  description_he text,
  -- Natural Hebrew name/transliteration for this place, same bilingual
  -- Claude call as description_he. Presentation-only — places.canonical_name
  -- itself is never touched.
  name_he text,
  photos text[] not null default '{}',
  -- Which real photo API (if any) supplied `photos`. Null means `photos` is
  -- still empty and every call site falls back to the deterministic
  -- placeholder tile — see lib/enrichment/photos.ts.
  photo_source text check (photo_source in ('google_places','unsplash','wikipedia')),
  -- Which text source populated description/practical_info — lets the
  -- display layer choose a Hebrew translation for curated/generic content;
  -- live Claude and Wikipedia text carry their own Hebrew twin directly
  -- (description_he/practical_info_he) instead of going through that lookup.
  text_origin text check (text_origin in ('claude','curated','generic','wikipedia')),
  practical_info jsonb,
  -- Hebrew counterpart of practical_info, same bilingual-in-one-call origin
  -- as description_he. Only the fields Claude actually filled in Hebrew are
  -- present — see PlaceEnrichmentPracticalInfo in lib/types.ts.
  practical_info_he jsonb,
  source text not null default 'ai_generated',
  fetched_at timestamptz not null default now(),
  stale_after timestamptz not null default (now() + interval '30 days')
);

create table days (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  date date not null,
  day_index int not null,
  city_place_id uuid references places(id),
  timezone text not null,
  is_travel_day boolean not null default false,
  unique (trip_id, date)
);

create table itinerary_items (
  id uuid primary key default uuid_generate_v4(),
  day_id uuid not null references days(id) on delete cascade,
  type text not null check (type in ('activity','meal','transport','note','free_time')),
  title text not null, -- organizer's own words; never overwritten silently by AI
  start_time time,
  end_time time,
  place_id uuid references places(id),
  order_index int not null default 0,
  notes text,
  source text not null default 'organizer_input',
  confidence numeric(3,2),
  needs_review boolean not null default false
);

create table hotel_stays (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  place_id uuid not null references places(id),
  check_in date not null,
  check_out date not null,
  confirmation_number text,
  source text not null default 'organizer_input'
);

create table transport (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  -- on delete cascade: TripRepository.deleteDay (lib/repo/supabase.ts) relies
  -- on a day's own transport rows disappearing along with it, the same way
  -- the in-memory repository explicitly deletes them — without this, deleting
  -- a day with a transport leg attached would fail with a foreign-key
  -- violation instead.
  day_id uuid references days(id) on delete cascade,
  mode text not null check (mode in ('flight','train','car','bus','ferry','other')),
  from_place_id uuid references places(id),
  to_place_id uuid references places(id),
  -- "HH:mm" wall-clock text, not a real timestamp: the parser (both the
  -- Claude and offline paths) only ever extracts a local time-of-day, never
  -- a full instant with a resolved timezone/date — see Transport.departTime
  -- in lib/types.ts. Storing these as timestamptz would silently coerce or
  -- reject exactly the values every parser actually produces.
  depart_time text,
  arrive_time text,
  carrier text,
  reference_number text,
  seat_info text,
  source text not null default 'organizer_input'
);

create table reservations (
  id uuid primary key default uuid_generate_v4(),
  itinerary_item_id uuid not null references itinerary_items(id) on delete cascade,
  type text not null check (type in ('restaurant','activity','ticket')),
  time timestamptz,
  party_size int,
  confirmation_number text,
  notes text,
  source text not null default 'organizer_input'
);

-- Named "polls" (not "votes") to match lib/types.ts's Poll/PollOption/
-- PollVote exactly — a simple single-choice family poll ("What should we do
-- this afternoon?"), not a full trip-planning vote/booking system.
create table polls (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  day_id uuid references days(id),
  question text not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_by_trip_member_id uuid not null references trip_members(id),
  created_at timestamptz not null default now()
);

create table poll_options (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null
);

create table poll_votes (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  trip_member_id uuid not null references trip_members(id) on delete cascade,
  -- A member has at most one active vote per poll (lib/repo/types.ts's
  -- castVote casts-or-changes) — voting again updates this row rather than
  -- adding a second one.
  unique (poll_id, trip_member_id)
);

create table ai_recommendations (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  type text not null check (type in ('trip_check_issue','replacement','save_our_day_plan','food_match')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','accepted','dismissed')),
  created_at timestamptz not null default now(),
  resolved_by_trip_member_id uuid references trip_members(id)
);

create table edit_history (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  actor_trip_member_id uuid not null references trip_members(id),
  entity_type text not null,
  entity_id uuid not null,
  diff jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security sketch. `trip_members` is the join table every policy
-- keys off: readability requires membership, writes to itinerary/booking
-- tables require the organizer role for that specific trip.
--
-- Honest caveat: these policies are currently DECORATIVE, not enforced, for
-- this app's actual access pattern. There is no Supabase Auth login yet —
-- "who's viewing" is a plain httpOnly cookie set per trip (lib/session.ts),
-- and every database call happens server-side through
-- lib/repo/supabase.ts using the SERVICE ROLE key, which bypasses RLS by
-- design (that's what lets the server act on any trip regardless of these
-- policies). auth.uid() is always null for every row these policies check,
-- since no request ever carries a real Supabase Auth session. These
-- policies matter, and start actually restricting access, the day a real
-- login (Supabase Auth) is added and some part of the app starts querying
-- Supabase directly from the browser with a user-scoped client instead of
-- exclusively through the server. Until then, "logged in as the wrong
-- family" isn't something the database enforces — it's the cookie in
-- lib/session.ts.
-- ---------------------------------------------------------------------------

alter table trips enable row level security;
alter table itinerary_items enable row level security;
alter table hotel_stays enable row level security;
alter table transport enable row level security;
alter table food_restrictions enable row level security;
alter table food_preferences enable row level security;

create policy "members can read their trip"
  on trips for select
  using (exists (
    select 1 from trip_members m
    where m.trip_id = trips.id and m.user_id = auth.uid()
  ));

create policy "organizers write itinerary"
  on itinerary_items for all
  using (exists (
    select 1 from trip_members m
    join days d on d.trip_id = m.trip_id
    where d.id = itinerary_items.day_id and m.user_id = auth.uid() and m.role = 'organizer'
  ));

create policy "members manage their own food data"
  on food_restrictions for all
  using (exists (
    select 1 from trip_members m
    where m.id = food_restrictions.trip_member_id and m.user_id = auth.uid()
  ));
