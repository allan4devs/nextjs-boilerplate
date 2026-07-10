# Xtreme Gym — Product Strategy: Retention, Gamification & Commitment

**Date:** 2026-07-10 · **Status:** Proposal · **Scope:** Member app, landing site, admin panel

---

## 1. Where the app stands today

The codebase is further along than it feels. What exists:

| Area | Status | Where |
|---|---|---|
| Daily streak calculation | ✅ Working (`computeStreak`) | `lib/xtreme/shared.ts` |
| PIN login + access codes | ✅ Working | `app/api/xtreme/pin/route.ts` |
| Check-in + live occupancy (cap. 85) | ✅ Working | `app/api/xtreme/checkin/route.ts` |
| PayPal checkout (5 plans, CRC/USD) | ✅ Working | `app/api/xtreme/checkout/*`, `catalog.ts` |
| Class reservations (4 trainings) | ✅ Working | `app/api/xtreme/reservations/route.ts` |
| Admin panel (members, plans, payments) | ✅ Working, 2 roles | `app/admin/page.tsx` |
| Body metrics + training plans | ✅ Working | `MemberDoc` in `shared.ts` |
| Email (Resend) | ⚙️ Wired, underused | `lib/helpers/email.ts` |
| PWA manifest | ⚙️ Present, no install prompt / push | `app/manifest.ts` |
| Badges / XP / levels | ❌ Missing | — |
| Profile self-service settings | ❌ Missing (admin-only edits) | — |
| Email lifecycle (welcome, streak-risk, win-back) | ❌ Missing | — |
| WhatsApp as primary CTA | ⚠️ Everywhere (`wa.me` in site.ts, header, footer, contacto, preguntas, checkout) | `app/lib/site.ts:28` |

**The core problem is not missing infrastructure — it's a missing retention loop.** The member records a workout and… nothing happens. No reward, no variable surprise, no reason to come back tomorrow beyond willpower.

---

## 2. The retention model (why people open Facebook daily and not gym apps)

Every habit-forming product runs the same loop (Hook Model):

1. **Trigger** — external (email/push: "Tu racha de 6 días está en riesgo 🔥") or internal (boredom, guilt, pride).
2. **Action** — the simplest possible action: open app → one-tap check-in.
3. **Variable reward** — sometimes a badge, sometimes a milestone, sometimes a motivational phrase, sometimes nothing. Unpredictability is what makes it sticky.
4. **Investment** — the user puts something in (streak, XP, body metrics, a paid reservation) that increases the cost of leaving.

**Design principle for every feature below:** each gym visit must produce a visible, emotional payoff in under 3 seconds of opening the app, and each absence must produce a gentle, recoverable loss signal.

The second lever is **commitment psychology**: a person who *pre-pays* a class via PayPal shows up at ~2–3× the rate of one who "reserves by WhatsApp." Money down = sunk cost = attendance. That's why PayPal-first booking is a retention feature, not just a payments feature.

---

## 3. Priority 1 — Gamification core

### 3.1 Streaks 2.0 (upgrade `computeStreak`)

Current streak is binary and brutal: miss one day → 0. That *demotivates* (users who lose a 30-day streak often churn entirely). Changes:

- **Weekly-goal streaks, not daily.** Member sets a goal (e.g., 4×/week). Streak = consecutive weeks hitting the goal. Realistic for a gym (rest days are healthy — daily streaks fight physiology).
- Keep the daily counter as a secondary "días seguidos" stat for the hardcore.
- **Streak freeze ("Protector de racha").** 1 freeze earned per 7 completed workouts, max 2 banked. Auto-consumed on a missed day. Duolingo's single highest-retention mechanic.
- **Streak repair window.** Missed yesterday? A check-in before 10am today restores it (grace logic in `computeStreak`).
- **Milestones with celebration:** 3, 7, 14, 30, 60, 100, 365 days / 4, 12, 26, 52 weeks. Full-screen confetti + shareable card (image with gym branding — free Instagram marketing).
- **Streak-at-risk state** rendered prominently: "🔥 6 días — entrena hoy antes de las 10 pm para no perderla."

### 3.2 Badges (new system)

**Data model** (new collection `xtreme_gym_badges` + `earnedBadges` array on `MemberDoc`):

```ts
type BadgeDef = {
  id: string; name: string; description: string;
  icon: string;               // emoji or asset path
  tier: "bronze" | "silver" | "gold" | "platinum";
  rule: { type: "streak_days" | "streak_weeks" | "total_workouts" | "checkins_before_hour"
        | "class_count" | "plan_completed" | "metrics_logged" | "payment_plan" | "manual";
        threshold?: number; params?: Record<string, unknown> };
  secret?: boolean;           // hidden until earned → variable reward
  active: boolean;
};
type EarnedBadge = { badgeId: string; earnedAt: string; seen: boolean };
```

