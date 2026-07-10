# Strategy 2.0 — Hard path (session + entitlement + inventory)

**Owner track:** harder final stages (not the easy polish Codex is shipping).  
**Status:** Foundation landed · 2026-07-10

---

## What shipped

### 1. Member sessions (`lib/xtreme/session.ts`)

- Opaque random token → only **hash** stored in `xtreme_gym_sessions`.
- Cookie: `xtreme_member_session` (`HttpOnly`, `Secure` in prod, `SameSite=Lax`).
- Issued after successful PIN **set / verify / change / recover**.
- PIN change/recovery **rotates all sessions**.
- `requireMemberSession(req)` guard; mutations no longer trust body `memberName` as auth.

**Wired on**

| Route | Behavior |
|---|---|
| `POST /api/xtreme/pin` | Creates session cookie on success |
| `GET/DELETE /api/xtreme/session` | Inspect / logout |
| `PATCH /api/xtreme/user` | Session required; identity from cookie |
| `POST/DELETE /api/xtreme/reservations` | Session required |
| `POST /api/xtreme/social` | Session required |

### 2. Entitlement engine (`lib/xtreme/entitlements.ts`)

Pure decision:

```ts
canBook(entitlements, { trainingId, date }) ->
  | { allowed: true; entitlementId }
  | { allowed: false; reason: payment_required | expired | limit_reached | ... }
```

- Collection `xtreme_gym_entitlements` + append-only `xtreme_gym_entitlement_ledger`.
- Payment capture **grants** plan / day_pass / senior credits.
- Day pass: dated window + `remainingBookings: 1`.
- Plans: unlimited bookings until `endsOn`.
- **Legacy backfill:** active `membership.nextBillingDate` auto-migrates to an entitlement so existing members are not locked out.
- Consume on book; restore credit on cancel (limited passes).

### 3. Transactional class inventory (`lib/xtreme/inventory.ts`)

| Collection | Role |
|---|---|
| `xtreme_gym_class_templates` | Seeded from `TRAININGS` |
| `xtreme_gym_class_sessions` | Daily instance + **atomic `bookedCount`** |
| `xtreme_gym_bookings` | Member booking row (unique reserved per session+member) |
| `xtreme_gym_waitlist` | Schema reserved for promotion (next slice) |

**Atomic book path**

1. Entitlement check  
2. `findOneAndUpdate` with `$expr: bookedCount < capacity` + `$inc`  
3. Insert booking (unique index)  
4. Consume limited entitlement  
5. Rollback capacity on failure  

Oversell under concurrency → **target zero**.

### 4. Payment → entitlement → optional booking

`POST /api/xtreme/checkout/capture-order`

- Idempotent on `paypalCaptureId`
- Grants entitlement after payment
- If body includes `trainingId` + `trainingName` (+ `trainingDate`), **auto-books** the class with that entitlement
- Returns `entitlementId`, `bookingId`, `membershipUntil`

### 5. Admin operations API

`GET/POST /api/xtreme/admin/operations`

- List sessions + bookings + counts for a date  
- `upsertSession`, `grantEntitlement`, `revokeEntitlement`, `attendance`  
- Audit log on mutations  

---

## Client impact

- After PIN login, cookie is set automatically (same-origin fetch).
- Reserve without plan → **HTTP 402** + `paymentRequired: true` + `checkoutOptionId: "day-pass"`.
- App shows copy pointing to Precios / Primer día.
- Workout / profile PATCH without session → **401** `session_required` (must re-enter PIN if cookie missing).

---

## Still open (not this track / next slices)

- Waitlist auto-promotion + push offer window  
- Full admin schedule UI (API ready; tab UI can be Codex or follow-up)  
- PayPal webhook reconciliation for refunds → `revokeEntitlement`  
- Push route session binding  
- Browser smoke tests for concurrent booking race  
- Split monolith components (engineering quality track)

---

## Env / indexes

Indexes created in `lib/helpers/mongodb.ts` for sessions (TTL), entitlements, ledger, templates, sessions, bookings (partial unique on reserved), waitlist.

No new env vars for this track (uses existing Mongo + PIN flow).

---

*Coordinate with Codex: their easy track should not reintroduce `memberName`-as-auth on mutation routes, and should call capture with class metadata when converting “pay then reserve”.*
