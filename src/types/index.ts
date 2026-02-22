export type CertLevel =
  | "none"
  | "open_water"
  | "advanced"
  | "rescue"
  | "divemaster"
  | "instructor"
  | "other";

export type TripDuration = "half_day" | "full_day";
export type TimeSlot = "morning" | "afternoon" | "full_day";
export type TripSlotStatus = "open" | "cancelled";
export type BookingType = "fun_dive" | "course";
export type BookingStatus = "pending_payment" | "confirmed" | "cancelled";
export type StaffRole = "divemaster" | "instructor" | "guide";
export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type OverrideAction = "add" | "remove";

export type GearItem = "BCD" | "wetsuit" | "regulator" | "fins" | "mask";

export interface Shop {
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
}

export interface Staff {
  id: string;
  shop_id: string;
  name: string;
  role: StaffRole;
  active: boolean;
}

export interface DiveLocation {
  id: string;
  name: string;
  description: string | null;
  max_depth: number | null;
  coordinates: string | null;
}

export interface CourseType {
  id: string;
  name: string;
  duration_days: number;
  prerequisite_cert_level: CertLevel | null;
  max_students_per_instructor: number;
}

export interface ShopFunDive {
  id: string;
  shop_id: string;
  dive_location_id: string;
  price_1_tank: number;
  price_2_tank: number;
  distance_from_shore_km: number | null;
  travel_time_mins: number | null;
  active: boolean;
  notes: string | null;
  dive_location?: DiveLocation;
}

export interface ShopCourse {
  id: string;
  shop_id: string;
  course_type_id: string;
  price: number;
  active: boolean;
  notes: string | null;
  course_type?: CourseType;
}

export interface BeginnerThreshold {
  id: string;
  shop_id: string;
  min_cert_level: CertLevel;
  min_dives_logged: number;
}

export interface ShopCapacityConfig {
  id: string;
  shop_id: string;
  max_experienced_per_staff: number;
  max_beginners_per_staff: number;
}

export interface StaffPairingRule {
  id: string;
  shop_id: string;
  num_beginners: number;
  max_experienced_allowed: number;
}

export interface ScheduleTemplateSlot {
  id: string;
  shop_id: string;
  day_of_week: DayOfWeek;
  shop_fun_dive_id: string;
  trip_duration: TripDuration;
  time_slot: TimeSlot;
  active: boolean;
  shop_fun_dive?: ShopFunDive;
}

export interface WeeklyStaffAvailability {
  id: string;
  shop_id: string;
  week_start_date: string; // ISO date string (Monday)
  total_staff_available: number;
}

export interface WeeklyScheduleOverride {
  id: string;
  shop_id: string;
  date: string; // ISO date string
  action: OverrideAction;
  shop_fun_dive_id: string;
  trip_duration: TripDuration;
  time_slot: TimeSlot;
}

export interface TripSlot {
  id: string;
  shop_id: string;
  date: string; // ISO date string
  shop_fun_dive_id: string;
  trip_duration: TripDuration;
  time_slot: TimeSlot;
  status: TripSlotStatus;
  shop_fun_dive?: ShopFunDive;
}

export interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  num_dives_logged: number;
  created_at: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  booking_type: BookingType;
  trip_slot_id: string | null;
  shop_course_id: string | null;
  course_start_date: string | null;
  num_dives: number | null;
  is_beginner: boolean;
  status: BookingStatus;
  stripe_payment_id: string | null;
  amount_paid: number | null;
  created_at: string;
  customer?: Customer;
  trip_slot?: TripSlot;
  shop_course?: ShopCourse;
  gear_rental?: GearRental;
  certification_record?: CertificationRecord;
  waiver_signature?: WaiverSignature;
  medical_declaration?: MedicalDeclaration;
}

export interface GearRental {
  id: string;
  booking_id: string;
  items: GearItem[];
  wetsuit_size: string | null;
  shoe_size_eu: string | null;
  weight_kg: number | null;
}

export interface CertificationRecord {
  id: string;
  customer_id: string;
  cert_level: CertLevel;
  file_url: string | null;
  verified: boolean;
  uploaded_at: string;
}

export interface MedicalDeclaration {
  id: string;
  booking_id: string;
  completed_at: string;
  responses: Record<string, boolean>;
  signed: boolean;
}

export interface WaiverSignature {
  id: string;
  booking_id: string;
  signed_at: string;
  ip_address: string;
  signature_data: string; // typed name
}

// Capacity calculation types
export interface TripCapacity {
  trip_slot_id: string;
  num_beginners: number;
  num_experienced: number;
  max_beginners: number;
  max_experienced: number;
  available_staff: number;
  is_full: boolean;
}

// Booking form state types
export interface BookingFormData {
  // Step 1
  booking_type: BookingType | null;

  // Step 2a - Fun Dive
  trip_slot_id: string | null;
  num_dives: 1 | 2 | null;

  // Step 2b - Course
  shop_course_id: string | null;
  course_start_date: string | null;

  // Step 3 - Gear
  gear_items: GearItem[];
  wetsuit_size: string;
  shoe_size_eu: string;
  weight_kg: string;
  bring_own_gear: boolean;

  // Step 4 - Cert
  cert_level: CertLevel | null;
  cert_file: File | null;

  // Step 5 - Medical
  medical_responses: Record<string, boolean>;

  // Step 6 - Waiver
  waiver_signature: string;

  // Step 7 - Personal details
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  num_dives_logged: string;
}
