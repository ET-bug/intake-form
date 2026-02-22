import { createClient } from "@/lib/supabase/server";
import WalkInBookingForm from "@/components/admin/WalkInBookingForm";

export default async function WalkInPage() {
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

  const start = new Date().toISOString().split("T")[0];
  const end = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Fetch open trip slots for the next 90 days
  const { data: tripSlots } = await supabase
    .from("trip_slots")
    .select("id, date, time_slot, shop_fun_dives(dive_locations(name))")
    .eq("shop_id", shopId)
    .eq("status", "open")
    .gte("date", start)
    .lte("date", end)
    .order("date");

  // Fetch active courses
  const { data: courses } = await supabase
    .from("shop_courses")
    .select("id, price, course_types(name, duration_days)")
    .eq("shop_id", shopId)
    .eq("active", true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Walk-In Booking</h1>
        <p className="text-gray-500 text-sm mt-1">
          Create a confirmed booking for a customer paying in person.
        </p>
      </div>

      <WalkInBookingForm
        shopId={shopId}
        tripSlots={(tripSlots ?? []) as Parameters<typeof WalkInBookingForm>[0]["tripSlots"]}
        courses={(courses ?? []) as Parameters<typeof WalkInBookingForm>[0]["courses"]}
      />
    </div>
  );
}
