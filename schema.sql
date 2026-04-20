-- ============================================================
-- AlgoLog Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Tables ───────────────────────────────────────────────────

-- 1. Problems: the core entity
create table if not exists public.problems (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  url           text,
  difficulty    text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  company_tags  text[] default '{}',
  ds_tags       text[] default '{}',       -- Data-structure tags (Array, Tree, DP…)
  is_public     boolean not null default false,
  share_slug    text unique,               -- Generated slug for public share links
  notes         text,                      -- Markdown whiteboard / pseudo-code
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. Code versions: Brute Force → Optimised → Further Optimised …
create table if not exists public.code_versions (
  id            uuid primary key default uuid_generate_v4(),
  problem_id    uuid not null references public.problems(id) on delete cascade,
  version_label text not null,             -- e.g. "Brute Force", "Optimised", "Space-Opt"
  language      text not null default 'python',
  code          text not null,
  time_complexity  text,                   -- e.g. "O(n log n)"
  space_complexity text,                  -- e.g. "O(1)"
  created_at    timestamptz not null default now()
);

-- 3. Spaced repetition review schedule (Leitner system)
create table if not exists public.review_schedule (
  id              uuid primary key default uuid_generate_v4(),
  problem_id      uuid not null references public.problems(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  leitner_box     int not null default 1 check (leitner_box between 1 and 5),
  last_reviewed   timestamptz,
  next_review     timestamptz not null default now(),
  review_count    int not null default 0,
  unique (problem_id, user_id)
);

-- 4. Collaborative study rooms
create table if not exists public.study_rooms (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  problem_id  uuid not null references public.problems(id) on delete cascade,
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.study_room_members (
  room_id   uuid not null references public.study_rooms(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_problems_user_id   on public.problems(user_id);
create index if not exists idx_problems_ds_tags   on public.problems using gin(ds_tags);
create index if not exists idx_code_versions_prob on public.code_versions(problem_id);
create index if not exists idx_review_next        on public.review_schedule(next_review);
create index if not exists idx_review_user        on public.review_schedule(user_id);

-- ── Auto-update updated_at ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_problems_updated_at
  before update on public.problems
  for each row execute procedure public.set_updated_at();

-- ── Row Level Security (RLS) ──────────────────────────────────
alter table public.problems          enable row level security;
alter table public.code_versions     enable row level security;
alter table public.review_schedule   enable row level security;
alter table public.study_rooms       enable row level security;
alter table public.study_room_members enable row level security;

-- problems: owner full CRUD | public read-only via share_slug
create policy "problems_owner_all"
  on public.problems for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "problems_public_select"
  on public.problems for select
  using (is_public = true);

-- code_versions: inherit problem access
create policy "versions_owner_all"
  on public.code_versions for all
  using (
    problem_id in (
      select id from public.problems where user_id = auth.uid()
    )
  );

create policy "versions_public_select"
  on public.code_versions for select
  using (
    problem_id in (
      select id from public.problems where is_public = true
    )
  );

-- review_schedule: strictly personal
create policy "review_owner_all"
  on public.review_schedule for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- study_rooms: owner + members
create policy "rooms_owner_all"
  on public.study_rooms for all
  using (auth.uid() = owner_id);

create policy "rooms_member_select"
  on public.study_rooms for select
  using (
    id in (
      select room_id from public.study_room_members where user_id = auth.uid()
    )
  );

create policy "room_members_all"
  on public.study_room_members for all
  using (auth.uid() = user_id);

-- ── Seed: Leitner box intervals (for reference) ───────────────
-- Box 1 → review in 1 day
-- Box 2 → review in 3 days
-- Box 3 → review in 7 days
-- Box 4 → review in 14 days
-- Box 5 → review in 30 days  (mastered)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_owner_all"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_public_select"
  on public.profiles for select
  using (true);