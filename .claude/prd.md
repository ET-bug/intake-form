Product Requirements Document: Dive Shop OS

**Context**

Dive shops currently rely on static web forms and back-and-forth email to finalise bookings — a friction-heavy process that loses customers and wastes admin time. This product replaces that flow with a
live booking system: customers self-serve through a structured intake form, pay upfront, and land on the dive shop's schedule automatically. The dive shop admin gets a real-time dashboard to manage
everything without email chains.

MVP scope: Single dive shop. No customer accounts. Two trip types: Fun Dives and Dive Courses.

---

**User Personas**

Dive Shop Admin

- Manages bookings, staff, and schedule day-to-day
- Needs visibility into who's booked, their gear needs, and cert levels before each trip
- Not necessarily very technical — the dashboard must be simple and action-oriented

Customer (Diver)

- Wants to book a dive trip quickly without waiting on email replies
- May be a certified recreational diver or a first-timer enrolling in a course
- Needs to provide cert proof, gear needs, and sign a waiver — wants this done in one smooth flow

---

Goals & Success Metrics

┌───────────────────────────────────────┬─────────────────────────────────────────────────────────────┐
│                 Goal                  │                           Metric                            │
├───────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ Reduce booking friction for customers │ Booking completion rate > 70%                               │
├───────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ Eliminate email back-and-forth        │ Zero post-booking emails needed to confirm a trip           │
├───────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ Give admin real-time visibility       │ Admin can see full roster for any trip date within 2 clicks │
├───────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ Accurate capacity management          │ Zero overbookings                                           │
└───────────────────────────────────────┴─────────────────────────────────────────────────────────────┘

---

Architecture & Tech Stack

- Next.js 14 (App Router) — full-stack React, handles both frontend and API routes
- Supabase — PostgreSQL database, auth (admin login), file storage (cert card uploads), real-time
- Stripe — payment processing for bookings and courses
- Resend — transactional emails (confirmations, reminders, admin alerts)
- Vercel — hosting and deployment
- Shadcn/ui + Tailwind — component library with custom `ocean-*` colour palette

---

**Data Model**

Global Reference Tables (shared across all shops, seeded at deploy time)

DiveLocation
id, name, description, max_depth, coordinates
Seeded: The Wall, Blue Hole, Coral Garden, Shipwreck Point, Turtle Bay

CourseType
id, name, duration_days, prerequisite_cert_level, max_students_per_instructor
Seeded: Open Water (4d), Advanced Open Water (3d), Rescue Diver (5d), Divemaster (60d), Specialty (2d)

---

Shop & Admin

Shop
id, name, location, phone, email

Admin
id (→ auth.users), shop_id, email
One admin per shop for MVP. RLS uses get_admin_shop_id() helper to scope all queries.

Staff
id, shop_id, name, role (divemaster | instructor | guide), active

---

Shop Catalog (per-shop offerings)

ShopFunDive
id, shop_id, dive_location_id, price_1_tank, price_2_tank,
distance_from_shore_km, travel_time_mins, active, notes

ShopCourse
id, shop_id, course_type_id, price, active, notes

Note: DiveLocations and CourseTypes are global. Shops configure which ones they offer and at what price via ShopFunDive and ShopCourse.

---

Capacity Configuration (onboarding, per-shop)

BeginnerThreshold
id, shop_id, min_cert_level, min_dives_logged
Defines the threshold for "experienced" diver classification (see Capacity Engine).

ShopCapacityConfig
id, shop_id, max_experienced_per_staff, max_beginners_per_staff
The two limits that anchor the capacity calculation.

StaffPairingRule
id, shop_id, num_beginners, max_experienced_allowed
Lookup table auto-generated from ShopCapacityConfig via linear interpolation.
One row per possible beginner count (0 → max_beginners_per_staff).

---

Schedule System

ScheduleTemplateSlot
id, shop_id, day_of_week, shop_fun_dive_id, trip_duration (half_day | full_day),
time_slot (morning | afternoon | full_day), active
Defines the shop's repeating weekly schedule. Forms the basis for trip slot generation.

WeeklyStaffAvailability
id, shop_id, week_start_date (always Monday), total_staff_available
Admin sets headcount per week before generating slots.

WeeklyScheduleOverride
id, shop_id, date, action (add | remove), shop_fun_dive_id, trip_duration, time_slot
One-off additions or removals for a specific date, applied on top of the template.

TripSlot (generated)
id, shop_id, date, shop_fun_dive_id, trip_duration, time_slot, status (open | cancelled)
Concrete trip instances generated by the admin for a given week. Status is open or cancelled only —
"full" is derived in real time from the capacity calculation, not stored.

---

Customers & Bookings

Customer
id, email (unique), first_name, last_name, phone, num_dives_logged
Upserted by email on each booking. Decoupled from bookings so repeat customers accumulate history.

