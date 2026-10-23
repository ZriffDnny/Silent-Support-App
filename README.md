# Silent Support

A private emotional space that helps you express feelings when you don’t have the energy to explain them.

## 🧠 Vision

Silent Support is built for moments when emotions feel heavy, but words feel impossible.

Instead of typing long messages or talking to someone, you simply tap how you feel — and receive calm, grounding support instantly.

No conversations.
No social pressure.
No explanations required.

Just emotional release → gentle response → quiet recovery.

---

## 💡 Core Idea

One tap is enough.

You select how you feel:

- 😔 Bad Day
- 🌧 Feeling Low
- 😴 Emotionally Exhausted
- 💭 Overthinking
- 🫂 Need Comfort
- 🌱 Need Encouragement
- ❤️ Lonely
- ⚡ Anxiety Spike

The app responds with:

- A calm, validating message
- Optional breathing or grounding exercise
- A safe space to pause

---

## 🎯 Problem

When people feel overwhelmed, they often cannot:

- Explain what’s wrong
- Talk to others
- Form full sentences
- Ask for help

Silent Support removes the need for explanation.

---

## 🧘 Target Users

- People with anxiety
- Emotionally overwhelmed users
- Introverts
- People dealing with loneliness
- Anyone experiencing emotional burnout
- Users who struggle to express feelings

---

## ✨ Core Features

### 1. Emotional Tap System

One-tap emotion selection.

No typing required.

---

### 2. AI Emotional Companion

A calm presence that responds with:

- Validation
- Presence
- Emotional grounding

Not a therapist.
Not a coach.
Not a chatbot.

Just a steady presence.

**Presence over intelligence.** A gentle, human-written message appears the instant you tap — never a loading spinner. The AI works quietly in the background; if it answers in time, it softly deepens the response, and if it’s slow or unavailable, the written one simply stays. You always get something calm, instantly, even offline.

---

### 3. Comfort Mode

A dedicated calm screen with:

- Breathing animation (inhale · hold · exhale)
- Grounding prompts
- Optional ambient sound
- Silence mode (one tap strips everything away but the breath)
- Gentle reset experience

---

### 4. Emotion History

A soft, private record of how you’ve felt:

- What you felt and when
- A gentle “lately” summary and light, rule-based reflections
- Filter by feeling

This is an emotional mirror, **not** a health tracker — no charts, scores, diagnoses, or labels.

---

## 🔒 Privacy

Privacy is the product, not a setting.

- **Local-first.** Your emotion history lives only on your device, never on our servers. To write a response, only the feeling you tapped and a 1-to-3 depth number pass through our server to the AI provider, and we don't keep them.
- **No account.** There's nothing to sign up for, and no email is asked for. Because there's no cloud copy, uninstalling the app or losing the phone erases the history for good. (Optional email sign-in with backup and sync is built but switched off — `ACCOUNTS_ENABLED` in `src/lib/features.ts` — until it can be offered at no cost.)
- **You own your data.** Clear your history any time from the History screen.
- **No tracking.** No third-party analytics SDKs.

---

## 🧠 AI Philosophy

The AI must always:

- Validate before anything else
- Stay short and calm
- Avoid advice unless asked
- Avoid overwhelming the user
- Never judge or analyze deeply

Example responses:

- “That sounds heavy. I’m here with you.”
- “You don’t need to explain this right now.”
- “Let’s slow down for a moment.”

These rules are enforced on both sides: a constrained prompt, and a server-side check that strips anything off-tone (advice, questions, emojis, toxic positivity) before it ever reaches you.

---

## 🆘 Safety

A built-in **Help** screen links crisis resources (Malaysia plus an international directory). Silent Support is a moment of calm, not a substitute for professional or emergency help.

---

## 🛠 Tech Stack

### Mobile
- React Native (Expo, expo-router)
- TypeScript (strict)

### Backend
- Supabase — Edge Functions (Deno) for the AI step; Auth (email OTP) and Postgres + Row-Level Security for the optional backup, which is switched off in the public release

### AI
- Groq (OpenAI-compatible API), called from a Supabase Edge Function

---

## 🧱 Current Scope

This is a SOLO MODE app.

There are:

❌ No friends
❌ No messaging
❌ No social features
❌ No notifications
❌ No gamification

Only:

✔ Emotional expression
✔ Instant grounding response (curated, with optional AI depth)
✔ Private, local-first emotional tracking
✔ No account needed (optional backup & sync is built but switched off)

---

## 🎯 Product Goal

To become the easiest way for someone to say:

> “I don’t feel okay”  
without needing to explain why.

---

## 🚀 Status

Active development — the core solo loop (tap → instant response → comfort mode), private on-device history, and safety resources are in place. Optional accounts (email sign-in, backup and sync) are built but switched off for the public no-account release.
