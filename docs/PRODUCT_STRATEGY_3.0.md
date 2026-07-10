# Xtreme Gym — Product Strategy 3.0

**Date:** 2026-07-10 · **Status:** Proposed · **Scope:** Engagement, retention, acquisition, and growth loops on top of the 1.0 foundation and 2.0 operating system

---

## 0. How to read this document

| Doc | Role |
|---|---|
| `PRODUCT_STRATEGY.md` | **1.0** — build the retention loop (reward → commitment → ownership → triggers → social) |
| `PRODUCT_STRATEGY_2.0.md` | **2.0** — make the loop trustworthy, measurable, operational, adaptive |
| `STRATEGY_2.0_HARD_PATH.md` | Status note for sessions + entitlements + inventory foundation |
| **This file** | **3.0** — use the loop to acquire, activate, retain, and re-activate members at scale |

3.0 does **not** invent a new product identity. It assumes 1.0’s loop exists and 2.0’s trust/truth rails are partially live. The job of 3.0 is commercial and emotional: **more first visits, more second visits, more renewals, more friends brought in.**

---

## 1. Audit: 1.0 strategy vs current codebase

### 1.1 Verdict

**1.0 is largely shipped.** The product moved from “log a workout and nothing happens” to a full habit loop with rewards, paid commitment, self-service profile, lifecycle triggers, and light social.

### 1.2 Phase map (1.0 roadmap §8)

| 1.0 phase | Intent | Current state | Evidence |
|---|---|---|---|
| **1 — Reward loop** | Streaks 2.0, freezes, badges, XP/levels, phrases, home celebrations | **Done** | `lib/xtreme/gamification.ts`, `phrases.ts`, `app/components/gamification.tsx`, member app home in `ExtremeGymSite.tsx` |
| **2 — Commitment funnel** | PayPal-first booking, landing CTAs, `/primer-dia`, renewal surface | **Mostly done** | `(site)/primer-dia`, PayPal create/capture, sticky CTAs on site; reservation path can return 402 + day-pass when no entitlement |
| **3 — Ownership** | Profile, PIN recovery, admin gamification, audit | **Done** | user PATCH + profile fields, OTPs, admin `gamificacion` tab, `lib/xtreme/audit.ts` |
| **4 — Triggers** | Lifecycle email + cron, PWA + push, monthly recap | **Done (v1)** | `lib/xtreme/lifecycle.ts`, `jobs/lifecycle`, `vercel.json` cron, `PwaRuntime`, web-push helpers |
| **5 — Social** | Leagues, referrals, buddies | **Done (v1)** | `lib/xtreme/social.ts`, `/api/xtreme/social`, `/app/comunidad` |

### 1.3 1.0 gaps still open (carry into 3.0, not re-scoped as “build 1.0”)

| Gap | Why it still matters |
|---|---|
| Day-pass → plan credit upsell after capture | Highest acquisition→revenue conversion lever still soft |
| One-tap renewal with preselected plan | Renewal is still a navigation task, not a moment |
| Shareable milestone / monthly recap cards | Free acquisition channel (IG/WA) underused |
| Attendance XP from **verified** class attendance vs reservation alone | Protects integrity of streaks and leagues |
| Referral reward on **qualifying visit/payment**, not only code redeem | Reduces fraud and aligns cost with retained members |
| Live occupancy as marketing scarcity on landing | Honest urgency that already has a data source |

**1.0 success metrics** (D7/D30, prepaid %, freeze usage, email→check-in) are only partially observable: events exist, but cohort dashboards do not.

---

## 2. Audit: 2.0 strategy vs current codebase

### 2.1 Verdict

**2.0 is partially foundation-complete on the hard path (trust + ops core), incomplete on truth/growth/intelligence.** The product can authorize, book, and grant entitlements more safely than at 1.0 design time. It cannot yet **prove** which acquisition channels retain, run offer experiments, or drive coach interventions from risk scores.

### 2.2 Phase map (2.0 roadmap §11)

