-- For Us v35 — best time to talk (applied 2026-10-16)
alter table public.member_prefs add column if not exists free jsonb;
alter table public.member_prefs add column if not exists updated_at timestamptz default now();
