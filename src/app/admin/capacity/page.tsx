import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WeeklyCapacityManager from "@/components/admin/WeeklyCapacityManager";
import TripSlotGenerator from "@/components/admin/TripSlotGenerator";
import { getWeekStart } from "@/lib/capacity";
import { format } from "date-fns";

export default async function CapacityPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: admin } = await supabase
    .from("admins")
    .select("shop_id")
    .eq("id", session!.user.id)
    .single();

  const shopId = admin?.shop_id;

  if (!shopId) redirect("/admin/onboarding");

  const weekStart = getWeekStart(new Date());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  // Fetch current and next week staff availability
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const nextWeekStr = nextWeekStart.toISOString().split("T")[0];

  const { data: staffAvailabilities } = await supabase
    .from("weekly_staff_availability")
    .select("*")
    .eq("shop_id", shopId)
    .in("week_start_date", [weekStartStr, nextWeekStr]);

  const thisWeekStaff = staffAvailabilities?.find(
    (s: { week_start_date: string }) => s.week_start_date === weekStartStr
  );
  const nextWeekStaff = staffAvailabilities?.find(
    (s: { week_start_date: string }) => s.week_start_date === nextWeekStr
  );

  // Fetch fun dives for override dropdowns
  const { data: funDives } = await supabase
    .from("shop_fun_dives")
    .select("*, dive_locations(name)")
    .eq("shop_id", shopId)
    .eq("active", true);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Weekly Capacity</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <WeeklyCapacityManager
          shopId={shopId}
          weekStartDate={weekStartStr}
          weekLabel={`This week (${format(weekStart, "MMM d")})`}
          initialStaff={thisWeekStaff?.total_staff_available ?? null}
        />
        <WeeklyCapacityManager
          shopId={shopId}
          weekStartDate={nextWeekStr}
          weekLabel={`Next week (${format(nextWeekStart, "MMM d")})`}
          initialStaff={nextWeekStaff?.total_staff_available ?? null}
        />
      </div>

      <TripSlotGenerator
        shopId={shopId}
        weekStartDate={weekStartStr}
        nextWeekStartDate={nextWeekStr}
        funDives={funDives ?? []}
      />
    </div>
  );
}
