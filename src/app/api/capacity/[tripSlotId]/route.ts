import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateCapacity, getWeekStart } from "@/lib/capacity";
import { StaffPairingRule } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { tripSlotId: string } }
) {
  try {
    const supabase = createClient();

    // Get the trip slot
    const { data: tripSlot, error: slotError } = await supabase
      .from("trip_slots")
      .select("*, shop_fun_dives(*, dive_locations(*))")
      .eq("id", params.tripSlotId)
      .single();

    if (slotError || !tripSlot) {
      return NextResponse.json({ error: "Trip slot not found" }, { status: 404 });
    }

    // Get weekly staff availability for this date
    const slotDate = new Date(tripSlot.date + "T00:00:00");
    const weekStart = getWeekStart(slotDate);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const { data: staffAvailability } = await supabase
      .from("weekly_staff_availability")
      .select("total_staff_available")
      .eq("shop_id", tripSlot.shop_id)
      .eq("week_start_date", weekStartStr)
      .single();

    const totalStaff = staffAvailability?.total_staff_available ?? 0;

    // Count course bookings consuming staff on this date
    const { data: shopCourses } = await supabase
      .from("shop_courses")
      .select("id, course_types(duration_days)")
      .eq("shop_id", tripSlot.shop_id);

    // Get all confirmed course bookings that span this date
    let courseStaffConsumed = 0;
    if (shopCourses && shopCourses.length > 0) {
      const { data: courseBookings } = await supabase
        .from("bookings")
        .select("course_start_date, shop_course_id, shop_courses(course_type_id, course_types(duration_days))")
        .eq("booking_type", "course")
        .eq("status", "confirmed")
        .in("shop_course_id", shopCourses.map((c: { id: string }) => c.id));

      if (courseBookings) {
        for (const booking of courseBookings) {
          if (!booking.course_start_date) continue;
          const startDate = new Date(booking.course_start_date + "T00:00:00");
          const duration = (booking as { shop_courses?: { course_types?: { duration_days?: number } } }).shop_courses?.course_types?.duration_days ?? 1;
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + duration - 1);
          if (slotDate >= startDate && slotDate <= endDate) {
            courseStaffConsumed += 1;
          }
        }
      }
    }

    const availableStaff = Math.max(0, totalStaff - courseStaffConsumed);

    // Count current bookings on this trip slot
    const { data: bookings } = await supabase
      .from("bookings")
      .select("is_beginner")
      .eq("trip_slot_id", params.tripSlotId)
      .eq("status", "confirmed");

    const numBeginners = bookings?.filter((b: { is_beginner: boolean }) => b.is_beginner).length ?? 0;
    const numExperienced = bookings?.filter((b: { is_beginner: boolean }) => !b.is_beginner).length ?? 0;

    // Get shop capacity config
    const { data: capacityConfig } = await supabase
      .from("shop_capacity_configs")
      .select("max_beginners_per_staff")
      .eq("shop_id", tripSlot.shop_id)
      .single();

    const maxBeginnersPerStaff = capacityConfig?.max_beginners_per_staff ?? 3;

    // Get pairing rules
    const { data: pairingRules } = await supabase
      .from("staff_pairing_rules")
      .select("*")
      .eq("shop_id", tripSlot.shop_id)
      .order("num_beginners");

    const capacity = calculateCapacity({
      availableStaff,
      numBeginners,
      numExperienced,
      maxBeginnersPerStaff,
      pairingRules: (pairingRules ?? []) as StaffPairingRule[],
    });

    return NextResponse.json({
      tripSlot,
      capacity,
    });
  } catch (error) {
    console.error("Capacity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
