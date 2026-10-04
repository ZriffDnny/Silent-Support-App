# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start the Expo dev server (Metro)
npm run android    # Start + open on Android
npm run ios        # Start + open on iOS
npm run typecheck  # tsc --noEmit — the only check in this repo (no tests, no linter yet)
```

There is no test runner or linter configured. `npm run typecheck` is the gate before committing.

Environment: copy `.env.example` to `.env.local` and fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. `src/lib/env.ts` throws at startup if either is missing. The `EXPO_PUBLIC_` prefix means these are bundled into the client — only ever the anon/publishable key here, never a service key.

The Supabase Edge Function (`supabase/functions/generate-support`) is Deno, deployed separately via the Supabase CLI. It's excluded from the app's TypeScript project (`tsconfig.json`), so `npm run typecheck` does **not** cover it. Its secrets (`GROQ_API_KEY`, optional `GROQ_MODEL`) live in Supabase function secrets, never in the app.

## Architecture

React Native + Expo (expo-router, file-based routing) on TypeScript strict. Supabase for the database; a Groq-backed (OpenAI-compatible) Deno Edge Function for AI text. Screens live in `app/` (`index` → `response` → `comfort`, plus `history`); reusable logic in `src/`.

### The non-negotiable response pattern (read before touching the response flow)

The product's core principle is **presence over intelligence** — see `memory/product-direction.md`. The flow when a user taps an emotion:

1. `app/index.tsx` — emotion grid, locks on first tap, pushes to `/response`.
2. `app/response.tsx` — computes a **strength level** (see below) *synchronously*, then picks a **curated** response at that level *synchronously* (`pickCurated(emotion, strength)`, deterministic-by-day within the level, not random) so text is on screen at frame 0, and renders it by splitting on blank lines into spaced layers. It then, in the background: records the check-in to on-device history (`appendLocalLog`); if signed in, also backs it up to the account (`pushCheckIn`, append-only, best-effort); calls the AI (`fetchAiResponse(emotion, strength)`); and **only if** the AI returns within `AI_SWAP_WINDOW_MS` (2500ms) does it softly crossfade to the AI text. Aliveness comes from structure/spacing, never animation or streaming. The whole response screen is tap-to-close, but taps in the first 600ms are ignored (so a double-tap spilling over from the grid cannot close the words), leaving uses `router.dismissTo('/')` (never `replace`, which stacks a second home), the outer touch area is `accessible={false}` so screen readers reach the words and the hint is the Close button, and the AI swap is skipped when a screen reader is on.

**Never** add a loading spinner, block on the AI, delay the curated text, or stream tokens. If the AI is slow or fails, the curated text simply stands. The curated library in `src/emotions/catalog.ts` is therefore a first-class asset, not a placeholder.

### Response Strength System (Day 11A) — adaptive depth, never surfaced

`src/features/history/strength.ts` (`computeStrength`) derives a coarse depth level (`Strength = 1 | 2 | 3`) from **recent on-device history only** (a 7-day window) — no profiles, no text input, no memory beyond the local log. Level 1 = *gentle acknowledgement* (infrequent/stable/first-in-a-while; light, does not assume distress); Level 2 = *supportive presence* (the same feeling recurring, or difficult check-ins clustering; acknowledges persistence); Level 3 = *deep support* (a genuinely heavy week — repeated difficult emotions across several distinct days). Three emotion categories behave differently: **difficult** ids climb the full ladder; **positive** ids (`happy`, `grateful`, `calm`, `hopeful`, `proud`, `excited` — not in the catalog yet, capped defensively) are **never** Level 3 (L1 = normal positive acknowledgement, L2 = celebration of consistency); **reaching-out / neutral** ids (`need-comfort`, `need-encouragement`) are capped at Level 2. Thresholds are tuned so a typical user lands roughly L1 ≈ 70% / L2 ≈ 25% / L3 ≈ 5% — Level 3 is intentionally hard to reach. Keep the `DIFFICULT` / `POSITIVE` id lists in sync with the catalog.

The level **must NEVER be shown to the user** — surfacing it would read as surveillance/diagnosis. It only shapes depth: the catalog stores curated responses per level (`CuratedByLevel`: `gentle` / `supportive` / `deep`), selected synchronously by `pickCurated(emotion, strength)`. Because scoring must run at frame 0 before AsyncStorage resolves, `localHistory.ts` keeps an in-memory sync mirror (`getCachedLogsSync`); a cold cache safely yields Level 1. The current check-in is counted as a synthetic +1 when scoring. The client passes the coarse integer to `fetchAiResponse`/the Edge Function, which (Phase 2) branches the AI prompt by depth — Depth 1 = grounding + soft close (do not assume distress); Depth 2 = + gentle recognition of recurrence; Depth 3 = full four-part, warmest. Only the integer reaches the server — never history, counts, or identity.

There are **two** curated fallback layers, intentionally duplicated: the client `catalog.ts` (instant, offline-safe) and the Edge Function's own `CURATED` map (used when the AI is unset/fails/rejected so the function still returns HTTP 200). The function returns `source: "ai" | "curated" | "safety"`; the client only swaps when `source === "ai"` — a function-side curated reply is ignored because the client already shows one.

### Emotion Memory (Day 11C) — one soft pattern aside, derived, never stored

`src/features/history/memory.ts` (`deriveMemory`) returns **at most one** abstract "memory" phrase (or `null` — silence is the default) acknowledging a *pattern*, never what a feeling was about. It reads the same recent on-device log as `computeStrength` (via `getCachedLogsSync`, current check-in appended), is shown as a dim italic "whisper" line above the emotion echo in `app/response.tsx`, and is **never sent to the AI or server** — nothing new is stored (it's derived from existing `{emotion, createdAt}`). Five signals, selected by tone priority: `eased` (this feeling less frequent than the prior fortnight; suppressed for positive ids) → `returning` (reappears after a >14-day gap) → `consistent` (≥5 distinct check-in days in 10) → `varied` (≥4 distinct emotions in the week) → `balanced` (no single feeling ≥50% of recent check-ins). Recurrence of a *single* emotion is deliberately **not** a memory signal — the strength system already deepens the response for that; doubling it would read as observant rather than present. Safeguards: ≥5 total check-ins, suppressed at Strength Level 3, at most once per local day (first check-in only). Keep the `POSITIVE` list in sync with the catalog.

### Emotion catalog is the source of truth — and the three-file sync

`src/emotions/catalog.ts` defines `EmotionId` (a string-literal union) plus emoji, label, and curated responses, and **mirrors the README**. Emotion ids flow as route params (`/response?emotion=<id>`), into the Supabase `emotion` column, and into on-device history. Adding/renaming an emotion means updating this catalog **and** the Edge Function's `CURATED`, `EMOTION_GUIDANCE`, and `LABELS` maps (`supabase/functions/generate-support/index.ts`). These are separate files with no shared import and must be kept in sync by hand.

### Edge Function: three evaluated layers

`generate-support/index.ts` evaluates in order: (1) **safety pre-check** — crisis keywords in an optional `note` route to a fixed safety response and skip the AI (`note` is the only free text accepted and is used *only* for detection, never sent to the model); (2) **AI (Response Engine V2)** — Groq returns a structured response of up to four layers (grounding → recognition → reframing → gentle optional guidance + soft close), layers separated by a blank line, tone tuned per emotion, **how many layers chosen by the `strength` depth** (1 = grounding + close, 2 = + recognition of recurrence, 3 = full; default 3 when absent). The prompt is built **entirely server-side**: `label` + tuning are derived from `emotionId` via the `LABELS` / `EMOTION_GUIDANCE` allowlists, and the only other input is the coarse `strength` integer — so client free text never reaches the model (no LLM-proxy abuse) and an unknown id yields no AI call. `sanitizeAi()` then enforces the tone contract (strips emojis; rejects questions, exclamation marks, banned motivational-poster phrases, or anything over ~800 chars; **preserves the `\n\n` layer breaks**) and returns null on violation; (3) **curated fallback**. A Groq reply that stopped at the token cap (`finish_reason === "length"`) is treated as unusable: `askGroq` returns null, so a cut-off reply is never shown and the curated fallback is returned. Tone rules live in the prompt *and* are re-enforced in `sanitizeAi` — change both together. The client splits the response on blank lines and renders each layer with spacing.

### Crisis-safety layer (wired but dormant)

The live, user-reachable safety path is `app/help.tsx` — region crisis resources (Malaysia + an international directory in `src/features/safety/resources.ts`), linked from the home-screen footer next to `app/privacy.tsx`. Separately, `src/features/safety/crisis.ts` mirrors the Edge Function's keyword list and safety response; that keyword *hook* is **dormant** because the app has no free-text input today (emotion taps only). The moment any text field is added (journaling, a "say more" box), call `screenForCrisis(text)` **before** sending anything to the AI and show the safety response instead of a normal reply. Going live with the hook also requires region-specific crisis-line text and dedicated resource-linking UI. Keep `crisis.ts` and the Edge Function's `CRISIS_PATTERNS`/`SAFETY_RESPONSE` in sync.

**Soft crisis layer (Day 11B) — pattern-based support nudge, NOT a detector.** `src/features/safety/strain.ts` (`computeStrain`) reads a 14-day window of local history and marks `eligible` only for a *sustained, current* difficult pattern: a streak of ≥5 consecutive difficult days that includes ≥2 HEAVY (sadness/loneliness) check-ins, **or** difficult check-ins across ≥7 distinct days with high weighted volume. Heavy emotions (`HEAVY` in `src/features/history/categories.ts`) count double. It is **not** diagnosis/prediction/assessment — its only job is to make the existing `/help` resources easier to find. The thresholds favour sensitivity (a missed person costs more than an unneeded nudge for a soft, capped prompt); eligibility runs a few % of check-ins in the difficult-heavy simulation, but the **weekly frequency cap** is what governs the user-facing rate — the actual *shown* rate is ~1 appearance per heavy fortnight. The score is ephemeral (never stored, never sent to the AI/server). When eligible **and** the weekly frequency cap allows, `app/response.tsx` shows a quiet, dismissible card *below* the response: *"If things have been feeling especially heavy lately, support resources are always available."* → links to `/help`. The cap (`src/features/safety/supportPrompt.ts`) is the **only** new stored state — two timestamps (`lastShownMs`/`lastDismissedMs`), no score/emotion/label — gating once per 7 days, 14-day cooldown after a "Not now", cleared with history. Never alarming, never blocking, never changes the core flow. The shared `DIFFICULT`/`HEAVY`/`POSITIVE` groupings now live in `src/features/history/categories.ts` (imported by `strength.ts`, `memory.ts`, `strain.ts`) — keep them in sync with the catalog there.

### Data layer & privacy posture

Emotion history is **local-first**. `src/lib/localHistory.ts` stores logs in AsyncStorage under an anon key (`silentsupport.history.v1`) when signed out, and a per-user key (`silentsupport.history.<uid>`) when signed in. The local store is always the source of truth the UI reads (`app/history.tsx`, `src/features/history/insights.ts`). One further device-only key, `silentsupport.welcomeSeen.v1` (`src/lib/preferences.ts`), is a non-personal boolean for the one-time trust line on the home screen. The home screen reads the local log on mount (never awaited before paint) so the sync mirror used by `computeStrength` / `deriveMemory` / `computeStrain` is warm before the first tap.

Accounts are **optional** (Model B) and use **email OTP** (a 6–8 digit code; no password, no magic-link/deep-link) via Supabase Auth. `src/features/auth/SessionProvider.tsx` exposes the session and triggers the sign-in sync. **Signed out → nothing stored server-side** (the AI call still sends the emotion id + the coarse depth integer transiently, as the Privacy screen discloses). Signed in → `emotion_logs` (now with `user_id`, ownership RLS `auth.uid() = user_id`, migration `0003`) is the backup/sync target.

Sync (`src/lib/sync.ts`) is deliberately minimal — **no reconciliation engine, no offline queue**:
- **On sign-in / app foreground** (`syncOnSignIn`): snapshot the anon + per-uid stores, upsert them (ignore-dupes by `id`), pull the account's rows, then **merge** into the per-uid store *as it is now* (`mergeLocalLogs`) — never overwrite it with the pre-network snapshot, so a check-in saved while the sync is on the network survives. Then drop only the folded anon rows (`dropAnonLogs`; keeps the nudge cooldown and keeps the in-memory mirror on the account).
  Before any of that it asks the auth server (`getUser`). `user_not_found` (account deleted on another phone) → clear this phone's copy, then `signOut({ scope: 'local' })`, no upload. Any other definitive auth failure → stop. Network/5xx → carry on as before (offline never assumes deletion).
- **Per check-in when signed in** (`pushCheckIn`): best-effort append-only insert; skipped while a signed-in Clear History runs (the next sync uploads it).
- **Session ends without a sign-out here** (account deleted elsewhere, session revoked, refresh refused): auth-js emits `SIGNED_OUT` only for definitive ends, never for network errors. `SessionProvider` then calls `dropAccountCaches(null)`. At startup it calls `dropAccountCaches(current uid | null)`, but only when `getSession` returned no error. This removes every per-account copy except the current one and bumps the generation; the anon store is never touched. An account's history stays on a phone only while that account is signed in there.
- **Local store discipline** (`localHistory.ts`): every read-modify-write of a history key goes through one in-module queue (`serial`) — on-device I/O only, never a network call. Every clear (Clear History, sign-out, account deletion) bumps a **history generation**; a sync that started before the bump writes nothing (`mergeLocalLogs` returns false), so an older sync can never undo a clear.
- All writes (local and server) are fire-and-forget and **never throw** — comforting must not depend on storage or network.

RLS: `emotion_logs` has owner-scoped select/insert/update/delete for `authenticated`; **no anon policies** (signed-out clients have zero access). Destructive scopes: sign-out clears only the device cache and ends only this phone's session (`scope: 'local'`; the supabase-js default is global); "Clear history" is device-only when signed out and account-wide (server-first, tombstoned — below) when signed in.

**Signed-in Clear History (migration `0004`).** `clearAccountHistory` bumps the generation, snapshots the phone's ids (unreadable store → fail), and calls `public.clear_history(local_ids uuid[])` with a 10 s abort. That `SECURITY DEFINER` function (empty `search_path`; EXECUTE for `authenticated` only; scoped to `auth.uid()`) atomically, under a per-account advisory lock, records the account's row ids ∪ the phone's ids in `private.emotion_log_tombstones (user_id, log_id)`, deletes the account's rows, and returns the cleared ids. Only then does the phone remove exactly those ids (`removeLocalLogs`) — anything saved after the clear began stays; on failure/timeout nothing local changes and `history.tsx` shows "Couldn't clear history". **Stale-upload protection:** the `BEFORE INSERT` trigger `emotion_logs_skip_cleared` takes the same lock and silently drops any insert of a tombstoned `(user_id, id)`, so a delayed upload or another signed-in phone can't restore cleared rows, and a racing upload either commits first (and is cleared) or waits and is dropped. Tombstones hold only those two ids (no emotion, time, or text), live in the API-unexposed `private` schema (RLS on, no policies, no grants), cascade with `auth.users`, fall under the analytics policy's no-aggregation rule, and are disclosed on the Privacy screen. Other phones keep their local copy until cleared there (the dialog says so) but can't push it back.

**Applying database changes:** 0001–0003 were applied by hand; 0004 via the Supabase MCP `apply_migration` (live version `20261003124014`, the only migration-history row). Never `supabase db push` (0002 deletes every row). `.mcp.json` sets `skip_elicitations=apply_migration` because the VS Code client auto-declines Supabase's destructive-SQL confirmation (`execute_sql` keeps it).

**Testing sync/clear changes** (typecheck alone is not enough): cover a check-in during an online and an offline sync (offline pull retries ~7 s); Clear during a sync; failed and timed-out clear; successful clear; sign-out and account deletion during a sync; a check-in made during a clear; a late or other-phone upload of a cleared id; signed-out clear unchanged. Live DB checks: metadata queries, or a `DO` block ending in `RAISE` (full rollback) with fake `auth.users` rows — never read real users' `emotion_logs`. Parallel MCP `execute_sql` calls run sequentially, so real lock races need a second client. Account deletion is implemented: **Settings → Account → Delete account** calls the `delete-account` Edge Function (Verify-JWT on; identifies the caller via `getUser`, then service-role `admin.deleteUser`), which cascades to `emotion_logs`; the client then clears local caches and signs out. Deferred to a later phase: the `profiles` table. See `memory/product-direction.md`.

### Insights are rule-based only

`src/features/history/insights.ts` produces at most two soft reflections (low-energy stretch, time-of-day lean, most-frequent feeling, presence count) using plain thresholds. Never medical, never a diagnosis, never scoring — it reads like a friend noticing a pattern. Keep the `LOW_ENERGY`/`HEAVY` id groupings in sync with the catalog.

### Comfort mode & theme

`app/comfort.tsx` + `src/features/comfort/` is the breathing/grounding screen. `useBreathing` runs a single step-runner that advances both the phase label and the circle's scale value together (native-driver), so the word read always matches the motion seen. Tap toggles "silence" (strips all text, leaves the breath).

All styling pulls from `src/theme` (`colors`, `typography`) — no hardcoded colors/sizes in components, extend the theme instead. Dark-mode only (`app.json` → `userInterfaceStyle: "dark"`).

## Architecture constraint: no analytics, by design

**Silent Support does not include analytics by design.** Analytics is a *forbidden layer*, not an
unbuilt feature — there is no local or remote metrics system, and none may be added. **All behavioral
signals are either local UI features or non-existent**: `deriveMemory`, `computeStrain`, and history
`insights` are computed on-device, shown to the user, and never logged, exported, or transmitted.
`computeStrength` is computed on-device and never shown; only its coarse 1–3 level leaves the phone,
with the emotion id, in the transient AI request, which our code never stores. There is no third
category. No analytics/attribution/ads/crash SDKs, no
telemetry endpoints, no event/session/usage logging (local or remote), no identifiers in any log or
request. The single external touchpoint is OS-level, tester-consented platform crash reporting
(TestFlight / Play Vitals) — never an in-app SDK. **The server-side `emotion_logs` backup must NEVER
be aggregated, sampled, or queried for product insight** — it exists solely for a user's own
sync/restore (and deletion cascade); doing otherwise would break the "we don't read / don't profile"
promise without any SDK. Full rules and the explicit never-track list: `docs/privacy/analytics-policy.md`.
Reject any change that reintroduces metrics. This is a permanent boundary.

## Product guardrails

This is a deliberately constrained solo-mode MVP. The AI is a calm presence, **not** a therapist/coach/chatbot. Since **Response Engine V2** it answers as a **four-layer structured presence** (grounding → recognition → reframing → gentle *optional* guidance), tone-tuned per emotion — calm, no questions, no exclamation marks, no emojis, no clinical language (enforced in both the Edge Function `SYSTEM_PROMPT` and `sanitizeAi`). Curated responses follow the same four-layer shape and are the instant, offline default. No social features, messaging, notifications, gamification, or health-style charts/scoring. When adding features, default to the lower-friction, more private option.
