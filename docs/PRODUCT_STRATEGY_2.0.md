# Xtreme Gym — Product Strategy 2.0

**Date:** 2026-07-10 · **Status:** Proposed · **Scope:** Member app, acquisition funnel, coach operations, admin, data platform

---

## 1. What 1.0 accomplished

The first five phases were the complete **1.0 retention foundation**, not the finished product. They established the loop:

> Discover Xtreme → pay or join → train → receive a reward → return → invite someone.

The repository now contains:

- Gamification: weekly and daily streaks, freezes, XP, levels, badges, phrases and celebrations.
- Commitment funnel: first-day landing, PayPal checkout and stronger payment CTAs.
- Ownership: profile settings, weekly goals, PIN recovery, notification preferences and badge showcase.
- Operations: admin members, plans, payments, check-ins, metrics, gamification management and audit records.
- Lifecycle: welcome, milestone, streak-risk, renewal, win-back and monthly recap emails; PWA install and web push.
- Social: opt-in monthly leagues, referral rewards and workout buddies.

That is a strong breadth-first 1.0. The next version should not add another pile of disconnected features. **2.0 should make the existing loop trustworthy, measurable, operational and adaptive.**

---

## 2. Code audit: what is still missing or incomplete

### 2.1 Critical product and platform gaps

| Area | Current state | Risk / missed value | 2.0 response |
|---|---|---|---|
| Member identity | Several mutation routes trust `memberName`; browser state is treated as a session | A member can potentially act as another member if they know the name | Server-issued sessions after PIN verification, secure cookie, authorization on every member mutation |
| Reservations | Capacity exists, but an active plan/payment is not enforced | The main commitment strategy is not actually guaranteed | Entitlement checks, paid holds and PayPal capture → reservation |
| Capacity writes | Count-then-insert can race | Two requests can take the final place | Atomic slot inventory or transaction-backed reservation |
| Analytics | No append-only `xtreme_gym_events` product event stream | D7/D30 retention and funnel conversion cannot be trusted | Canonical event taxonomy and derived cohorts |
| Lifecycle delivery | Cron selects members with email and push is sent only after email succeeds | Push-only members receive nothing; Resend outage blocks push | Channel-independent orchestration and per-channel delivery state |
| Social writes | Referral reward updates are multi-document and non-transactional | One member can receive a reward while the other does not | Mongo transaction or reward ledger with reconciliation |
| Social scale | Leaderboard loads all opted-in member workout arrays | Cost and latency grow with every workout | Monthly aggregate collection updated from events |
| Privacy | Data retention, consent, export and account deletion are undefined | Member trust and operational/legal exposure | Consent log, retention policy, export/delete workflow |
| Testing | Core logic is pure, but automated test coverage is absent | Streak, billing and reward regressions can ship silently | Unit, route integration and browser smoke suites |
| Observability | Errors are mostly `console.error` | Failures are found after users complain | Structured logs, job health, alerts and admin delivery diagnostics |

### 2.2 1.0 features that need their second half

- **PayPal-first booking:** the checkout exists, but reservations do not yet require an entitlement and capture does not reliably create the selected class reservation.
- **Renewal:** reminders exist, but the app still needs a one-tap renewal with the current plan preselected and a confirmed post-payment state.
- **Day-pass conversion:** there is no automated “apply today’s pass toward a plan” offer or conversion measurement.
- **Classes:** fixed training definitions are embedded in code. There is no admin schedule builder, recurring sessions, coach assignment, waitlist or attendance/no-show state.
- **Buddies:** a member can see the last workout date, but there is no privacy control per buddy, invitation notification, challenge or shared plan.
- **Referrals:** rewards exist, but fraud controls, reward ledger, share links, attribution and admin support tools are missing.
- **Push:** subscription exists, but unsubscribe/device management and channel-level diagnostics are missing.
- **Coach touchpoints:** coach notes are visible, but there is no task inbox, member-risk queue or closed feedback loop.
- **Monthly recap:** it reports workouts and minutes; it should include XP, badges, personal bests, attendance consistency and a share card.
- **Admin analytics:** operational totals exist, but not acquisition cohorts, retention cohorts, conversion funnels or intervention outcomes.

