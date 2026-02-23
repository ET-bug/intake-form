1. Last Updated: 23-02-2026
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
- Local dev environment fully working

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
- Supabase project created, migration run, admin user seeded
- Stripe CLI installed, webhook forwarding configured for local dev (`stripe listen --forward-to localhost:3000/api/stripe/webhook`)
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
- Supabase client library: `@supabase/ssr` (replaced `@supabase/auth-helpers-nextjs` which was incompatible)

---

## 2. Previous Session Plan

To be defined.

---

## 3. Previous Session Progress

### Tasks Worked On
- Created `.claude/context.md` and `.claude/prd.md` (documentation)
- Set up local development environment end-to-end
- Debugged and fixed 4 separate startup errors

### Code Changes Made
- `next.config.ts` → deleted; `next.config.mjs` created (Next.js 14 does not support `.ts` config files)
- `src/lib/supabase/client.ts` — updated import from `@supabase/auth-helpers-nextjs` → `@supabase/ssr`
- `src/lib/supabase/server.ts` — updated import from `@supabase/auth-helpers-nextjs` → `@supabase/ssr`
- `src/lib/supabase/middleware.ts` — rewrote to use `createServerClient` from `@supabase/ssr`
- `src/middleware.ts` — rewrote to use `createServerClient` from `@supabase/ssr`
- `src/app/admin/layout.tsx` — removed duplicate session check that caused infinite redirect loop on `/admin/login`
- `autoprefixer` and `@supabase/ssr` installed via npm

### Key Decisions
- Migrated entirely from `@supabase/auth-helpers-nextjs` to `@supabase/ssr` — the auth-helpers package did not export `createServerClient` at the installed version
- Auth protection handled solely by middleware; removed redundant check from admin layout

### Current System State
- **Works**: home page, admin login, local dev server (`npm run dev`), Stripe webhook listener
- **Not yet tested end-to-end**: onboarding wizard, booking flow, admin dashboard, email sending
- **Broken / missing**: `src/app/admin/schedule` empty directory (no page); `src/app/api/courses` empty directory; `src/hooks` empty directory
- **Known gaps**: medical declaration questions not defined (free JSONB); waiver text is a placeholder; refund policy not configurable; cert file upload storage bucket not verified
- **No tests** exist anywhere in the codebase

---

## 4. Incomplete / Actionable Items

### High Priority
- Walk through onboarding wizard end-to-end and verify it saves correctly to Supabase
- Verify Supabase storage bucket is configured for cert card file uploads
- Test booking flow end-to-end with Stripe test card

### Medium Priority
- `src/app/admin/schedule` — empty directory, clarify intent or delete
- `src/app/api/courses` — empty directory, likely a stub, delete if unused
- Define medical declaration questions (currently free JSONB)
- Supply waiver legal text (currently placeholder)

### Low Priority / Nice-to-have
- `src/hooks` — empty directory, delete if unused
- Add a test framework
- Cert upload verification UI (admin can see `verified: false` but no way to mark as verified)



