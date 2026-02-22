import { createClient } from "@/lib/supabase/server";
import WeekCalendar from "@/components/admin/WeekCalendar";
import { getWeekStart } from "@/lib/capacity";
import { format, addDays } from "date-fns";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const supabase = createClient();

  // Determine which week to show
  const weekStartDate = searchParams.week
    ? new Date(searchParams.week + "T00:00:00")
    : getWeekStart(new Date());
  const weekStartStr = weekStartDate.toISOString().split("T")[0];
  const weekEndDate = addDays(weekStartDate, 6);
  const weekEndStr = weekEndDate.toISOString().split("T")[0];

  // Get current admin's shop
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data: admin } = await supabase
    .from("admins")
    .select("shop_id, shops(name)")
    .eq("id", session!.user.id)
    .single();

  const shopId = admin?.shop_id;

  // Get trip slots for this week
  const { data: tripSlots } = await supabase
    .from("trip_slots")
    .select("*, shop_fun_dives(*, dive_locations(*))")
    .eq("shop_id", shopId)
    .gte("date", weekStartStr)
    .lte("date", weekEndStr)
    .order("date");

  // Get confirmed booking counts per slot
  const slotIds = (tripSlots ?? []).map((s: { id: string }) => s.id);
  const { data: bookings } = slotIds.length
    ? await supabase
        .from("bookings")
        .select("trip_slot_id, is_beginner")
        .in("trip_slot_id", slotIds)
        .eq("status", "confirmed")
    : { data: [] };

  // Get weekly staff availability
  const { data: staffAvailability } = await supabase
    .from("weekly_staff_availability")
    .select("total_staff_available")
    .eq("shop_id", shopId)
    .eq("week_start_date", weekStartStr)
    .single();

  // Get capacity config for display
  const { data: capacityConfig } = await supabase
    .from("shop_capacity_configs")
    .select("max_beginners_per_staff")
    .eq("shop_id", shopId)
    .single();

  const { data: pairingRules } = await supabase
    .from("staff_pairing_rules")
    .select("*")
    .eq("shop_id", shopId)
    .order("num_beginners");

  // Build slot data with booking counts
  const slotsWithCounts = (tripSlots ?? []).map((slot: { id: string; [key: string]: unknown }) => {
    const slotBookings = (bookings ?? []).filter(
      (b: { trip_slot_id: string }) => b.trip_slot_id === slot.id
    );
    return {
      ...slot,
      num_beginners: slotBookings.filter((b: { is_beginner: boolean }) => b.is_beginner).length,
      num_experienced: slotBookings.filter((b: { is_beginner: boolean }) => !b.is_beginner).length,
      total_booked: slotBookings.length,
    };
  });

  const shopName = (admin?.shops as { name?: string } | null)?.name ?? "Dive Shop";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{shopName} — Schedule</h1>
          <p className="text-gray-500 text-sm mt-1">
            Week of {format(weekStartDate, "MMMM d")} –{" "}
            {format(weekEndDate, "MMMM d, yyyy")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Staff available this week</p>
          <p className="text-2xl font-bold text-ocean-700">
            {staffAvailability?.total_staff_available ?? "—"}
          </p>
        </div>
      </div>

      <WeekCalendar
        weekStartDate={weekStartStr}
        tripSlots={slotsWithCounts}
        totalStaff={staffAvailability?.total_staff_available ?? 0}
        maxBeginnersPerStaff={capacityConfig?.max_beginners_per_staff ?? 3}
        pairingRules={pairingRules ?? []}
        shopId={shopId}
      />
    </div>
  );
}