---

## 3. Product thesis for 2.0

### From a motivational app to a gym operating system

1.0 made training feel rewarding. 2.0 should connect **member behavior, coach action and business outcomes**.

The new loop:

1. **Observe:** capture reliable events across ads, checkout, check-in, workouts, classes and messages.
2. **Understand:** calculate intent, habit strength, churn risk and next-best action.
3. **Intervene:** the app, lifecycle engine or coach sends one relevant action.
4. **Measure:** record whether the intervention produced a booking, check-in, renewal or referral.
5. **Learn:** improve timing, copy, offers and coach workflows from real outcomes.

The 2.0 north star should be:

> **Retained active members:** members with an active entitlement and at least one verified visit in the trailing 14 days.

This combines revenue and actual gym behavior. Raw signups, app opens and XP are supporting indicators—not the final outcome.

---

## 4. Phase 2.1 — Trust: identity, authorization and data safety

This phase must ship first. Growth on weak identity creates support and privacy problems faster.

### 4.1 Real member sessions

- PIN verification returns an opaque, random session token—not member data alone.
- Store only a hash of the token in `xtreme_gym_sessions`.
- Send the token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- Rotate sessions after PIN change/recovery; revoke all sessions after suspected compromise.
- Add a shared `requireMemberSession()` guard to user, reservations, social, push and notification routes.
- Remove `memberName` as authorization. It may remain a display/search field only.
- Add rate limits for PIN verification, OTP requests, social requests and checkout creation.

### 4.2 Admin hardening

- Replace shared admin codes with named admin accounts and password/passkey authentication.
- Preserve `admin` and `super` roles, but attach every audit event to an immutable admin ID.
- Add session expiry, revocation and recent-login checks for destructive actions.
- Require production deployment to fail readiness checks if admin credentials, cron secret or payment credentials are absent.

### 4.3 Privacy and data controls

- Record consent for email, push, leaderboard and buddy activity separately with timestamp and source.
- Add “download my data” and “delete my account” requests.
- Define retention windows for OTPs, sessions, push endpoints, notification deliveries and raw events.
- Hide exact buddy activity by default; offer “today / this week” granularity unless explicitly shared.
- Create a privacy-safe public identity (`publicMemberId`) independent from normalized name.

### Exit criteria

- No member mutation route accepts identity from request payload alone.
- Automated authorization tests cover every protected route.
- Admin audit entries identify a real actor.
- Session revocation and deletion/export workflows pass integration tests.

---

## 5. Phase 2.2 — Truth: event platform and product analytics

### 5.1 Canonical event ledger

Create append-only `xtreme_gym_events`:

```ts
type ProductEvent = {
  id: string;
  type: string;
  occurredAt: Date;
  memberId?: string;
  anonymousId?: string;
  sessionId?: string;
  source: "site" | "member_app" | "admin" | "kiosk" | "job" | "paypal";
  entity?: { type: string; id: string };
  properties: Record<string, string | number | boolean | null>;
  schemaVersion: number;
};
```

Initial taxonomy:

- Acquisition: `landing_viewed`, `cta_clicked`, `checkout_started`, `payment_completed`.
- Activation: `profile_created`, `first_checkin`, `first_workout`, `first_class_reserved`.
- Retention: `checkin_completed`, `workout_logged`, `weekly_goal_met`, `streak_lost`, `streak_repaired`.
- Revenue: `membership_started`, `renewal_completed`, `membership_lapsed`, `refund_completed`.
- Lifecycle: `notification_queued`, `notification_sent`, `notification_clicked`, `intervention_converted`.
- Social: `leaderboard_joined`, `buddy_connected`, `referral_shared`, `referral_redeemed`.

Events should be emitted server-side after the source mutation succeeds. Client events are useful for views/clicks but cannot be the source of truth for payments, check-ins or rewards.

### 5.2 Derived models

Maintain small aggregate collections rather than repeatedly scanning member history:

- `xtreme_gym_member_daily`: visits, workouts, minutes, XP and class attendance by member/day.
- `xtreme_gym_member_monthly`: monthly XP, active days, badges and league position.
- `xtreme_gym_funnel_daily`: landing → checkout → payment → first visit → plan conversion.
- `xtreme_gym_retention_cohorts`: D1, D7, D14, D30 and D60 by acquisition month/source.
- `xtreme_gym_notification_metrics`: send, delivery, click and conversion per campaign/channel.

### 5.3 Decision dashboards

Admin should answer, without exporting MongoDB:

- Which acquisition source produces retained members rather than cheap leads?
- What percentage of paid day passes check in?
- What percentage converts to a plan within 1, 3 and 7 days?
- Which classes fill, waitlist or produce no-shows?
- Which lifecycle messages cause a check-in or renewal within 24/72 hours?
- Which members are active, slipping or likely churned?

### Exit criteria

- Every north-star input comes from server events.
- D7/D30 cohorts and day-pass conversion are visible in admin.
- Historical aggregates can be rebuilt from events.
- Event schema/version tests prevent accidental breaking changes.

---

## 6. Phase 2.3 — Operations: real scheduling, attendance and entitlements

### 6.1 Entitlement engine

Create one pure authorization decision:

```ts
canBook(member, classSession, now) ->
  | { allowed: true; entitlementId: string }
  | { allowed: false; reason: "expired" | "payment_required" | "limit_reached" };
```

- Active plans define included zones/classes and booking limits.
- Day pass grants a dated entitlement, not a generic payment record.
- Referral rewards extend an entitlement through a ledger entry, not a direct date mutation.
- Refunds/reversals revoke the corresponding entitlement.

### 6.2 Session inventory instead of hardcoded class dates

New entities:

- `class_templates`: name, duration, capacity, zone and default coach.
- `class_sessions`: exact start/end, coach, capacity, status and booking cutoff.
- `bookings`: member, session, entitlement/payment, status and timestamps.
- `attendance`: checked-in, attended, late-cancel or no-show.
- `waitlist`: ordered entries with offer expiry.

Features:

- Admin recurring schedule builder and exceptions/holiday closures.
- Atomic booking capacity.
- Waitlist auto-promotion with push/email and a short acceptance window.
- Cancellation cutoff and configurable no-show policy.
- Coach roster and one-tap attendance at class start.
- Attendance XP is awarded from verified attendance, not reservation alone.

### 6.3 Payment-complete workflows

- PayPal order metadata carries member/session/offer identifiers.
- Capture writes payment, entitlement and booking idempotently.
- Webhook reconciliation handles delayed capture, disputes and refunds.
- Post-day-pass offer: apply CRC 3.000 toward a weekly/monthly plan within a configurable window.
- One-tap renewal opens checkout with the current plan selected.

### Exit criteria

- An ineligible member cannot reserve without payment.
- The final class slot cannot be oversold under concurrent requests.
- Payment capture can be retried without duplicate entitlement or booking.
- Admin can see booked, attended, cancelled and no-show counts.

---

## 7. Phase 2.4 — Coach OS: human intervention at the right moment

Automation should make coaches more effective, not replace them.

### 7.1 Coach inbox

Rank a small daily list:

- New member with no first visit after payment.
- Active member whose normal training cadence dropped.
- Member returning after 14+ days.
- Plan completed and needs a new prescription.
- Body metric trend that deserves encouragement—not medical interpretation.
- Three class no-shows or repeated late cancellations.

Each task includes one recommended action and can be marked contacted, snoozed or resolved.

### 7.2 Structured coach notes

- Note types: encouragement, technique, plan change, progress review and follow-up.
- Member-visible versus private operations note.
- Push/email when a visible note is published.
- Member can acknowledge or answer with a constrained response.
- Track whether the note led to a visit within seven days.

### 7.3 Adaptive plans

- Templates by goal and experience level.
- Coach clones and adjusts a template rather than writing every plan from scratch.
- Progression rules based on completion, reported difficulty and missed sessions.
- Deload/recovery weeks and explicit rest days so gamification supports physiology.
- Exercise alternatives for equipment availability or limitations.