| 2.0 phase | Intent | Current state | Notes |
|---|---|---|---|
| **2.1 Trust** | Sessions, authz, admin identity, privacy | **Partial** | Sessions + cookie + `requireMemberSession` on user/reservations/social mutations. Admin still shared codes with **code defaults**. No export/delete/consent ledger. Social **GET** still keyed by `memberName`. Rate limits not systematic. |
| **2.2 Truth** | Event ledger + cohorts + funnels | **Partial** | `recordEvent` + `xtreme_gym_events` on check-in, payment, lifecycle, social, push. **No** daily/monthly aggregates, admin funnel UI, or rebuildable cohort views. |
| **2.3 Operations** | Entitlements, schedule, atomic book, waitlist, attendance | **Mostly foundation** | Entitlement engine + ledger, atomic inventory, capture → grant → optional book, admin operations API. Waitlist schema only. No full schedule builder UI, webhook refunds, or waitlist auto-promote. |
| **2.4 Coach OS** | Risk inbox, structured notes, adaptive plans | **Not started as product** | Coach free-text / plan notes exist; no task queue, outcomes, or structured note types. |
| **2.5 Growth** | Offers, attribution, referral qualification, lifecycle experiments | **Not started** | Hardcoded catalog + basic referral code redeem. No UTM persistence, offer inventory, or campaign experiment framework. |
| **2.6 Intelligence** | Habit health, next-best action, deeper PRs | **Not started** | Rules models and NBA not present. |

Hard-path status note (`STRATEGY_2.0_HARD_PATH.md`) matches code: foundation landed; waitlist promotion, PayPal webhooks, schedule UI, and concurrent-booking smoke tests remain open.

### 2.3 Engineering quality track

| Item | State |
|---|---|
| `/api/health` readiness | Present (DB, email, push, PayPal, cron, admin flags + last lifecycle job) |
| Automated tests | Absent (`package.json` has no test script) |
| Monolith split | Still large `ExtremeGymSite.tsx` / `admin/page.tsx` |
| Observability | Mostly `console.error`; event writes are best-effort |

### 2.4 North star (carry forward)

> **Retained active members** = active entitlement **and** at least one verified visit in the trailing 14 days.

3.0 optimizes for that number and for the **rate of new members who reach it**, not vanity (signups, XP, app opens alone).

---

## 3. Product thesis for 3.0

### From gym OS → growth machine

1.0 made training feel rewarding.  
2.0 made booking and identity real enough to operate.  
**3.0 makes every empty slot, every first visit, every almost-churn, and every proud moment into a measurable growth action.**

New loop:

1. **Attract** — local, referral, and content paths land on a single paid first action.
2. **Activate** — first 14 days are scripted (book → visit → reward → second book → plan).
3. **Habit** — streaks, goals, coach touch, and social proof keep the weekly cadence.
4. **Expand** — referrals, buddy challenges, and share cards turn members into marketers.
5. **Recover** — win-back and coach tasks win back revenue before it fully churns.
6. **Prove** — every step is attributed so ad spend and staff time follow retained members, not clicks.

### 3.0 north-star tree

| Layer | Metric |
|---|---|
| **North star** | Retained active members (14d visit + entitlement) |
| **Acquisition** | Paid first actions / week · cost per retained member (when ads exist) |
| **Activation** | % day-pass → first verified visit ≤ 48h · % first visit → plan ≤ 7d |
| **Engagement** | Weekly goal hit rate · streak ≥ 2 weeks · class show-up rate |
| **Retention** | D7 / D30 / D60 verified-visit retention by source |
| **Expansion** | Referral-acquired retained members · share-card outbound clicks |
| **Revenue** | On-time renewal · day-pass→plan · lapsed→reactivated |
| **Guardrails** | Notification opt-out · support tickets / 100 actives · oversell = 0 · refund rate |

---

## 4. What Phase 3 is *not*

Do **not** start 3.0 by:

- Shipping a public social feed or chat (moderation cost, weak attendance link).
- Native iOS/Android before PWA open rates and push conversion justify it.
- AI-generated training plans without coach approval.
- More badges for badge count’s sake.
- A second payments provider before PayPal reconciliation + refund → entitlement revoke.
- Rebuilding 1.0 gamification—it already works.