**Launch catalog (~20 badges):**

- *Constancia:* Primera Visita, Racha 7/30/100, 10/50/100/250 entrenos, Mes Perfecto (hit weekly goal 4 weeks straight).
- *Horario:* Madrugador (10 check-ins before 7am), Búho (10 after 8pm), Guerrero de Lunes (8 Mondays in a row).
- *Clases:* Xtreme Core ×10, HIIT ×10, Probé Todo (all 4 trainings), Glute Lab Regular.
- *Progreso:* Primera métrica corporal, 12 semanas midiendo, Plan Completado.
- *Compromiso:* Miembro Fundador (manual), Plan Anual, Renovación ×3.
- *Secretos (2–3):* e.g., check-in on your birthday, train on Dec 25.

**Awarding engine:** a pure function `evaluateBadges(member, event)` called from the check-in, workout, reservation, and payment routes. Newly earned badges are returned to the client → celebration modal on next app open (`seen: false`).

### 3.3 XP & levels

- XP: check-in 10, completed workout 25, class attended 40, plan-day completed 15, metric logged 10, weekly goal met 100 bonus.
- Levels with gym-culture names: Novato → Regular → Comprometido → Beast → Xtreme → Leyenda (thresholds ~0/250/1000/3000/8000/20000).
- Level shown next to avatar everywhere (app header, admin). Level-up = celebration screen.
- **Later (Phase 3):** monthly XP leaderboard (opt-in, first-name only) — leagues create the strongest comeback trigger but need enough active users first.

### 3.4 Motivational phrases

- ~120 phrases in `lib/xtreme/phrases.ts`, bucketed by context: post-check-in, streak-at-risk, milestone, comeback ("Volviste. Eso es lo que importa 💪"), rest-day, morning/evening.
- Deterministic pick by `hash(memberName + date + context)` — feels personal, no repeats on the same day, zero infra.
- Shown on the app home card and inside celebration modals. Tone: Costa Rica, tuteo, gym slang, short.

### 3.5 Home screen redesign (the "daily dashboard")

Order matters — first paint must answer "¿cómo voy?" instantly:

1. Greeting + phrase of the day + level/avatar.
2. **Streak ring** (big, animated) + weekly-goal progress (3/4 esta semana).
3. One-tap primary action: "Registrar entrenamiento de hoy" (giant button).
4. Next reserved class (or CTA to reserve one → PayPal).
5. Latest badge + nearest badge in progress ("Te faltan 2 entrenos para HIIT ×10").
6. Mini progress chart (weight/waist trend from `bodyMetrics`).

**Micro-interactions:** confetti on milestone, ring fill animation on check-in, haptic-style button feedback, count-up numbers. This is where "feels like a game" lives — CSS/`@keyframes` only, no heavy libs.

---

## 4. Priority 2 — PayPal-first booking + landing CTAs

### 4.1 Reorient the funnel: WhatsApp → PayPal

WhatsApp = zero commitment, manual admin work, no data. Keep it only as a support channel.

- **Landing hero:** primary CTA "Reservá tu primer día — CRC 3.000" → PayPal checkout for `day-pass`. Secondary: "Ver planes." WhatsApp demoted to footer/contact page.
- **Every class/zone page:** "Reservar y pagar" button instead of "Escribinos por WhatsApp."
- **Class reservations require payment (or an active plan).** Reservation route checks: active plan → reserve free; no plan → redirect to PayPal day-pass, and the capture route auto-creates the reservation. *This is the single highest-leverage change in the whole strategy:* prepaid users show up.
- **First-visit offer:** dedicated `/primer-dia` landing with social proof, schedule, map, and one payment button. All ads/Instagram bio point here.
- **Post-payment upsell:** after a day-pass capture, show "Te gustó? El plan semanal sale a CRC 8.000 — el pase de hoy te lo descontamos" (configurable coupon logic in `catalog.ts`).

### 4.2 Landing page CTA hierarchy

- One primary CTA per screen, verb-first, benefit-anchored: "Empezá hoy," "Asegurá tu espacio," "Retomá tu racha."
- Sticky mobile bottom bar: [Reservar día] [Ver planes] — visible on every `(site)` page.
- Add urgency/scarcity honestly: live occupancy already exists (`computeOccupancy`) → "Ahora mismo: 32/85 personas — buen momento para entrenar."
- Social proof band: member count, total check-ins this month ("+1.240 entrenos este mes"), testimonials.
- Price anchoring on `/precios`: show monthly as "CRC 767/día" next to day-pass CRC 3.000 to push plan conversion.

