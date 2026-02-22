1. Last Updated: 22-02-2026
2. Session #: 3

---

## 1. Overall Project Progress

### Architecture and Setup
- Next.js 14 App Router — full-stack, API routes + server components
- Supabase — Postgres DB, Auth (admin email/password), RLS with `get_admin_shop_id()` helper scoping all admin queries to their shop
- Stripe Checkout (hosted) — payment flow, webhook confirms bookings
- Resend — transactional email (confirmation, cancellation, reminder)
- Vercel — hosting (`vercel.json` present)
- Tailwind CSS + shadcn/ui (Radix) — custom `ocean-*` colour palette in `tailwind.config.ts`
- All types centralised in `src/types/index.ts`
- Single migration file: `supabase/migrations/001_initial_schema.sql`

### Features Implemented
- **Customer booking flow** — 8-step multi-step form (trip type → slot/course → gear → cert → medical → waiver → personal details → Stripe payment). Booking record created at step 7; Stripe webhook confirms on payment.
- **Admin dashboard** — week-view calendar with capacity display per trip slot (beginners + experienced)
- **Admin bookings** — list view, cancel (Stripe refund), modify, walk-in booking form
- **Admin capacity** — set weekly staff headcount for current + next week; trip slot generator (triggers `POST /api/admin/trip-slots/generate`)
- **Admin catalog** — manage ShopFunDives and ShopCourses (add/edit/deactivate)
- **Admin onboarding wizard** — 5-step first-time setup: shop details → capacity rules → beginner threshold → schedule template → pairing rule editor
- **Capacity engine** (`src/lib/capacity.ts`) — diver classification (beginner/experienced via cert level OR dives logged), pairing rules lookup, `calculateCapacity()` function
- **Schedule system** — `schedule_template_slots` (weekly recurring template) + `weekly_schedule_overrides` (one-off add/remove) → generates `trip_slots`
- **Email routes** — `/api/emails/confirmation`, `/api/emails/cancellation`, `/api/emails/reminder`
- **Auth guard** — `src/middleware.ts` protects all `/admin/*` routes

### Infrastructure and Tooling
- RLS enabled on all tables; public policies allow insert for booking flow, read for open slots/active catalog
- Service role client (`createServiceClient()`) used in API routes that bypass RLS
- Auth-scoped client (`createClient()`) used in server components and admin reads
- No test framework set up

### Decisions Made
- `DiveLocation` and `CourseType` are global reference tables (seeded, no `shop_id`) — shops configure offerings via `ShopFunDive` and `ShopCourse`
- Pairing rules auto-generated via linear interpolation from `max_experienced_per_staff` + `max_beginners_per_staff`
- `is_beginner` computed at booking time and stored on `Booking` (not recalculated later)
- Trip slot `status` is only `open | cancelled` — "full" is always derived from capacity calculation, never stored
- `Customer` is upserted by email on each booking (no accounts, repeat customers accumulate history)
- `CertificationRecord` linked to `customer_id`, not `booking_id`
- Gear rental has no separate price — included in trip/course fee
- Course bookings do NOT lock staff members (course capacity is independent)

---

## 2. Last Session Progress

### Tasks Worked On
- Located missing PRD (was not committed to git; user re-provided it)
- Created `.claude/context.md` with full codebase documentation
- Updated `.claude/prd.md` to reflect current implementation (major divergence from original)

### Code Changes Made
- `.claude/context.md` — created (project reference doc: stack, structure, schema, conventions)
- `.claude/prd.md` — major rewrite: updated data model, capacity engine, added onboarding wizard section, resolved open questions, updated verification plan

### Key Decisions
- Established `.claude/context.md` as session-continuity document, updated via `/handover` skill at end of each session
- `.claude/prd.md` is the source-of-truth PRD going forward

### Current System State
- **Works**: all core features appear implemented and wired up end-to-end
- **Partially works / unknown**: email routes exist but content/templates not reviewed; cert file upload flow exists in UI but storage bucket setup not verified
- **Broken / missing**: `src/app/admin/schedule` is an empty directory (no `page.tsx`); `src/app/api/courses` is an empty directory; `src/hooks` is an empty directory
- **Known gaps**: medical declaration questions not defined (responses stored as free JSONB); waiver text is a placeholder; refund policy not configurable
- **No tests** exist anywhere in the codebase

---

## 3. Incomplete / Actionable Items

### High Priority
- Verify Supabase storage bucket is configured for cert card file uploads (referenced in UI but not confirmed)
- Clarify purpose of `src/app/admin/schedule` empty page — either implement or delete the stub directory

### Medium Priority
- `src/app/api/courses` — empty directory, unclear intent (courses are managed via catalog; may be a leftover stub)
- Define medical declaration questions (currently free JSONB — needs a fixed question set)
- Supply waiver legal text (currently placeholder)
- Make Stripe refund policy configurable per shop (currently always full refund on cancel)

### Low Priority / Nice-to-have
- `src/hooks` — empty directory, can be deleted if unused
- Add a test framework (none exists)
- Cert upload verification flow (admin can see `verified: false` but no UI to mark as verified)

---

## 4. Next Session Plan

To be defined.
