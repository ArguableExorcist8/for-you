# For Us v25: one-time database setup (about 5 minutes)

The new features (repair mode, needs, guess-their-answer, touches, goodnight,
state-of-us ratings, future map, private lock, smart menus, reminders) need a few
new tables. Until you do this, those features stay hidden and nothing breaks.

## 1. Create the tables (1 minute)
1. Open https://supabase.com/dashboard → your **For Us** project → **SQL Editor** → **New query**.
2. Paste the whole of `supabase/for-us-v25.sql` and click **Run**.
3. You should see: `For Us v25 installed ✔`.

It only adds things: it doesn't change or delete any existing table or data, and it's safe to run twice.

## 2. Security check (30 seconds)
In the same SQL Editor, run:

```sql
select * from public.fu_security_report();
```

Every row should say **ok**. If any row says `NO RLS`, `WIDE OPEN` or `PUBLIC`,
send that output to Claude and it will fix the gaps for you.

## 3. Reminders (3 minutes, optional)
This is what sends "your pause is over", anniversaries, "on this day", the evening
ritual nudge and the Sunday state-of-us reminder, each at your local time.

1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Name it exactly `nudges`.
3. Paste the contents of `supabase/functions/nudges/index.ts` and deploy.
4. Open the function's settings and turn **Verify JWT** **off**. The function checks
   its own secret, which the SQL in step 1 created in Supabase Vault.
5. **Edge Functions → Secrets**: the function needs your push private key. It looks for
   `VAPID_PRIVATE_KEY` (or `VAPID_PRIVATE` / `WEB_PUSH_PRIVATE_KEY`). Your existing
   `notify` function already uses one of these, so it's probably already set. If it's
   under a different name, add it again as `VAPID_PRIVATE_KEY`.

The schedule (every 5 minutes) was already created in step 1. If you skip step 3,
everything else still works; you just won't get the timed reminders.
