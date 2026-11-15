# Splyter app (Wave 1 skeleton)

Vite + React + TypeScript PWA. Talks to the Supabase backend in `splyter-backend` only through its RPCs.

## Run it

```bash
npm install
cp .env.example .env.local     # fill in your DEV Supabase URL and anon key
npm run dev                    # opens on your LAN too, so you can try it on your phone
npm run typecheck
```

## Supabase dashboard settings this app needs

1. **Authentication > Sign In / Providers:** enable **Anonymous sign-ins**, **Email** (magic link) and **Google**.
2. **Authentication > Sign In / Providers (settings):** turn on **Allow manual linking**. Without it, upgrading a player to a real account fails and their choices are lost.
3. **Authentication > URL Configuration:** add `http://localhost:5173` and your phone-on-LAN URL (and later your Vercel URL) to the redirect allow-list.
4. Run the backend migration and seed, then add invite codes and at least 5 Splits (see below).

## What is in here

| Area | Files |
| --- | --- |
| Swipe engine, React hook, Zustand slice | `src/gesture/*` (engine and hook are used; `swipeStore.ts` is not wired in yet) |
| The deck: swipe, reveal, optimistic result, skips, friends row | `src/components/PlayDeck.tsx` |
| Typed wrappers for every database function, plus friendly error messages | `src/lib/api.ts` |
| Sign-in, anonymous start, account upgrade | `src/lib/auth.tsx`, `src/components/AuthButtons.tsx` |
| Flow: welcome, play 5, sign up, invite code, profile, app | `src/App.tsx`, `src/screens/*` |
| Feed, Create (live preview and remix prefill), Me (your Splits with live counts, delete) | `src/screens/Feed.tsx`, `Create.tsx`, `Me.tsx` |

Behaviour worth knowing:

- The reveal appears the instant you swipe; the percentages fill in when the server answers (a mock server answered in about 15 ms in tests).
- Under 10 votes the reveal says "Be one of the first to split this" instead of a percentage.
- Up before choosing records a skip; it is flagged "early" if it happens within 1 s of the card appearing.
- A failed vote is rolled back with a friendly message and can be retried.
- Onboarding plays the **first 5 real Splits from the feed** as an anonymous user, so those choices are saved and carry over when they sign up.

## Not built yet

- Public web Split (`/s/:id`, play with no login), share drawer and result cards (Vercel function with Satori).
- Report button and the settings screen (privacy toggle, data export, account deletion).
- Notifications hub and web push, Daily Split.
- Subscribing to web push and sending pushes (the service worker already shows pushes and handles taps).
- `swipeStore.ts` is unused for now; the deck keeps its state locally.

## Install and offline (PWA)

- **Icons:** `public/icons/*` and `public/favicon.svg`, drawn from one mark (a circle split into a blue A half and an orange B half). Change the design in `scripts/make-icons.cjs` and rerun it (`npm i -D sharp && node scripts/make-icons.cjs`).
- **Service worker:** `public/sw.js`, registered in production builds only. It caches the app shell and the built JS/CSS, opens page loads network-first (so a deploy shows up straight away) and falls back to the cached shell when offline. It only touches same-origin GET requests: Supabase calls are never cached. Bump `VERSION` in `sw.js` to force everyone onto fresh caches.
- **Install prompt:** the Me screen shows an Install card on Android/Chrome (native dialog) and "Share > Add to Home Screen" instructions on iPhone. On iPhone, web push only works from the installed app.
- **Notch and home bar:** the app draws edge to edge and pads itself with the safe-area insets. Pinch-zoom is allowed everywhere except on the swipe card.
- **Deploying on Vercel:** `vercel.json` sends every path to the app (needed for the future `/s/:id` links) and stops `sw.js` being cached.

## Before real users

You need seed content: create an account for yourself, then publish ~150 Splits through the app or SQL. The app shows "You're all caught up" on an empty database, and onboarding needs at least 5 Splits to be playable.

## How this was checked

The real app code was bundled with esbuild and driven in headless Chromium against an in-memory mock of the backend: 35 checks of the interaction flow (onboarding, swipes, skips, keyboard, sign-up upgrade, remix, create, failed votes) and 31 checks of the PWA layer (manifest and icons, service worker install, caching, offline reload and deep links, install prompt, iPhone emulation with real touch gestures, notch and home-bar insets). It was also type-checked strictly against typed stand-ins for the libraries. It has **not** been run with the real `vite`, `@supabase/supabase-js`, or `@tanstack/react-query` packages, because installs were unavailable, so expect to fix a small type or import mismatch on first `npm run dev`.

**Still to confirm on a real phone:** swipe feel under a real finger, and the notch/Dynamic Island spacing in full-screen install mode. In Chromium's touch emulation a tap that follows a swipe within about a quarter of a second is swallowed (the browser does this even without the app's gesture code); it is worth checking that a quick tap after a swipe feels fine on your device.
