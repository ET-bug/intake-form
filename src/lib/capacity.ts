import { CertLevel, StaffPairingRule } from "@/types";

// Cert level ordering for comparison
const CERT_LEVEL_ORDER: Record<CertLevel, number> = {
  none: 0,
  open_water: 1,
  advanced: 2,
  rescue: 3,
  divemaster: 4,
  instructor: 5,
  other: 1, // treat "other" as open water level
};

/**
 * Determine if a diver is a beginner based on the shop's threshold config.
 * Experienced = cert_level >= min_cert_level OR num_dives_logged >= min_dives_logged
 * Beginner = NOT experienced
 */
export function classifyDiver(
  certLevel: CertLevel,
  numDivesLogged: number,
  minCertLevel: CertLevel,
  minDivesLogged: number
): boolean {
  const isExperienced =
    CERT_LEVEL_ORDER[certLevel] >= CERT_LEVEL_ORDER[minCertLevel] ||
    numDivesLogged >= minDivesLogged;
  return !isExperienced; // true = beginner
}

/**
 * Generate StaffPairingRule rows using linear interpolation.
 * max_experienced_allowed[k] = floor(max_experienced * (1 - k / max_beginners))
 */
export function generatePairingRules(
  shopId: string,
  maxExperiencedPerStaff: number,
  maxBeginnersPerStaff: number
): Array<{ shop_id: string; num_beginners: number; max_experienced_allowed: number }> {
  const rules = [];
  for (let k = 0; k <= maxBeginnersPerStaff; k++) {
    const maxExp = Math.floor(maxExperiencedPerStaff * (1 - k / maxBeginnersPerStaff));
    rules.push({
      shop_id: shopId,
      num_beginners: k,
      max_experienced_allowed: maxExp,
    });
  }
  return rules;
}

/**
 * Get the max_experienced_allowed for a given number of beginners.
 * Clamps to the highest key if num_beginners exceeds the table.
 */
export function lookupMaxExperienced(
  pairingRules: StaffPairingRule[],
  numBeginners: number
): number {
  const sorted = [...pairingRules].sort((a, b) => a.num_beginners - b.num_beginners);

  // Find exact match
  const exact = sorted.find((r) => r.num_beginners === numBeginners);
  if (exact) return exact.max_experienced_allowed;

  // If above max, return 0 (can't add more experienced)
  const maxRule = sorted[sorted.length - 1];
  if (numBeginners > (maxRule?.num_beginners ?? 0)) return 0;

  return 0;
}

export interface CapacityState {
  availableStaff: number;
  numBeginners: number;
  numExperienced: number;
  maxBeginners: number;
  maxExperienced: number;
  canAddBeginner: boolean;
  canAddExperienced: boolean;
  spotsRemainingBeginners: number;
  spotsRemainingExperienced: number;
}

/**
 * Calculate the current capacity state for a trip slot.
 */
export function calculateCapacity(params: {
  availableStaff: number;
  numBeginners: number;
  numExperienced: number;
  maxBeginnersPerStaff: number;
  pairingRules: StaffPairingRule[];
}): CapacityState {
  const { availableStaff, numBeginners, numExperienced, maxBeginnersPerStaff, pairingRules } =
    params;

  if (availableStaff <= 0) {
    return {
      availableStaff: 0,
      numBeginners,
      numExperienced,
      maxBeginners: 0,
      maxExperienced: 0,
      canAddBeginner: false,
      canAddExperienced: false,
      spotsRemainingBeginners: 0,
      spotsRemainingExperienced: 0,
    };
  }

  // Calculate max totals
  const maxBeginners = maxBeginnersPerStaff * availableStaff;

  // For max experienced: based on current beginners per staff
  const beginnersPerStaff = Math.ceil(numBeginners / availableStaff);
  const maxExpPerStaff = lookupMaxExperienced(pairingRules, beginnersPerStaff);
  const maxExperienced = maxExpPerStaff * availableStaff;

  const canAddBeginner = numBeginners + 1 <= maxBeginners;

  // If we add a beginner, recalculate exp cap
  let canAddExperienced = false;
  if (numBeginners === 0) {
    // No beginners: use rule for 0 beginners
    canAddExperienced = numExperienced + 1 <= maxExperienced;
  } else {
    canAddExperienced = numExperienced + 1 <= maxExperienced;
  }

  return {
    availableStaff,
    numBeginners,
    numExperienced,
    maxBeginners,
    maxExperienced,
    canAddBeginner,
    canAddExperienced,
    spotsRemainingBeginners: Math.max(0, maxBeginners - numBeginners),
    spotsRemainingExperienced: Math.max(0, maxExperienced - numExperienced),
  };
}

/**
 * Get the ISO week start (Monday) for a given date.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Convert a Date to a day_of_week enum value.
 */
export function getDayOfWeek(
  date: Date
): "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun" {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  return days[date.getDay()];
}

/**
 * Check if cert level meets prerequisite.
 */
export function meetsPrerequisite(
  customerCert: CertLevel,
  prerequisite: CertLevel | null
): boolean {
  if (!prerequisite) return true;
  return CERT_LEVEL_ORDER[customerCert] >= CERT_LEVEL_ORDER[prerequisite];
}
