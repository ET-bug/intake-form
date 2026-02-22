-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE cert_level AS ENUM (
  'none', 'open_water', 'advanced', 'rescue', 'divemaster', 'instructor', 'other'
);

CREATE TYPE trip_duration AS ENUM ('half_day', 'full_day');
CREATE TYPE time_slot AS ENUM ('morning', 'afternoon', 'full_day');
CREATE TYPE trip_slot_status AS ENUM ('open', 'cancelled');
CREATE TYPE booking_type AS ENUM ('fun_dive', 'course');
CREATE TYPE booking_status AS ENUM ('pending_payment', 'confirmed', 'cancelled');
CREATE TYPE staff_role AS ENUM ('divemaster', 'instructor', 'guide');
CREATE TYPE day_of_week AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
CREATE TYPE override_action AS ENUM ('add', 'remove');

-- ============================================================
-- GLOBAL REFERENCE TABLES
-- ============================================================

CREATE TABLE dive_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  max_depth NUMERIC(5,1),
  coordinates TEXT, -- "lat,lng" string
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE course_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration_days INT NOT NULL DEFAULT 1,
  prerequisite_cert_level cert_level,
  max_students_per_instructor INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed global reference data
INSERT INTO dive_locations (name, description, max_depth) VALUES
  ('The Wall', 'Classic wall dive with vibrant coral', 30),
  ('Blue Hole', 'Famous sinkhole dive', 60),
  ('Coral Garden', 'Shallow reef for beginners', 12),
  ('Shipwreck Point', 'Historic wreck dive', 25),
  ('Turtle Bay', 'Sea turtle cleaning station', 18);

INSERT INTO course_types (name, duration_days, prerequisite_cert_level, max_students_per_instructor) VALUES
  ('Open Water', 4, NULL, 1),
  ('Advanced Open Water', 3, 'open_water', 1),
  ('Rescue Diver', 5, 'advanced', 1),
  ('Divemaster', 60, 'rescue', 1),
  ('Specialty', 2, 'open_water', 1);

-- ============================================================
-- SHOP & ADMIN
-- ============================================================

CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role staff_role NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SHOP CATALOG
-- ============================================================

CREATE TABLE shop_fun_dives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  dive_location_id UUID NOT NULL REFERENCES dive_locations(id),
  price_1_tank NUMERIC(10,2) NOT NULL,
  price_2_tank NUMERIC(10,2) NOT NULL,
  distance_from_shore_km NUMERIC(5,1),
  travel_time_mins INT,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shop_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  course_type_id UUID NOT NULL REFERENCES course_types(id),
  price NUMERIC(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ONBOARDING CONFIG
-- ============================================================

CREATE TABLE beginner_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  min_cert_level cert_level NOT NULL DEFAULT 'rescue',
  min_dives_logged INT NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shop_capacity_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  max_experienced_per_staff INT NOT NULL DEFAULT 5,
  max_beginners_per_staff INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE staff_pairing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  num_beginners INT NOT NULL,
  max_experienced_allowed INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, num_beginners)
);

CREATE TABLE schedule_template_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  shop_fun_dive_id UUID NOT NULL REFERENCES shop_fun_dives(id),
  trip_duration trip_duration NOT NULL DEFAULT 'full_day',
  time_slot time_slot NOT NULL DEFAULT 'full_day',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WEEKLY VARIABLES
-- ============================================================

CREATE TABLE weekly_staff_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL, -- always a Monday
  total_staff_available INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, week_start_date)
);

CREATE TABLE weekly_schedule_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  action override_action NOT NULL,
  shop_fun_dive_id UUID NOT NULL REFERENCES shop_fun_dives(id),
  trip_duration trip_duration NOT NULL,
  time_slot time_slot NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIP SLOTS (auto-generated)
-- ============================================================

CREATE TABLE trip_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shop_fun_dive_id UUID NOT NULL REFERENCES shop_fun_dives(id),
  trip_duration trip_duration NOT NULL,
  time_slot time_slot NOT NULL,
  status trip_slot_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS & BOOKINGS
-- ============================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  num_dives_logged INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  booking_type booking_type NOT NULL,
  trip_slot_id UUID REFERENCES trip_slots(id),
  shop_course_id UUID REFERENCES shop_courses(id),
  course_start_date DATE,
  num_dives INT CHECK (num_dives IN (1, 2)),
  is_beginner BOOLEAN NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending_payment',
  stripe_payment_id TEXT,
  amount_paid NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraints
  CONSTRAINT booking_type_consistency CHECK (
    (booking_type = 'fun_dive' AND trip_slot_id IS NOT NULL AND num_dives IS NOT NULL) OR
    (booking_type = 'course' AND shop_course_id IS NOT NULL AND course_start_date IS NOT NULL)
  )
);

