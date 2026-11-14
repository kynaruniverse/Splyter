# Splyter app skeleton

## Run
1. `npm install`
2. Copy `.env.example` to `.env.local`, fill in your **dev** Supabase URL and anon key.
3. Apply `splyter-backend.zip` to the dev project (README in that zip), then run `test/smoke.sql` once.
4. In Supabase → Authentication → URL Configuration, set Site URL to `http://localhost:5173`
   and add `http://localhost:5173/feed` to Redirect URLs.
5. `npm run dev`

## What works end to end
- Welcome → anonymous session → 5 sample cards → sign-up (Google or email link).
- Anonymous-to-account upgrade uses `updateUser` / `linkIdentity`, so the same user id is kept.
- Age gate after sign-up: 13–17 or 18+. Under-18 privacy is enforced server-side.
- Feed wired to `get_feed`, `cast_vote`, `record_skip`, `get_results`.
- Optimistic reveal on commit, then reconcile with the server. No fabricated percentages.
- Keyboard: ← → ↑ ↓. Tap buttons mirror the gestures.
- Report sheet calls `report_post`.

## RPC names to check
All server calls are in `src/lib/api.ts`. If one 404s, the migration uses a different
name or argument name — fix it there and nowhere else:
`get_feed`, `get_split`, `get_results`, `cast_vote`, `record_skip`,
`redeem_invite`, `complete_profile`, `report_post`.

## Not built yet (deliberate)
- Create flow, profile/alignment, share drawer, public-link voting: routes exist, screens are stubs.
- Daily Split, creator notifications, account deletion.
- Back-navigation to a card you already voted on will be refused by the one-vote constraint.

## Known gaps
- Not type-checked or run in this environment; `npm run build` will surface errors.
- Swipe constants in `src/hooks/useSwipe.ts` are the prototype defaults — change them only there.