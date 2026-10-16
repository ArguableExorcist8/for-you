-- For Us v35 — best time to talk (applied 2026-10-16)
alter table public.member_prefs add column if not exists free jsonb;
alter table public.member_prefs add column if not exists updated_at timestamptz default now();
-- v37 — shared app-lock passcode (applied 2026-10-16)
alter table public.couple_settings add column if not exists lock_salt text;
alter table public.couple_settings add column if not exists lock_hash text;
-- v38 — good morning + quick check-ins (applied 2026-10-16)
alter table public.goodnights add column if not exists kind text not null default 'night';
alter table public.goodnights drop constraint if exists goodnights_couple_id_created_by_day_key;
create unique index if not exists goodnights_one_per_kind on public.goodnights (couple_id, created_by, day, kind);
alter table public.goodnights add constraint goodnights_kind_check check (kind in ('night','morning'));
create table if not exists public.checkins (id uuid primary key default gen_random_uuid(), couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(), status text not null check (char_length(status) <= 24), expires_at timestamptz not null default now() + interval '4 hours');
create index if not exists checkins_couple_time on public.checkins (couple_id, created_at desc);
select public.fu_secure('checkins');
alter publication supabase_realtime add table public.checkins;
-- v41 — video messages + photo/video files land in Photos too (applied 2026-10-17; see migration v41_more_chat_media_to_photos)
-- v43 — pick-your-own check-ins (applied 2026-10-17)
alter table public.checkins add column if not exists label text check (char_length(label) <= 30);
alter table public.checkins add column if not exists emoji text check (char_length(emoji) <= 16);
alter table public.member_prefs add column if not exists favs jsonb;