Finish only the **minimum 2.0 rails** that make 3.0 experiments honest (see §5). Everything else in unfinished 2.4–2.6 is **sequenced inside 3.0**, not a parallel random backlog.

---

## 5. Phase 3 prerequisites (2.0 closure sprint)

Ship these before heavy acquisition spend or complex growth features. **~1–2 weeks.**

| # | Work | Why 3.0 needs it |
|---|---|---|
| P0 | Instrument missing events: `landing_viewed`, `cta_clicked`, `first_checkin`, `membership_started`, `renewal_completed`, reservation book/cancel | Without them, acquisition and activation funnels are guesswork |
| P0 | Admin **Growth** strip: day-pass→visit, visit→plan 1/3/7d, D7/D30 crude cohorts from events | Staff and founders need one screen, not Mongo |
| P0 | Day-pass capture: auto day-pass credit offer toward weekly/monthly within N days | Core acquisition conversion |
| P0 | Referral reward only after **first paid check-in or plan payment** (ledger entitlement, not raw date mutate) | Aligns cost with quality |
| P1 | Session required on social GET + push subscribe/unsubscribe; strip remaining `memberName` auth | Fraud and privacy before viral loops |
| P1 | PayPal webhook or admin refund path → `revokeEntitlement` | Growth will increase refund edge cases |
| P1 | Lifecycle: push **without** requiring email; quiet hours + frequency cap | Push-only members; reduce opt-out |
| P1 | Health/admin “System” card: last cron, payment failures, notification failures | Operate growth without flying blind |

Exit criteria for prerequisites:

- A founder can answer “how many paid day passes became plan members this week?” from admin.
- Referral reward cannot fire on profile creation alone.
- Refunding a day pass cannot leave a live booking entitlement.

---

## 6. Phase 3 roadmap

### Sequence principle

> **Measure → convert first visit → lock week 1 habit → expand via people → recover churn → personalize.**

| Phase | Name | Outcome | Effort |
|---|---|---|---:|
| **3.0** | Prerequisites (§5) | Trustworthy growth metrics + conversion rails | 1–2 w |
| **3.1** | Activation OS | First 14 days engineered; show-up and plan conversion | 2 w |
| **3.2** | Engagement depth | Home NBA, challenges, share moments, class attendance loop | 2–3 w |
| **3.3** | Acquisition engine | Attribution, offers, local/partner QR, landing experiments | 2–3 w |
| **3.4** | Retention ops | Coach risk inbox, win-back offers, renewal one-tap | 2–3 w |
| **3.5** | Community growth | Buddy challenges, qualified referrals, league seasons | 2 w |
| **3.6** | Intelligence v1 | Habit health score + next-best action (rules) | 2–3 w after ≥8 w clean events |

Parallel: engineering quality (tests for entitlement, booking race, referral ledger, pricing) continues every sprint.

---

## 7. Phase 3.1 — Activation OS (first 14 days)

Most gyms lose people between payment and habit. 3.1 scripts that window.

### 7.1 First-visit contract

After any first payment (day-pass or plan):

1. Confirm screen: **when** they train (default: today / tomorrow slots).
2. Auto-create or prompt **first class booking** if inventory allows.
3. Install PWA + enable push **after** first successful check-in (higher intent, better accept rate).
4. Welcome lifecycle: T+0 payment, T+2h if no booking, T+24h if booked but no visit, T+48h win-soft nudge with coach face/copy.

### 7.2 “Segundo entreno” campaign

- After first verified check-in, surface a single CTA: book/complete second session within 7 days.
- Reward: small XP bonus badge *Segundo día* + optional freeze credit (not free week—avoid training people to wait for discounts).
- Measure: % first visit → second visit ≤ 7d.

### 7.3 Day-pass conversion path

- Offer: “Aplicá CRC 3.000 a un plan semanal/mensual” for a configurable window (e.g. 72h–7d).
- Server-priced coupon/ledger; client never sends trusted amount.
- Admin toggles offer on/off and sees conversion.