Booking
id, customer_id, booking_type (fun_dive | course)
trip_slot_id (nullable — set for fun dives), shop_course_id (nullable — set for courses)
course_start_date (nullable), num_dives (1 or 2, nullable — fun dives only)
is_beginner (derived at booking time from BeginnerThreshold + customer cert/dives)
status (pending_payment | confirmed | cancelled)
stripe_payment_id, amount_paid

GearRental
id, booking_id, items[] (BCD | wetsuit | regulator | fins | mask),
wetsuit_size, shoe_size_eu, weight_kg
Gear rental has no separate price — it is included in the trip/course fee.

CertificationRecord
id, customer_id (not booking_id — cert belongs to the customer), cert_level,
file_url, verified, uploaded_at

MedicalDeclaration
id, booking_id, completed_at, responses (JSONB), signed

WaiverSignature
id, booking_id, signed_at, ip_address, signature_data (typed full name)

---

**Capacity Engine**

This is the core business logic. The system dynamically calculates available spots per trip slot
as bookings are made, segmented by diver experience level.

**Step 1 — Diver Classification**

Each diver is classified as beginner or experienced at booking time using the shop's BeginnerThreshold:

  experienced = cert_level >= min_cert_level OR num_dives_logged >= min_dives_logged
  beginner = NOT experienced

The result is stored as is_beginner on the Booking record.

**Step 2 — Capacity Limits**

Given total_staff available for the week and the shop's ShopCapacityConfig:

  max_beginners_total = max_beginners_per_staff × total_staff
  max_experienced_total = lookup StaffPairingRule for current (num_beginners / total_staff)

**Step 3 — Pairing Rules (lookup table)**

StaffPairingRules encode the trade-off between beginners and experienced divers on a trip.
They are auto-generated during onboarding via linear interpolation:

  max_experienced_allowed[k beginners per staff] = floor(max_experienced_per_staff × (1 - k / max_beginners_per_staff))

Example (max_experienced=5, max_beginners=3):
  0 beginners/staff → 5 max experienced/staff
  1 beginner/staff  → 3 max experienced/staff
  2 beginners/staff → 1 max experienced/staff
  3 beginners/staff → 0 max experienced/staff

The admin can fine-tune these rules in the onboarding wizard after auto-generation.

**Capacity recalculates in real time** whenever a booking is confirmed or cancelled.
The booking form shows live availability — unavailable slots are greyed out automatically.
Trip slot status is only set to "cancelled" explicitly; "full" is always derived.

Note: Course bookings do NOT lock staff members. Staff capacity is managed purely through
the weekly staff headcount set in WeeklyStaffAvailability.

---

**Part 0: Admin Onboarding Wizard**

A first-time setup wizard that must be completed before the admin dashboard is accessible.
Five steps:

1. Shop Details — name, location, phone, email
2. Capacity Rules — set max_experienced_per_staff + max_beginners_per_staff; pairing table auto-generated and previewed inline
3. Beginner Threshold — set min_cert_level and min_dives_logged for "experienced" classification
4. Schedule Template — build the repeating weekly trip pattern (day + location + duration + time slot); can add multiple slots per day
5. Pairing Rule Editor — review and manually adjust the auto-generated StaffPairingRules if needed

---

**Part 1: Admin Dashboard**

Authentication

