import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Mail } from "lucide-react";
import { format } from "date-fns";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: { booking_id?: string; session_id?: string };
}) {
  const bookingId = searchParams.booking_id;

  if (!bookingId) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold">Invalid booking reference</h1>
        <Link href="/book">
          <Button className="mt-4">Book Again</Button>
        </Link>
      </div>
    );
  }

  const supabase = createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customers(first_name, email),
      trip_slots(date, time_slot, shop_fun_dives(dive_locations(name))),
      shop_courses(course_types(name))
    `
    )
    .eq("id", bookingId)
    .single();

  const customer = booking?.customers as { first_name?: string; email?: string } | null;
  const slot = booking?.trip_slots as {
    date?: string;
    time_slot?: string;
    shop_fun_dives?: { dive_locations?: { name?: string } };
  } | null;
  const course = booking?.shop_courses as { course_types?: { name?: string } } | null;

  let tripSummary = "";
  if (booking?.booking_type === "fun_dive" && slot) {
    const location = slot.shop_fun_dives?.dive_locations?.name ?? "Dive";
    const date = slot.date ? format(new Date(slot.date + "T00:00:00"), "EEEE, MMMM d, yyyy") : "";
    tripSummary = `${booking.num_dives}-tank dive at ${location} · ${date}`;
  } else if (booking?.booking_type === "course" && course) {
    const courseName = course.course_types?.name ?? "Course";
    const startDate = booking.course_start_date
      ? format(new Date(booking.course_start_date + "T00:00:00"), "MMMM d, yyyy")
      : "";
    tripSummary = `${courseName} starting ${startDate}`;
  }

  const ref = bookingId.slice(0, 8).toUpperCase();

  return (
    <div className="text-center space-y-8 py-8">
      <div className="flex justify-center">
        <div className="bg-green-100 rounded-full p-6">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Booking Confirmed!</h1>
        {customer?.first_name && (
          <p className="text-gray-500 mt-2 text-lg">
            Thanks, {customer.first_name}! We can&apos;t wait to dive with you.
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 text-left max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-ocean-100 p-2 rounded-lg">
            <Calendar className="h-5 w-5 text-ocean-700" />
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Booking Reference</div>
            <div className="font-bold text-xl text-gray-900">{ref}</div>
          </div>
        </div>

        {tripSummary && (
          <div className="border-t pt-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your Trip</div>
            <div className="font-medium text-gray-800">{tripSummary}</div>
          </div>
        )}

        {customer?.email && (
          <div className="flex items-start gap-3 border-t pt-4">
            <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="text-sm text-gray-600">
              A confirmation email has been sent to{" "}
              <strong>{customer.email}</strong>. You&apos;ll also receive a reminder
              48 hours before your dive.
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-gray-500 text-sm">Need to change something?</p>
        <Link href="/book">
          <Button variant="outline">Book Another Dive</Button>
        </Link>
      </div>
    </div>
  );
}