### 7.4 Show-up integrity

- Attendance states from inventory (`attended` / `no_show`) drive class XP, not reservation alone.
- No-show soft penalty later (after policy is communicated): lose freeze or miss attendance XP—never shame copy.

### Exit criteria

- Paid day-pass → first visit rate and plan conversion 1/3/7d visible in admin.
- ≥ target (set after baseline week) of new payers complete a second visit within 7 days.

---

## 8. Phase 3.2 — Engagement depth

### 8.1 Home screen: one next-best action (rules v0)

Exactly one primary card under the streak ring:

| Signal | Recommendation |
|---|---|
| Weekly goal incomplete + day left | “Entrená hoy: 2/4 esta semana” |
| Streak at risk | “Protegé tu racha antes de las 10 pm” |
| Plan expiring ≤5d | “Renovación en 1 toque” |
| Booked class soon | “Tu clase de hoy · check-in” |
| Unseen coach note | “Tu coach te dejó una nota” |
| Milestone / badge progress close | “1 entreno más → HIIT ×10” |
| Buddy inactive together | “Invitá a {name} a entrenar esta semana” |

Log `recommendation_shown` / `recommendation_acted`. Cap changes to once per open (no flicker).

### 8.2 Challenges (time-boxed engagement, not infinite badges)

Lightweight challenge engine (member or gym-wide):

- **Semana perfecta** — hit weekly goal.
- **3 clases esta semana** — class attendance.
- **Traé un amigo** — qualified referral.
- Seasonal: “Agosto fuerte”, “Vuelta a clases”.

Rewards: XP, exclusive badge, freeze, or small membership day via entitlement ledger. Inventory-capped if monetary.

### 8.3 Share moments (organic acquisition)

Auto-generate share cards (canvas/Web Share API) for:

- Streak milestones
- Level-ups
- Monthly recap (XP, workouts, badges, league)
- Challenge completion

Brand watermark + QR to `/primer-dia?ref=…`. Track `share_created` / `share_clicked` when possible.

### 8.4 Class + occupancy as engagement

- “Ahora mismo: X/85” on site and app when fresh.
- Waitlist auto-promote (finish 2.3 open item) with short acceptance window + push—scarcity that converts.

### Exit criteria

- NBA card has measurable CTR and post-click check-in/renewal rate.
- ≥1 shareable surface ships with branded QR/ref.
- Challenges run without manual Mongo edits.

---

## 9. Phase 3.3 — Acquisition engine

### 9.1 Single paid first action

Continue demoting WhatsApp to **support only**. Every growth surface ends in:

- Day-pass checkout, or  
- Plan checkout, or  
- Booked first class under entitlement  

UTM + `ref` + partner codes persist through checkout → payment → first visit (cookie + server `anonymousId` / payment properties).

### 9.2 Offer system (minimal viable)

```ts
// Conceptual — server calculated
type Offer = {
  id: string;
  kind: "day_pass_credit" | "percent_off" | "bonus_days" | "challenge_reward";
  eligibility: "new" | "lapsed" | "active" | "referral";
  startsOn: string;
  endsOn: string;
  inventory?: number;
  rules: Record<string, number | string | boolean>;
  active: boolean;
};
```

Priority offers:

1. Day-pass credit to plan  
2. Win-back day-pass for lapsed 14–45d  
3. Partner QR (corp, influencer, local business) with inventory  
4. Renewal early-bird (renew ≥5d early → freeze or XP bonus, not endless discount)

### 9.3 Local growth kit (Costa Rica / Ciudad Quesada reality)

- Printable QR posters: coach, reception, parking, partners  
- WhatsApp status / IG story templates that open `/primer-dia`  
- “Traé un amigo” physical cards with unique coach codes  
- Senior path (`/adultos-mayores`) with its own offer + retention copy  

### 9.4 Landing experiments

- Hero A/B: price-first vs outcome-first (“Tu primer día en Xtreme”)  
- Sticky bar variants  
- Social proof fed by real monthly check-ins when privacy-safe  