### 4.3 Membership renewal = retention moment

- `membership.nextBillingDate` already exists. Surface it in-app 5 days out with a one-tap PayPal renewal (pre-selected plan).
- Lapsed 3 days → "warning" state banner + email; lapsed 10 days → win-back offer.

---

## 5. Priority 3 — Profile settings + admin badge management

### 5.1 Member profile self-service (new `/app` → Perfil tab)

Today all member data edits are admin-only. Members should own:

- Name (display), photo, goal, favorite training, phone, email.
- **Weekly goal** (2–6 days) — feeds Streaks 2.0.
- **PIN change** (requires current PIN) + PIN recovery via email code (Resend; codes in a `xtreme_gym_otps` collection with TTL index).
- Notification preferences (per email type — required for §6 anyway).
- Badge showcase: pick 3 badges to pin on their profile card.

### 5.2 Admin: badge & gamification management

Extend `app/admin/page.tsx` (new "Gamificación" tab):

- CRUD on badge definitions (toggle active, edit thresholds, create manual badges).
- Grant/revoke a badge to a member manually (e.g., "Miembro Fundador").
- View per-member: streak, freezes banked, XP, level, earned badges — with manual adjust (support cases).
- Simple analytics: badge earn counts, streak distribution, weekly active members.

### 5.3 Admin hygiene (quick wins)

- Move `ADMIN_CODE` defaults out of code (fail hard if env missing) — `shared.ts:13-14` currently ships fallback credentials.
- Audit log collection for admin mutations (who changed what, when).

---

## 6. Phase 2 backlog (build after priorities 1–3)

- **Email lifecycle (Resend, infra already wired):** welcome + access code; streak-at-risk (evening, if no check-in and streak ≥3); milestone congratulation; payment receipt + renewal reminder (5 days before); win-back at 7/21 days inactive with day-pass offer; monthly "Tu mes en Xtreme" recap (workouts, XP, badges — like Spotify Wrapped, extremely shareable). Cron via Vercel Cron hitting an authenticated `/api/xtreme/jobs/*` route.
- **PWA completion:** install prompt after 2nd visit, offline shell, **web push** (streak-at-risk push beats email ~10× on open rates).
- **Leaderboard / monthly leagues** (opt-in), **referrals** ("Traé un amigo: ambos ganan una semana"), **workout buddies** (see when your friend checked in — the real Facebook-style dependency lever).
- **Coach touchpoints:** plan-completion comments, "tu coach te dejó una nota" notification.

---

## 7. Data model changes (summary)

On `MemberDoc`: `weeklyGoal: number`, `xp: number`, `earnedBadges: EarnedBadge[]`, `streakFreezes: number`, `freezeHistory[]`, `notificationPrefs: {...}`, `pinnedBadges: string[]`.
New collections: `xtreme_gym_badges` (definitions), `xtreme_gym_otps` (PIN recovery, TTL), `xtreme_gym_audit` (admin log), `xtreme_gym_events` (optional: append-only XP/badge events for recomputability).
All additive — no migration risk; `toAdminMember` extended accordingly.

---

## 8. Roadmap

| Phase | Contents | Effort |
|---|---|---|
| **1 — Reward loop** | Streaks 2.0 + freezes, badge engine + catalog, XP/levels, phrases, home redesign + celebrations | ~1–2 weeks |
| **2 — Commitment funnel** | PayPal-first reservations, landing CTA overhaul, `/primer-dia`, sticky bar, renewal flow | ~1 week |
| **3 — Ownership** | Profile tab, PIN change/recovery, admin gamification tab, audit log | ~1 week |
| **4 — Triggers** | Email lifecycle + cron, PWA install + push, monthly recap | ~1 week |
| **5 — Social** | Leaderboard/leagues, referrals, buddies | later |

Ship order matters: rewards before triggers (a push notification into a boring app just gets ignored), triggers before social (leagues need actives).

## 9. Success metrics

Track from day one (a `xtreme_gym_events` collection makes this trivial):

- **D7 / D30 member retention** (checked in again within 7/30 days of first visit) — the north star.
- Weekly active members / total active plans.
- % reservations prepaid vs. free · day-pass → plan conversion rate.
- Streak distribution (how many members hold ≥7-day streaks) · freeze usage.
- Email open → check-in-within-24h rate (once Phase 4 lands).

---

*Next step when ready: say "build Phase 1" and implementation starts with the badge engine + Streaks 2.0 in `lib/xtreme/`.*
