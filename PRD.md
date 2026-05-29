# Niyet — Product Requirements Document

> **نية — niyet · "intention"**
> Bedeninin atacağı bir sonraki adımı gösterir.
> *(It shows you the next step your body takes.)*

| | |
|---|---|
| **Version** | 2.0 |
| **Date** | 2026-05-29 |
| **Status** | Ready for implementation |
| **Stack** | Vite · React · Supabase · Cloudflare Pages (PWA) |
| **Domain** | niyet.burakgizlice.com |
| **UI language** | Turkish (Arabic calligraphy is a visual motif only) |

This document supersedes the original `NextStep_PRD.docx`. The product was renamed **Niyet**, re-themed to deep emerald + Islamic calligraphy, and PWA/offline support was promoted from a later phase into v1.

---

## 1. Origin Story

This product was not designed in a boardroom. It was designed by a person with severe ADHD who was paralysed, in conversation with an AI that listened.

The user was already using the Taskwarrior CLI to manage tasks at sub-atomic granularity — *"just go to the bathroom (for wudhu)", "bring water", "drink water", "go stand before the prayer mat"* — not because they wanted to, but because executive dysfunction demanded it. The problem was never that the tasks were hard. The problem was that the tooling added friction on top of an already paralysed brain:

- A terminal CLI requires cognitive mode-switching.
- A homogeneous flat list intimidates — it looks like a wall.
- Writing more than a few steps ahead is impossible in a deep-low state.
- Seeing the full list triggers avoidance, not action.

**Niyet** is named for the Islamic concept of *niyyah* — the intention formed before an action. In deep executive dysfunction, the only valid question is: *what is the next physical movement your body makes?*

### 1.1 Principles discovered

- **Three is the maximum** visible task count before a list becomes a wall (Niyet allows 1/2/3/5, defaulting to 1).
- In deep-low states the system must be **dumber, not smarter** — one physical action at a time.
- **Behavioural chaining**: recurring sequences (salah prep, morning anchor, focus block) should be **one decision, not seven**.
- The tool itself becomes a procrastination vector — configuring Taskwarrior instead of making wudhu. Niyet must resist becoming a configuration rabbit hole.
- **Dopamine at completion** (sound + animation + growing fire) reinforces the behaviour loop.

### 1.2 Existing landscape

| App | What it does | Gap vs Niyet |
|---|---|---|
| One & Three | 1 main + 3 tasks/day, daily reset | No sequential queuing or chains |
| Llama Life | Single-focus timer | Timer-based, not a body-movement queue |
| Forget | Floating banner with one current task | No chains, no micro-step queuing |
| Goblin Tools | AI breaks tasks into micro-steps | No queue, no saved rituals, no dopamine loop |
| Taskwarrior CLI | Full terminal task manager | Too much friction in a deep-low state |

The specific combination of **pre-saved chains + single-step drip queue + dopamine reward loop** does not exist in any current product.

---

## 2. Product Vision

### 2.1 One-line

Niyet shows you one physical action at a time, lets you pre-load recurring rituals as single-tap chains, and rewards every completion with sound, animation, and a growing fire — designed for the moments when your brain cannot hold a list.

### 2.2 Design principles

- **Minimum visible information** — one action by default, never forced beyond what you choose.
- **Zero configuration in deep-low state** — pre-built chains launch with one tap.
- **The body, not the mind** — tasks are framed as physical movements.
- **Instant dopamine** — sound + particle burst + growing fire on completion.
- **No guilt architecture** — no overdue items, no due dates, no streaks that shame. Stopping is allowed.
- **Cross-device continuity** — the same queue on phone and desktop, *when you choose to sign in*.
- **Frictionless first run** — the app works immediately, with no account, for anyone who arrives from the video.

### 2.3 Target user

- **Primary:** the author, and adults with ADHD (diagnosed or suspected) experiencing executive dysfunction, particularly in low-dopamine or high-stress states.
- **Secondary:** anyone with anxiety, depression, autism, chronic fatigue, or burnout who experiences task-initiation paralysis.

