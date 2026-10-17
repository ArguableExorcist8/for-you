# For Us — roadmap & parked ideas

## When we move to a real app (App Store / native)
These need things a Home Screen web app can't do on iPhone.

- **Voice & video calls** — WebRTC calls between the two phones, with proper ringing through CallKit
  (full-screen incoming call even when the app is closed, works on the lock screen, keeps going in the background,
  earpiece/speaker control). Calls show in the chat ("📞 Voice call · 12 min", "Missed call").
  Needs a relay (TURN) server for mobile networks.
  *Why parked:* as a web app it can't ring when closed (only a notification) and the call stops if you leave the app or lock the screen.
- **Home-screen widget** — one-tap ping, partner's latest check-in, days-together counter.
- **Real Face ID app lock** — system-level instead of the in-app passcode screen.
- **Background location "arrived home safe"** — automatic, with permission, instead of the manual check-in.
- **Reliable haptics on iPhone** — the theme buzz patterns (iPhones ignore web vibration).

## Still to do (web app)
- Run `supabase/for-us-v34-fixes.sql` and turn on leaked-password protection (Supabase → Authentication).
- Two-phone test together (both-here moment, touches, realtime, morning/goodnight, check-ins, private lock).
- Error alerts, nightly backups, automatic tests before going live.
- Move hosting to Cloudflare Pages before making the repo private (GitHub Pages needs a paid plan for private repos).

## Suggested next (Oct 2026)
**Soon**
- Run `supabase/for-us-v34-fixes.sql` — security hardening + fixes the reminder job timing out
- Weekly backup: automatic export of messages, photo list and notes to a file we keep
- Error alerts: crashes on either phone get reported automatically (no more screenshots of bugs)
- Two-phone test together (~10 min): pings, chat effects, shared list, drag-to-rearrange

**Features**
- Shared photo albums ("Trip to Dahab", "Our first year") with a cover photo
- Countdown to the next time we see each other — takes over Home on the last day
- Daily "one thing": one line each about the day, revealed side by side at night
- A love plant/creature on Home that grows with streaks and wilts gently when we go quiet

**Polish**
- 4-screen onboarding tour for new couples
- Smaller first load: split the app so the first open downloads less on mobile data

## Ideas for later
- Promises · listening together · "remember when…" game · couple stats page · wishlist · photo of the day
- Little reminders about each other · shared calendar · hug from afar (press & hold together)
- Date ideas from our own data · letters that open on a date · Arabic option · first-run tour
