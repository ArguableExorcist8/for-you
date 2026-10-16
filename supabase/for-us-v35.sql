-- For Us v35 — best time to talk (applied 2026-10-16)
alter table public.member_prefs add column if not exists free jsonb;
alter table public.member_prefs add column if not exists updated_at timestamptz default now();
-- v37 — shared app-lock passcode (applied 2026-10-16)
alter table public.couple_settings add column if not exists lock_salt text;
alter table public.couple_settings add column if not exists lock_hash text;