The product is built around Islamic daily practice (salah preparation as a flagship chain) but the chain system is fully generic. UI copy is Turkish.

### 2.4 Distribution intent

Primarily a personal tool. The author plans a YouTube video about fighting executive dysfunction and finding *"the sweet spot between an effective atomised task list and a giant wall of tasks."* After the video, the live app at `niyet.burakgizlice.com` is open for anyone to use — hence anonymous-first design.

---

## 3. Feature Specification

### 3.1 Core Queue

**Single-step view (default)**
- Display exactly **one** task at a time, filling the screen — large calm text, no chrome.
- A visible count selector lets the user switch to **1 / 2 / 3 / 5** visible tasks (default **1**).
- When more than one is shown, secondary tasks render progressively smaller and dimmer (clear hierarchy, never competing).
- Below the visible cards: **`+N adım sırada`** — a count, not a list.

**Task completion**
- Tap the circular checkbox to complete.
- Checkmark draws itself on the circle (SVG `stroke-dashoffset` animation, ~300ms).
- A glow ring pulses on the checkbox at the moment of completion.
- The card slides and fades out: `translateX(80px) + opacity 0 + scale(0.95)`, ~500ms `cubic-bezier(.4,0,.2,1)`.
- The next task slides in from below.
- **The completion animation plays BEFORE the state update** (≈500ms delay), so the reward is felt, not skipped.

**Empty states**
- Empty and nothing done: *"Sırada bir şey yok — bir adım ekle ya da bir zincir yükle."*
- Empty after completing tasks: *"Sıra temiz. Başardın. Başka bir zincir yükle ya da dinlen — bunu hak ettin."*

### 3.2 Dopamine Reward System

**Tick sound** (Web Audio API — synthesised on device, no audio files, zero latency, offline-capable). Three layers, **never simplified to one**:
- Layer 1 — sharp click oscillator (~1800→2400 Hz, ~80ms)
- Layer 2 — warm rising sine tone (~880→1320 Hz, ~300ms)
- Layer 3 — high sparkle oscillator (~3200→4200 Hz, ~350ms)

**Celebration particle burst**
- 18 emoji particles explode outward from the centre of the screen.
- Emoji set: ⭐ ✨ 🌟 💫 🎉 🚀 💎 🔥 🌙 ⚡
- Each particle: randomised angle, speed, spin, size, delay.
- CSS keyframes: `0% scale(0.3) → 15% scale(1.1) → 100% scale(0.5)` + fade, ~1.4s with staggered delays.
- **Trigger:** every **3rd** completion (`done.length % 3 === 0`) **OR** when the queue becomes empty.

**Fire counter (streak)**
- Counts completions since the last **"Temizle"** (clear), i.e. a **session streak** — no date logic.
- A **flame that grows** as the count rises (size/intensity scales with the streak).
- Copy: *"`{n}` küçük şey yaptın! 🔥"* in the header, with a subtle pulse animation.
- Milestone labels (Turkish): 3+ *"Güzel gidiyor"*, 5+ *"Devam et!"*, 7+ *"Alev aldın!"*, 10+ *"Durdurulamazsın 🔥"*.
- **Resets on "Temizle"** — intentional, no shame for stopping.

### 3.3 Chains (Ritual Sequences)

A **chain** is a named, reusable sequence of steps. Loading a chain **appends** all its steps to the current queue in order — it does **not** replace the queue. It converts *N decisions* into *one decision*.

**Default chains (shipped with the app — 7 total).** Steps are Turkish:

