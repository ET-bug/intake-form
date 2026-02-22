import { createClient } from "@/lib/supabase/server";
import BookingFlow from "@/components/booking/BookingFlow";

export default async function BookPage() {
  const supabase = createClient();

  // Get the first active shop (MVP: single shop)
  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .single();

  if (!shop) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900">Coming Soon</h1>
        <p className="text-gray-500 mt-2">Online booking is not available yet.</p>
      </div>
    );
  }

  // Get active courses for this shop
  const { data: courses } = await supabase
    .from("shop_courses")
    .select("*, course_types(*)")
    .eq("shop_id", shop.id)
    .eq("active", true);

  return <BookingFlow shopId={shop.id} shopName={shop.name} courses={courses ?? []} />;
}