CREATE TABLE gear_rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  items TEXT[] NOT NULL DEFAULT '{}',
  wetsuit_size TEXT,
  shoe_size_eu TEXT,
  weight_kg NUMERIC(5,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certification_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  cert_level cert_level NOT NULL,
  file_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE medical_declarations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  responses JSONB NOT NULL DEFAULT '{}',
  signed BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE waiver_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  signature_data TEXT NOT NULL -- typed full name
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_bookings_trip_slot ON bookings(trip_slot_id) WHERE status = 'confirmed';
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_trip_slots_date ON trip_slots(date, shop_id);
CREATE INDEX idx_weekly_staff_week ON weekly_staff_availability(shop_id, week_start_date);
CREATE INDEX idx_bookings_course_date ON bookings(course_start_date, shop_course_id) WHERE status = 'confirmed';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_fun_dives ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE beginner_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_capacity_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_pairing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_template_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedule_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_signatures ENABLE ROW LEVEL SECURITY;

-- Global reference tables are public read
ALTER TABLE dive_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dive_locations_public_read" ON dive_locations FOR SELECT USING (true);
CREATE POLICY "course_types_public_read" ON course_types FOR SELECT USING (true);

-- Helper function: get shop_id for current admin
CREATE OR REPLACE FUNCTION get_admin_shop_id()
RETURNS UUID AS $$
  SELECT shop_id FROM admins WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Shop policies
CREATE POLICY "admin_shop_select" ON shops FOR SELECT
  USING (id = get_admin_shop_id());
CREATE POLICY "admin_shop_update" ON shops FOR UPDATE
  USING (id = get_admin_shop_id());

-- Admin policies
CREATE POLICY "admin_self_select" ON admins FOR SELECT
  USING (id = auth.uid());

-- Staff policies
CREATE POLICY "admin_staff_all" ON staff FOR ALL
  USING (shop_id = get_admin_shop_id());

-- Shop catalog policies
CREATE POLICY "admin_fun_dives_all" ON shop_fun_dives FOR ALL
  USING (shop_id = get_admin_shop_id());
CREATE POLICY "public_fun_dives_read" ON shop_fun_dives FOR SELECT
  USING (active = true);

CREATE POLICY "admin_courses_all" ON shop_courses FOR ALL
  USING (shop_id = get_admin_shop_id());
CREATE POLICY "public_courses_read" ON shop_courses FOR SELECT
  USING (active = true);

-- Config policies (admin only)
CREATE POLICY "admin_beginner_threshold" ON beginner_thresholds FOR ALL
  USING (shop_id = get_admin_shop_id());
CREATE POLICY "admin_capacity_config" ON shop_capacity_configs FOR ALL
  USING (shop_id = get_admin_shop_id());
CREATE POLICY "admin_pairing_rules" ON staff_pairing_rules FOR ALL
  USING (shop_id = get_admin_shop_id());
CREATE POLICY "admin_template_slots" ON schedule_template_slots FOR ALL
  USING (shop_id = get_admin_shop_id());
CREATE POLICY "admin_weekly_staff" ON weekly_staff_availability FOR ALL
  USING (shop_id = get_admin_shop_id());
CREATE POLICY "admin_overrides" ON weekly_schedule_overrides FOR ALL
  USING (shop_id = get_admin_shop_id());

-- Trip slots: admin manages, public can read open slots
CREATE POLICY "admin_trip_slots_all" ON trip_slots FOR ALL
  USING (shop_id = get_admin_shop_id());
CREATE POLICY "public_trip_slots_read" ON trip_slots FOR SELECT
  USING (status = 'open');

-- Customer policies: allow insert for booking flow, admin sees all
CREATE POLICY "admin_customers_all" ON customers FOR ALL
  USING (get_admin_shop_id() IS NOT NULL);
CREATE POLICY "public_customers_insert" ON customers FOR INSERT
  WITH CHECK (true);
CREATE POLICY "public_customers_select_own" ON customers FOR SELECT
  USING (true); -- needed for booking lookups

-- Booking policies
CREATE POLICY "admin_bookings_all" ON bookings FOR ALL
  USING (
    trip_slot_id IN (SELECT id FROM trip_slots WHERE shop_id = get_admin_shop_id())
    OR shop_course_id IN (SELECT id FROM shop_courses WHERE shop_id = get_admin_shop_id())
  );
CREATE POLICY "public_bookings_insert" ON bookings FOR INSERT
  WITH CHECK (true);
CREATE POLICY "public_bookings_select" ON bookings FOR SELECT
  USING (true); -- needed for capacity calculations

-- Gear, medical, waiver: public insert, admin sees all
CREATE POLICY "public_gear_insert" ON gear_rentals FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_gear_all" ON gear_rentals FOR ALL USING (get_admin_shop_id() IS NOT NULL);

CREATE POLICY "public_cert_insert" ON certification_records FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_cert_all" ON certification_records FOR ALL USING (get_admin_shop_id() IS NOT NULL);

CREATE POLICY "public_medical_insert" ON medical_declarations FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_medical_all" ON medical_declarations FOR ALL USING (get_admin_shop_id() IS NOT NULL);

CREATE POLICY "public_waiver_insert" ON waiver_signatures FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_waiver_all" ON waiver_signatures FOR ALL USING (get_admin_shop_id() IS NOT NULL);