| Chain | Emoji | Steps |
|---|---|---|
| Namaz Hazırlığı | 🕌 | banyoya git (abdest için) → abdest al → odana su getir → su iç → seccadenin önünde dur |
| Odak Bloğu | 🔬 | zamanlayıcıyı aç → 15 dk başlat → proje notlarını aç → sadece ilk sayfayı oku → tek bir iş seç |
| Sabah Demiri | ☀️ | yatakta doğrul → ayaklarını yere koy → ayağa kalk → banyoya yürü → yüzünü soğuk suyla yıka |
| Abdest | 💧 | elleri yıka → ağza su ver → buruna su ver → yüzü yıka → kolları yıka → başı mesh et → ayakları yıka |
| Uyku Hazırlığı | 🌙 | telefonu bırak → diş fırçala → ışıkları kapat → yatağa gir |
| Evi Topla | 🧹 | bir yüzeyi temizle → çöpü topla → bulaşığı koy → tek bir çeki düzen |
| Güne Başlama | ☕ | su iç → bugünün tek önceliğini seç → ilk küçük adımı at |

**Chain management** (separate screen, to keep the main queue calm)
- Create: name, emoji, steps (one per line, textarea).
- Edit existing chains.
- Delete chains (with confirmation).

### 3.4 Add Steps

- Textarea: one step per line.
- **Cmd/Ctrl + Enter** submits.
- Lines are appended to the queue in order.
- Returns to the main view on submission.

### 3.5 Done Log

- Completed tasks logged with a timestamp.
- Shown below the queue in reverse-chronological order, struck through in a muted colour.
- **"Temizle"** button resets the log **and** the fire/streak.
- Intentionally non-prominent — success is visible but not the focus.

---

## 4. Technical Architecture

### 4.1 Stack overview

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React (Vite) | Component model, fast dev, SPA build |
| Styling | Inline styles + CSS vars | Portable, no extra build step |
| Audio | Web Audio API | Zero latency, no files, offline |
| Local storage | localStorage | Source of truth; instant, offline-first |
| Database | Supabase (Postgres) | Sync, free tier, Auth built in |
| Auth | Supabase Auth | Magic link **and** Google OAuth |
| Hosting | Cloudflare Pages (SPA) | Free, global CDN, GitHub auto-deploy |
| App delivery | PWA (manifest + service worker) | Installable, offline launch — **core in v1** |

### 4.2 Account model — anonymous-first

- The app is **fully usable with no login** (localStorage only). Frictionless for first-time visitors from the video.
- A **"Cihazlar arası eşitle"** ("sync across devices") action triggers sign-in via **magic link** or **Google OAuth**.
- No data is lost on sign-in — local data is merged up (see §4.4).

### 4.3 Supabase schema

Row-Level Security enabled on **every** table; policy: a user may `SELECT/INSERT/UPDATE/DELETE` only rows where `user_id = auth.uid()`. The anon key is safe to expose in the client — RLS enforces isolation.

**`profiles`**

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | references `auth.users.id` |
| created_at | timestamptz | auto |
| show_count | int2 | default 1 (visible-task preference) |

**`queue_items`**

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | `gen_random_uuid()` |
| user_id | uuid (FK) | → profiles.id, cascade delete |
| text | text | the task text |
| position | int4 | ordering within queue (0-indexed) |
| created_at | timestamptz | auto |

**`chains`**

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | `gen_random_uuid()` |
| user_id | uuid (FK) | → profiles.id, cascade delete |
| name | text | display name |
| emoji | text | single emoji |
| steps | text[] | ordered step strings |
| position | int4 | order in chains list |
| is_default | bool | true for shipped chains |
| created_at | timestamptz | auto |

**`done_items`**

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | `gen_random_uuid()` |
| user_id | uuid (FK) | → profiles.id, cascade delete |
| text | text | completed task text |
| completed_at | timestamptz | when ticked |
| chain_id | uuid (nullable FK) | if completed as part of a chain |

### 4.4 Storage & sync strategy — local-first overlay ("Approach A")

- **localStorage is the source of truth at all times.** Every read/write hits it first → instant, fully offline.
- **Anonymous users**: localStorage only; default chains come from a local seed constant.
- **On sign-in (merge-on-login):**
  - Push local data up to Supabase.
  - Merge remote + local: dedupe `queue_items` and `done_items` by `text + timestamp`; dedupe `chains` by `name`.
  - Result becomes the synced state and is written back to localStorage.
  - First-ever authenticated sign-in seeds the 7 default chains for that user (skip if already present).
