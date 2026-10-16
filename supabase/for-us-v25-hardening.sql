-- For Us v25 — security hardening (run once after for-us-v25.sql)
-- Fixes what Supabase's security advisor flagged. Safe to re-run.

-- 1. helper functions: not callable without signing in
revoke all on function public.fu_fill() from public, anon, authenticated;
revoke all on function public.fu_my_couple(), public.fu_answered_day(date), public.fu_answered_topic(text),
  public.fu_wrote_repair(uuid), public.fu_bump(text), public.fu_set_tz(text) from public, anon;
grant execute on function public.fu_my_couple(), public.fu_answered_day(date), public.fu_answered_topic(text),
  public.fu_wrote_repair(uuid), public.fu_bump(text), public.fu_set_tz(text) to authenticated;

-- 2. setup helper: fixed search path, not callable over the API
alter function public.fu_secure(text, boolean) set search_path = public;
revoke all on function public.fu_secure(text, boolean) from public, anon, authenticated;

-- 3. move pg_net out of the public schema (the scheduler only uses net.http_post, which keeps working)
drop extension if exists pg_net;
create extension pg_net with schema extensions;

select 'hardening done ✔' as done;