Server-side experiment assignment; report **retained members**, not only CTR.

### Exit criteria

- Admin: revenue and retained members **by source** (organic, referral, partner, campaign).  
- At least one non-referral partner code live.  
- Offers cannot be forged from the client.

---

## 10. Phase 3.4 — Retention operations

Automation finds risk; **humans close the loop**.

### 10.1 Coach / reception risk inbox

Daily ranked queue (admin or coach role):

| Priority | Trigger |
|---|---|
| P0 | Paid, never visited > 48h |
| P1 | Was 3+ days/week, now 0 for 7d |
| P1 | Plan ends ≤5d, no renewal started |
| P2 | 2+ no-shows in 14d |
| P2 | Returned after 14+ days (celebrate, don’t sell hard) |
| P3 | Weekly goal miss two weeks running |

Each task: contact channel, suggested script, snooze, resolve, outcome (visited / renewed / lost).

### 10.2 One-tap renewal

- In-app banner + push/email 5d and 2d before expiry  
- Checkout preselects current plan  
- Post-payment: entitlement extend + celebration + event `renewal_completed`

### 10.3 Win-back ladder

| Inactive | Action |
|---|---|
| 7d | Soft push/email (existing) + app phrase |
| 14d | Coach task + optional free class credit **or** discounted day-pass (experiment) |
| 21d | Stronger offer + limited inventory |
| 45d+ | Archive from “active risk”; seasonal re-engage only |

Always measure **reactivated retained** (visit after return), not open rate alone.

### 10.4 Structured coach notes (light 2.4)

- Types: encouragement, technique, plan change, follow-up  
- Member-visible notes → push + acknowledge  
- Track visit within 7d of note  

### Exit criteria

- Staff start the day from one queue, not chat memory.  
- On-time renewal rate and win-back reactivation visible.  
- Interventions store outcome.

---

## 11. Phase 3.5 — Community as acquisition

Social already exists; 3.5 makes it **growth-grade**.

### 11.1 Referrals 2.0

- Share link + QR (`/primer-dia?ref=CODE`), not code-only entry  
- Reward via **entitlement ledger** after referred member’s first **paid verified visit** (or first plan payment—pick one rule and stick to it)  
- Fraud: self-referral block, device/payment heuristics light touch, admin clawback  
- Cap rewards per month to protect margin  

### 11.2 Buddy challenges

- Pair challenge: both hit weekly goal → both get XP/badge  
- Privacy: default “trained this week” not exact last workout time (finish 2.1 privacy intent)  
- Notify on buddy milestone (opt-in)

### 11.3 League seasons

- Monthly leagues already computed from XP  
- Add: season end celebration, promotion/relegation flavor copy, share card  
- Optional gym prize (merch / freeze / guest pass) announced in-app—manual fulfill OK at first  

### 11.4 What stays out

No free-form feed, DMs, or public comments. Community = **accountability + invite**, not content moderation.

### Exit criteria

- Referral share links attribute payment and first visit.  
- ≥1 buddy challenge type live.  
- League month-end is an event members anticipate.

---

## 12. Phase 3.6 — Intelligence v1 (only after data quality)

### 12.1 Habit health score (explainable)

Inputs: recency of verified visit, cadence change, membership days left, no-shows, goal trend, notification fatigue.

Output: `healthy | slipping | at_risk | lapsed` + short reasons for coach and (carefully) member.

### 12.2 Next-best action ranking

Promote 3.2 rules to scored ranking with outcome feedback. Still **one** home recommendation. No medical claims.

### 12.3 Progress beyond body weight

- Optional exercise-level PRs when logged  
- Celebrate consistency and volume trends  
- Hide body metrics independently of training progress  

### Exit criteria

- Risk states correctable by staff.  
- Recommendations frequency-capped and measured.  
- No auto prescription of load/medical advice.

---

## 13. Channel strategy (engagement + acquisition)