- **While authed**: optimistic local write first → then Supabase upsert/delete.
- **Offline while authed**: keep writing localStorage; flush pending changes to Supabase on reconnect.
- **Conflict resolution**: `show_count` is last-write-wins; queue order is determined by the `position` column.
- **Realtime multi-device sync is explicitly Phase 2**, not v1.

### 4.5 Auth flow

- The header exposes a "Cihazlar arası eşitle" affordance (and an optional auth screen).
- Sign-in: magic link **or** Google OAuth.
- Session persisted via the Supabase client (localStorage).
- Logged-out state works fully; no data loss when later signing in (merge per §4.4).
- Add the production domain to **Supabase Auth → URL Configuration → Redirect URLs**.

### 4.6 PWA

- Web App Manifest: name "Niyet", emerald `theme_color`/`background_color`, maskable icons, `display: standalone`.
- Service worker caches the app shell for offline launch (cache-first for the shell, network-first for Supabase calls with localStorage fallback).
- "Ana ekrana ekle" installability on iOS, Android, and desktop.

### 4.7 Cloudflare Pages deployment

- Repository on GitHub; connect in Cloudflare Pages.
- Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
- SPA fallback so client routing/refresh resolves to `index.html`.
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Custom domain: `niyet.burakgizlice.com`.
- Auto-deploy on push to `main`; preview deployments on PRs.

---

## 5. UX & Design Language

### 5.1 Visual identity

- **Base theme:** deep emerald **dark** — emerald/forest gradient background.
- **Accents:** gold, used for the calligraphy wordmark, the fire/streak, and active states.
- **Calligraphy:** Arabic calligraphy of "niyet/نية" used as a visual motif (wordmark and/or faint watermark). It is decoration, never content. UI copy stays Turkish.
- **Detailed visual treatment** (exact hex values, calligraphy placement/opacity, typography pairing, iconography) is **deferred to the build/design phase** — to be decided iteratively against live screens rather than fixed here. Constraint: it must always respect *minimum visible information* and never let decoration compete with the current task.

### 5.2 Motion

- Task exit: `translateX(80px) + opacity 0 + scale(0.95)`, ~500ms `cubic-bezier(.4,0,.2,1)`.
- Checkmark draw: SVG `stroke-dashoffset`, ~300ms ease-out.
- Glow ring: `box-shadow` pulse, ~500ms ease-out.
- Particle burst: 18-particle CSS keyframe explosion, ~1.4s, staggered.
- Fire/streak: scale pulse, ~2s ease-in-out infinite; flame grows with the streak.
- **Principle: motion is reward, not decoration.** Every animation is tied to a user action.

### 5.3 Mobile considerations

- Max container width ~480px, centred.
- Tap targets ≥ 44px (checkbox 28px with padding).
- Font sizes large enough to read without zooming.
- No hover-only interactions.
- PWA install is supported in v1.

---

## 6. Screen Map

| Screen | Contents |
|---|---|
| Main (Queue) | Header + fire/streak · visible-count toggle (1/2/3/5) · task cards · action bar (Ekle / Zincirler · Eşitle) · done log |
| Add Steps (Ekle) | Back button · textarea (one per line) · submit |
| Chains (Zincirler) | Back button · chain list (tap to load, edit, delete) · "Yeni zincir" |
| Chain Edit | Back button · name · emoji · steps textarea · save |
| Auth / Sync | Optional. Magic-link input or Google button. Tagline. No password. |

**Navigation model:** no persistent nav bar — context-specific back buttons only. View held in React state: `'main' | 'add' | 'chains' | 'chain-edit' | 'auth'`. No routing library needed for v1 (SPA fallback handles refresh).

---

## 7. Implementation Notes

### 7.1 Project setup

