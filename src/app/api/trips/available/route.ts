import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateCapacity, getWeekStart } from "@/lib/capacity";
import { StaffPairingRule } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    const shopId = searchParams.get("shop_id");

    if (!startDate || !endDate || !shopId) {
      return NextResponse.json({ error: "Missing required params" }, { status: 400 });
    }

    // Get all open trip slots in range
    const { data: tripSlots, error } = await supabase
      .from("trip_slots")
      .select("*, shop_fun_dives(*, dive_locations(*))")
      .eq("shop_id", shopId)
      .eq("status", "open")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date");

    if (error) throw error;

    // Get capacity config once
    const { data: capacityConfig } = await supabase
      .from("shop_capacity_configs")
      .select("max_beginners_per_staff")
      .eq("shop_id", shopId)
      .single();

    const maxBeginnersPerStaff = capacityConfig?.max_beginners_per_staff ?? 3;

    const { data: pairingRules } = await supabase
      .from("staff_pairing_rules")
      .select("*")
      .eq("shop_id", shopId)
      .order("num_beginners");

    // Get all weekly staff availabilities for the date range
    const weekStarts = new Set<string>();
    for (const slot of tripSlots ?? []) {
      const d = new Date(slot.date + "T00:00:00");
      weekStarts.add(getWeekStart(d).toISOString().split("T")[0]);
    }

    const staffByWeek: Record<string, number> = {};
    for (const ws of weekStarts) {
      const { data: avail } = await supabase
        .from("weekly_staff_availability")
        .select("total_staff_available")
        .eq("shop_id", shopId)
        .eq("week_start_date", ws)
        .single();
      staffByWeek[ws] = avail?.total_staff_available ?? 0;
    }

    // Get course bookings for staff deduction
    const { data: shopCourses } = await supabase
      .from("shop_courses")
      .select("id")
      .eq("shop_id", shopId);

    const { data: courseBookings } = shopCourses?.length
      ? await supabase
          .from("bookings")
          .select("course_start_date, shop_courses(course_type_id, course_types(duration_days))")
          .eq("booking_type", "course")
          .eq("status", "confirmed")
          .in("shop_course_id", shopCourses.map((c: { id: string }) => c.id))
      : { data: [] };

    // Get all bookings for these trip slots
    const slotIds = (tripSlots ?? []).map((s: { id: string }) => s.id);
    const { data: allBookings } = slotIds.length
      ? await supabase
          .from("bookings")
          .select("trip_slot_id, is_beginner")
          .in("trip_slot_id", slotIds)
          .eq("status", "confirmed")
      : { data: [] };

    // Build result with capacity per slot
    const result = (tripSlots ?? []).map((slot: { id: string; date: string; shop_id: string; shop_fun_dives: unknown; trip_duration: string; time_slot: string; status: string }) => {
      const slotDate = new Date(slot.date + "T00:00:00");
      const weekStart = getWeekStart(slotDate).toISOString().split("T")[0];
      const totalStaff = staffByWeek[weekStart] ?? 0;

      // Count course staff consumed on this date
      let courseStaffConsumed = 0;
      for (const booking of courseBookings ?? []) {
        if (!booking.course_start_date) continue;
        const startD = new Date(booking.course_start_date + "T00:00:00");
        const dur = (booking as { shop_courses?: { course_types?: { duration_days?: number } } }).shop_courses?.course_types?.duration_days ?? 1;
        const endD = new Date(startD);
        endD.setDate(endD.getDate() + dur - 1);
        if (slotDate >= startD && slotDate <= endD) courseStaffConsumed += 1;
      }

      const availableStaff = Math.max(0, totalStaff - courseStaffConsumed);
      const slotBookings = (allBookings ?? []).filter((b: { trip_slot_id: string; is_beginner: boolean }) => b.trip_slot_id === slot.id);
      const numBeginners = slotBookings.filter((b: { is_beginner: boolean }) => b.is_beginner).length;
      const numExperienced = slotBookings.filter((b: { is_beginner: boolean }) => !b.is_beginner).length;

      const capacity = calculateCapacity({
        availableStaff,
        numBeginners,
        numExperienced,
        maxBeginnersPerStaff,
        pairingRules: (pairingRules ?? []) as StaffPairingRule[],
      });

      return { ...slot, capacity };
    });

    return NextResponse.json({ trips: result });
  } catch (error) {
    console.error("Error fetching available trips:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