### Exit criteria

- Coaches work from one prioritized queue.
- Every intervention has status and outcome.
- Plan completion creates a follow-up task automatically.
- Member-visible notes produce a notification and acknowledgement.

---

## 8. Phase 2.5 — Growth engine: conversion, referrals and lifecycle experiments

### 8.1 Offer system

Replace hardcoded prices/discount copy with:

- `offers`: eligibility, start/end, inventory, discount and attribution rules.
- `coupons`: redemption limits, member/source restrictions and ledger impact.
- Server-calculated price; client never supplies the trusted amount.
- Offer audit and admin preview before activation.

Priority experiments:

1. Day pass → weekly/monthly credit.
2. First visit booked today versus open-date pass.
3. Renewal five days before expiry versus two days before.
4. Win-back day pass versus membership credit.
5. Referral reward after referred member’s first paid check-in, not profile creation.

### 8.2 Attribution

- Preserve UTM/referral/campaign IDs from landing through payment and first visit.
- Generate referral share links instead of requiring manual code entry.
- Add QR codes for coaches, flyers and local partners.
- Report retained members and revenue per source—not clicks alone.

### 8.3 Lifecycle orchestration 2.0

- Email and push evaluated independently.
- Campaign state machine: eligible → queued → sent → delivered → clicked → converted.
- Quiet hours and per-member frequency cap.
- Suppress irrelevant messages after the target action occurs.
- Retry policy and dead-letter queue.
- Admin campaign health and test-send tools.
- Content variants with deterministic experiment assignment.

### Exit criteria

- Day-pass-to-plan conversion is attributable and measurable.
- Referral reward requires a verified qualifying event.
- Push-only members receive lifecycle notifications.
- Campaign experiments report conversion, not just delivery.

---

## 9. Phase 2.6 — Intelligence and personalization

Only build predictive features after event quality is proven.

### 9.1 Habit health score

Start with an explainable rules model:

- Recency of verified visit.
- Change from personal weekly cadence.
- Remaining membership days.
- Recent cancellations/no-shows.
- Goal completion trend.
- Notification fatigue.

Output: `healthy`, `slipping`, `at_risk`, `lapsed`, plus human-readable reasons. Do not present it as medical or psychological diagnosis.

### 9.2 Next-best action

Choose exactly one home-screen recommendation:

- Train today to complete the weekly goal.
- Take a recovery day.
- Reserve the class the member usually attends.
- Renew the expiring plan.
- Resume a paused training plan.
- Respond to a coach note.
- Invite a buddy after a milestone.

Rules first; learned ranking later. Every recommendation logs exposure and outcome.

### 9.3 Personal records and meaningful progress

- Track exercise-level sets, repetitions and load where useful.
- Surface personal bests, volume trends and plan adherence.
- Celebrate consistency and safe progression, not only body weight.
- Allow members to hide body measurements while retaining training progress.

### Exit criteria

- Risk states are explainable and can be corrected by staff.
- Recommendations are frequency-capped and outcome-measured.
- No health diagnosis or unsafe automatic prescription is generated.

---

## 10. Engineering quality track — required across every phase

### Architecture

- Split `ExtremeGymSite.tsx` and `admin/page.tsx` into feature modules and route-level components.
- Move duplicated member types and normalization logic into shared schemas.
- Validate API inputs with a runtime schema library.
- Keep business rules pure; keep Mongo/PayPal/Resend in adapters.
- Use ledger/event writes for money, entitlement, XP and referral value.

### Testing pyramid

- Unit: streak/freeze, XP, badge rules, entitlement, pricing, league and lifecycle eligibility.
- Integration: PIN session, booking race, PayPal idempotency, referral transaction and cron retry.
- Browser smoke: join → pay → check in → log workout → reserve → renew.
- Accessibility: keyboard, focus, contrast, reduced motion and screen-reader labels.

### Operations