```
npm create vite@latest niyet -- --template react
npm install @supabase/supabase-js
```
`.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
`src/lib/supabase.js`: initialise the Supabase client from env vars.

### 7.2 Component structure

- `App.jsx` — auth state, view router between screens.
- `components/Queue.jsx` — main queue view, task cards, completion logic.
- `components/AddSteps.jsx` — textarea for adding steps.
- `components/Chains.jsx` — chain list view.
- `components/ChainEdit.jsx` — chain create/edit form.
- `components/CelebrationBurst.jsx` — particle animation.
- `hooks/useQueue.js` — queue CRUD over the local-first layer.
- `hooks/useChains.js` — chains CRUD + default seed logic.
- `lib/storage.js` — localStorage source-of-truth layer.
- `lib/sync.js` — Supabase push/pull + merge-on-login.
- `lib/audio.js` — `playTickSound()` (Web Audio API, three oscillators).

### 7.3 Key behaviours to preserve

- Completion animation plays **before** the state update (≈500ms delay).
- Celebration burst triggers on `done.length % 3 === 0` **OR** queue becomes empty.
- Tick sound uses **three** layered oscillators — do not simplify to one.
- Loading a chain **appends** to the queue — never replaces.
- `show_count` persists (localStorage always; `profiles.show_count` when authed).
- Empty-state copy differs based on whether `done.length > 0`.
- The fire/streak grows with the count and resets only on "Temizle".

### 7.4 Backend setup

- Create tables in Supabase (SQL editor or CLI).
- Enable RLS on all tables immediately; create policies before any data operations.
- Enable Google OAuth and magic-link in Authentication → Providers.
- Add `niyet.burakgizlice.com` (and the `*.pages.dev` preview) to Auth redirect URLs.

---

## 8. Phased Roadmap

**Phase 1 — MVP (this build)**
- All of §3 (queue, dopamine, chains, add, done log).
- Supabase schema + RLS + magic-link/Google auth.
- Anonymous-first localStorage with merge-on-login sync (§4.4).
- PWA (manifest + service worker, installable, offline launch).
- Cloudflare Pages deploy at `niyet.burakgizlice.com`.
- Mobile-responsive, deep emerald + calligraphy theme.

**Phase 2 — Friction reduction**
- Supabase Realtime: live multi-device queue sync.
- Haptic feedback on completion (`navigator.vibrate`).
- Swipe-to-complete gesture.
- Always-visible quick-add button.

**Phase 3 — Intelligence**
- AI chain generator: describe a routine → AI splits it into steps.
- Time-of-day chain suggestions (e.g. Sabah Demiri prompted in the morning).
- "Emergency mode": one tap → absolute minimal fullscreen, one action, no chrome.

**Phase 4 — Community (optional)**
- Public chain library: share/import chains.
- Curated Islamic practice chain pack (salah, dhikr, daily routines).

---

## 9. Non-Goals (v1)

- Due dates or scheduled tasks — this is a *now-queue*, not a planner.
- Push notifications — permission friction.
- Collaboration / shared queues.
- Priority levels — everything in the queue is the next thing.
- Time tracking or Pomodoro timers — separate concern (the user uses an egg timer).
- Light/dark toggle — the emerald dark theme is intentional.
- Native iOS/Android apps — the PWA covers mobile.
- Prayer-time integration — out of scope for v1.
- AI chain generation — Phase 3.

---

## 10. Success Metrics

For a personal tool, success is qualitative first, in order:

1. The user opens Niyet in a deep-low state and completes at least one task.
2. The Namaz Hazırlığı chain is used daily without being re-typed.
3. The queue syncs seamlessly between desktop and phone after sign-in.
4. The app does **not** become a procrastination tool itself (no configuration rabbit holes).

If it scales beyond personal use:
- Completion rate (tasks completed / added), target > 60%.
- Chain usage (% of completions that came from a chain).
- Retention (DAU / registered users), target > 40% for a tool this niche.

---

*Niyet — from the principle that in deep executive dysfunction, the only valid question is: what is the next physical movement your body makes?*