| Channel | Role in 3.0 | Priority |
|---|---|---|
| **In-app home** | Daily habit + NBA | Highest for retention |
| **Web push** | Streak risk, class reminders, win-back | Highest for re-open |
| **Email** | Receipts, renewal, monthly recap, longer win-back | Medium |
| **WhatsApp** | Support + human coach touch only (not primary checkout) | Support |
| **IG / TikTok / flyers** | Top-of-funnel → `/primer-dia` with UTM | Acquisition |
| **Referrals / QR** | Lowest CAC retained members | Expansion |
| **Reception kiosk / tablet** | Fast check-in + occupancy (future-friendly) | Ops / activation |

Quiet hours and per-member caps are mandatory as volume grows—opt-out kills the channel.

---

## 14. Metrics, experiments, and release gates

### 14.1 Release gates

1. **3.0 foundation:** prerequisites §5  
2. **Activation release:** 3.1 + day-pass credit  
3. **Engagement release:** 3.2 NBA + one challenge + share card  
4. **Growth release:** 3.3 offers + attribution + 3.5 referral links  
5. **Retention ops release:** 3.4 inbox + one-tap renewal  
6. **Intelligence release:** 3.6 only with clean event history  

### 14.2 Default experiments (run in order)

1. Day-pass credit window 3d vs 7d  
2. First-visit booking forced choice vs optional  
3. Referral reward after first visit vs first plan payment  
4. Renewal reminder 5+2d vs 3d only  
5. Win-back: free class credit vs discounted day-pass  

Each experiment: primary metric = **retained active** or conversion to that state; guardrail = refunds / opt-outs / support load.

### 14.3 Targets (set baselines in week 0 of 3.0, then aim)

Illustrative—replace with real baselines after Growth admin ships:

| Metric | Direction |
|---|---|
| Day-pass → visit ≤48h | ↑ |
| First visit → second ≤7d | ↑ |
| Day-pass → plan ≤7d | ↑ |
| D30 verified retention | ↑ |
| On-time renewal | ↑ |
| Referral retained / month | ↑ |
| Push opt-out rate | → or ↓ |
| Booking oversell | = 0 |

---

## 15. Engineering principles for 3.0

1. **Money, entitlement, XP, referral value → ledger or append-only events.** No silent date overwrites.  
2. **Server prices and eligibility.** Client displays; server decides.  
3. **Identity from session.** Display names are not auth.  
4. **One primary CTA** per surface (Hook Model discipline from 1.0 still applies).  
5. **Feature flags / offer toggles** for growth experiments without redeploys when possible.  
6. **Tests** for: entitlement grant/revoke, booking concurrency, referral qualification, offer pricing, lifecycle eligibility.  
7. **Spanish, CR tone, short copy**—already a brand asset in phrases; keep it.

---

## 16. Immediate first sprint (when “build Phase 3” starts)

1. Admin Growth mini-dashboard from `xtreme_gym_events` (even if crude aggregates).  
2. Instrument landing CTA + first_checkin + membership/renewal events end-to-end.  
3. Day-pass → plan credit offer on capture + post-payment UI.  
4. Referral qualification = first paid verified visit; grant via entitlement ledger.  
5. One-tap renewal entry from member app when `daysRemaining ≤ 5`.  
6. Home next-best-action v0 (rules table in §8.1).  
7. Lifecycle push independent of email success (already partially true—verify and lock tests).  

This sprint is **conversion + measurement**. Flashy social can wait until the funnel numbers move.

---

## 17. Summary scorecard

| Strategy era | Goal | Status now | 3.0 job |
|---|---|---|---|
| **1.0** | Build the habit loop | **Shipped** | Maintain; polish conversion edges |
| **2.0** | Trust, truth, ops, coach, growth rails | **Foundation partial** | Close P0/P1 rails in §5 |
| **3.0** | Engagement + retention + acquisition at scale | **Proposed** | Activation OS → engagement → acquisition → retention ops → community → intelligence |

**One-line strategy:**

> Make the first paid visit inevitable, the second visit automatic, the weekly habit social, and every proud moment a branded invitation—while only spending staff time and ad budget on what produces retained active members.

---

*1.0 proved people will play. 2.0 proved the gym can operate. 3.0 must prove Xtreme can grow.*