- `/api/health` readiness checks for MongoDB and required configuration without exposing secrets.
- Structured logs with request/job IDs.
- Error monitoring and alerts for payment capture, cron failure and notification failure rate.
- Backup/restore runbook and periodic restore test.
- Data migration versioning and backfill scripts.
- Staging environment with sandbox PayPal and isolated database.

### Performance

- Paginate admin/member history instead of returning entire arrays.
- Replace full-member leaderboard scans with monthly aggregates.
- Keep photo binaries outside member documents; use object storage and signed upload.
- Add indexes for sessions, lifecycle deliveries, push endpoints, referrals, buddies and events.
- Measure mobile LCP, interaction latency and API p95 before optimizing blindly.

---

## 11. 2.0 roadmap and sequence

| Phase | Outcome | Indicative effort |
|---|---|---:|
| **2.1 — Trust** | Real sessions, route authorization, admin identity, privacy controls | 2 weeks |
| **2.2 — Truth** | Event ledger, cohorts, funnel and intervention analytics | 2 weeks |
| **2.3 — Operations** | Entitlements, real class schedule, atomic booking, waitlist, attendance | 3–4 weeks |
| **2.4 — Coach OS** | Risk/task inbox, structured notes and adaptive plan workflow | 2–3 weeks |
| **2.5 — Growth** | Offers, attribution, referral qualification and lifecycle experiments | 2–3 weeks |
| **2.6 — Intelligence** | Habit health, next-best action and deeper progress | 3 weeks after sufficient data |

Parallel engineering quality work is mandatory, not a final cleanup phase.

Recommended release gates:

1. **2.0 foundation release:** 2.1 + 2.2.
2. **2.0 operations release:** 2.3 + coach inbox from 2.4.
3. **2.0 growth release:** remaining 2.4 + 2.5.
4. **2.1 intelligence release:** 2.6 only after at least 8–12 weeks of trustworthy event data.

---

## 12. Metrics tree

### North star

- Retained active members: active entitlement + verified visit in trailing 14 days.

### Acquisition and activation

- Landing → checkout-start rate.
- Checkout-start → paid rate.
- Paid day pass → first verified visit rate.
- Time from payment to first visit.

### Retention

- D7, D14, D30 and D60 verified-visit retention by cohort/source.
- Weekly goal completion and recovery after a missed week.
- Members returning within seven days of becoming `at_risk`.
- Plan adherence and coach-intervention conversion.

### Revenue

- Day-pass → plan conversion within 1/3/7 days.
- On-time renewal rate.
- Lapsed → reactivated rate.
- Referral-acquired retained members and reward cost.
- Revenue per retained member, not only total collected.

### Operations

- Class utilization, waitlist conversion and no-show rate.
- Payment/booking reconciliation failures.
- Notification failure and opt-out rates.
- Coach task response and resolution time.

### Guardrails

- Support contacts per 100 active members.
- Notification unsubscribe/permission-denial rate.
- Refund/dispute rate.
- Booking oversell incidents: target zero.
- Unauthorized mutation incidents: target zero.

---

## 13. What not to build yet

- A generic social feed. It creates moderation work without proving gym attendance value.
- AI-generated training prescriptions without coach review and reliable exercise data.
- Complex nutrition or medical advice.
- More currencies/payment providers before PayPal reconciliation and entitlement correctness are complete.
- More badges simply to increase the badge count; add rewards only when they reinforce a desired behavior.
- Native iOS/Android apps before PWA retention and notification behavior justify the maintenance cost.

---

## 14. Immediate first sprint

1. Introduce server-issued member sessions and protect every member mutation.
2. Add the canonical event writer and instrument payment, check-in, workout, reservation and notification outcomes.
3. Build the entitlement decision and block unpaid/inactive reservations.
4. Make lifecycle channels independent so push works without email.
5. Add automated tests for identity, booking capacity, payment idempotency, referral reward and streak rules.
6. Build a small admin “System health” card showing cron, payment and notification status.

The first sprint is intentionally infrastructure-heavy. Once identity and events are correct, every later experiment becomes safer, faster and measurable.

---

*Version 1.0 proved the loop can exist. Version 2.0 should prove the loop can be trusted, operated and improved.*