- Admin logs in with email + password (Supabase Auth)
- Single admin role for MVP (no role hierarchy)
- All /admin/* routes protected by Next.js middleware; redirect to /admin/login if no session

Schedule View (Home Screen)

- Week-view calendar showing all trip slots for the selected week
- Each slot shows: location, time slot, booked count / capacity (beginners + experienced), colour-coded status
- Navigate forward/back by week; "Today" shortcut
- Click any slot → Booking Roster (list of customers, gear needs, cert levels)

Booking Management

- View individual booking details: customer info, gear rental, cert upload, waiver status, payment status
- Cancel a booking — triggers customer refund via Stripe + cancellation email
- Modify a booking — edit date, number of dives, gear; re-send confirmation
- Add walk-in booking — admin fills the same intake form on behalf of a customer (payment marked as "paid in person")

Capacity Configuration

- Set WeeklyStaffAvailability per week (staff headcount)
- Apply WeeklyScheduleOverrides for one-off date changes (add or remove a trip slot)
- Trigger trip slot generation for a given week via admin API

Catalog Management

- Add/edit/deactivate ShopFunDive records (location + pricing)
- Add/edit/deactivate ShopCourse records (course type + pricing)

Notifications (received by admin)

- Email alert for every new confirmed booking (customer name, trip type, date)

---

**Part 2: Customer Booking Flow**

Single-page, multi-step form. No account creation required. Mobile-responsive. Progress bar shown throughout.

---

Step 1 — Choose Trip Type

- Fun Dive or Dive Course
- Short description of each to help customers choose

---

Step 2a — Fun Dive: Select Date & Dives

- Calendar showing only available (non-cancelled, non-full) trip slots
- Select number of dives: 1-tank or 2-tank
- Real-time availability shown (e.g. "4 spots left")

Step 2b — Dive Course: Select Course & Start Date

- List of active ShopCourses with name, duration, price, prerequisite cert level
- Date picker for course start date

---

Step 3 — Gear Rental

- Checkboxes: BCD, Wetsuit, Regulator, Fins, Mask (multi-select)
- If any item selected → collect: wetsuit size, shoe size (EU), weight (kg)
- "I'll bring my own gear" option (skips sizing, clears gear items)

---

Step 4 — Certification

- Select cert level: None / Open Water / Advanced / Rescue / Divemaster / Instructor / Other
- If booking Advanced or higher course: cert upload required
- If booking fun dive: cert upload strongly encouraged but not blocked
- For Open Water course: no cert required, skip upload

---

Step 5 — Medical Declaration

- Standard medical questionnaire (Y/N questions stored as JSONB)
- Must be completed and submitted to proceed

---

Step 6 — Liability Waiver

- Display full waiver text
- Typed full name + timestamp = digital signature
- Cannot proceed without signing

---

Step 7 — Personal Details

- First name, last name, email, phone number, number of dives logged
- Booking record created on submission of this step (status: pending_payment)
- num_dives_logged is used to classify the diver as beginner or experienced at booking time

---

Step 8 — Payment

- Stripe Checkout (hosted)
- Line item: trip/course name + description (date, location, or course start)
- On payment success → webhook confirms booking (status: confirmed), slot capacity updated
- On cancel → returns to /book with cancelled=true

---

Post-Booking

- Confirmation page with booking reference number
- Confirmation email (sent immediately): booking reference, trip date/type, gear summary
- Reminder email (sent 48hrs before trip): date, location, start time, what to bring, shop contact
- Admin receives new booking alert email

---

MVP vs. Future Scope

MVP (Built)

- Admin dashboard: schedule view, booking management, capacity config, catalog management
- Admin onboarding wizard: shop setup, capacity rules, beginner threshold, schedule template, pairing rules
- Customer booking flow: fun dives + courses, gear rental, cert upload, medical, waiver, Stripe payment
- Dynamic capacity engine: beginner/experienced classification + pairing rules
- Email notifications: confirmation, reminder, admin alert
- Admin: cancel/modify bookings, add walk-in bookings, generate trip slots per week

Future / Post-MVP

- Multi-shop / SaaS mode (each shop gets own subdomain + dashboard)
- Customer accounts (view booking history, re-book)
- Staff scheduling module (assign specific divemasters to specific trips)
- Gear inventory tracking (flag items as unavailable, reserve gear per booking)
- Export customer roster as PDF/CSV for trip day
- Group bookings (one person books for a group)
- Waitlist for full trips
- Reviews / post-dive feedback
- Course staff lock-in (reserve staff members for course duration, reducing fun dive capacity)

---

Open Questions

1. Divemaster courses — 60-day duration. Does a DM trainee lock a staff member for that full window, or are they treated as a customer? Currently not implemented — courses do not affect staff capacity.
2. Refund policy — currently Stripe refund is triggered on cancel but the policy (full/partial) is not configurable. Needs a configurable refund rule per shop.
3. Waiver text — shop must supply the legal waiver copy. Currently a placeholder.
4. Medical declaration questions — the specific Y/N questions are not yet defined in code (responses stored as free JSONB). Needs a defined question set (PADI standard or shop's own).
5. ~~Gear rental pricing~~ — resolved: gear rental is included in the trip/course fee, no separate line item.
6. Specialty courses — currently uses the global seeded CourseType list. Admin cannot add custom course types in MVP.

---

Verification Plan (How to Test End-to-End)

1. Admin completes onboarding wizard: shop details → capacity (5 exp/staff, 3 beg/staff) → beginner threshold (Rescue cert OR 20 dives) → schedule template (Mon–Fri fun dives) → review pairing rules
2. Admin sets weekly staff availability (5 staff) and generates trip slots for the current week
3. Customer completes booking flow: selects fun dive → picks a slot → rents full kit → cert level Open Water → medical → waiver → personal details + 10 dives logged → Stripe test card payment
4. Verify: booking appears on admin schedule as experienced (Open Water cert), email confirmation received, Stripe test charge shows, slot beginner/experienced counts updated
5. Repeat booking with a customer who has no cert + 5 dives logged → verify classified as beginner, beginner count on slot increases
6. Book until experienced cap is reached for a slot → verify slot shows as full for experienced divers, beginner spots still available
7. Admin cancels a booking → confirm Stripe refund initiated, customer receives cancellation email, capacity opens back up
8. Admin adds a walk-in booking → verify it appears on schedule, no Stripe charge
9. Trigger 48hr reminder manually → confirm reminder email received
