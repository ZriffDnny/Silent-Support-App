# Silent Support — Screenshot Plan

Six portrait screenshots (dark theme — `#0E0F1A` canvas, serif headlines mirroring the in-app
typography). Each panel pairs a real screen with one short overlay headline + subheadline. Keep
overlays calm and claim-free: companion, never therapy/treatment/diagnosis.

**Visual system (all panels)**
- Background: app canvas `#0E0F1A`; ink `#E8E5DC` (primary), `#81818F` (muted).
- Headline: serif (Georgia), large, top third. Subheadline: sans, muted, directly beneath.
- Show the real device frame; avoid clutter, avoid fake data that implies distress severity.
- One accent only (`#7C8BB3` whisper blue) — no loud gradients, matching the app's restraint.

---

## 1. The check-in grid (hero)
- **Purpose:** show the core action instantly — tap a feeling, nothing to type.
- **Headline:** How are you feeling?
- **Subheadline:** No need to explain. Just choose.
- **Composition:** Home screen (`app/index.tsx`) with the emotion grid centered; headline overlaid
  above the grid. Calm, generous spacing. This is the first impression — lead with it.

## 2. The calm response
- **Purpose:** show that comfort arrives the moment you tap — presence, not a chatbot.
- **Headline:** A calm reply, the moment you tap.
- **Subheadline:** Presence, not a chatbot.
- **Composition:** Response screen (`app/response.tsx`) showing a gentle, multi-line response with
  the emotion echo at top. Use a neutral feeling (e.g. "Overthinking") so it doesn't imply crisis.

## 3. Comfort Mode (breathing)
- **Purpose:** show the breathing space for when words are too much.
- **Headline:** Breathe, when words are too much.
- **Subheadline:** A quiet space, with optional ambient sound.
- **Composition:** Comfort Mode (`app/comfort.tsx`) mid-breath, the circle expanded, phase word
  ("Breathe in") visible. Dark and still.

## 4. Privacy
- **Purpose:** make the privacy promise unmissable — the key differentiator.
- **Headline:** Your check-ins stay on your phone.
- **Subheadline:** No ads. No tracking. No account needed.
- **Composition:** Stylized lock / device motif, or the Privacy screen header. Keep it textual and
  trustworthy, not techy. (Wording matches the in-app Privacy screen.)

## 5. Gentle history
- **Purpose:** show the private look-back without implying analytics or scoring.
- **Headline:** Look back, gently.
- **Subheadline:** A private record, just for you.
- **Composition:** History screen (`app/history.tsx`) with a few grouped check-ins and the soft
  "Looking back" reflections card. Include the caption "These notes are worked out on your phone
  and never leave it." in-frame if it reads cleanly.

## 6. Help is always there
- **Purpose:** reassure that support resources are one tap away (non-clinical framing).
- **Headline:** Help is always one tap away.
- **Subheadline:** Support resources, whenever it's heavy.
- **Composition:** Help screen (`app/help.tsx`) showing resource cards. Do not imply the app detects
  or diagnoses crisis — frame as always-available resources.

---

## Optional closing card
- **Headline:** Check in. Breathe. Let go.
- **Composition:** Wordmark on the dark canvas, maximal whitespace.

## Production notes
- Required sizes — Apple: 6.7" (1290×2796) and 6.5"/5.5" as needed; iPad 12.9" if `supportsTablet`
  stays true (it is, in `app.json`). Play: phone (min 2), 7" and 10" tablet recommended, plus a
  1024×500 feature graphic.
- Localize headlines if/when the listing is localized.
- Avoid before/after "mood improvement" claims or anything implying treatment outcomes.
