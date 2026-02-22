import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";
import { format } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();
    const supabase = createServiceClient();

    const { data: booking } = await supabase
      .from("bookings")
      .select(`
        *,
        customers(*),
        trip_slots(*, shop_fun_dives(*, dive_locations(*))),
        shop_courses(*, course_types(*))
      `)
      .eq("id", bookingId)
      .single();

    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const customer = booking.customers as { email?: string; first_name?: string; last_name?: string };

    let tripDetails = "";
    let tripDate = "";

    if (booking.booking_type === "fun_dive" && booking.trip_slots) {
      const slot = booking.trip_slots as { date?: string; shop_fun_dives?: { dive_locations?: { name?: string } } };
      tripDate = slot.date ?? "";
      const location = slot.shop_fun_dives?.dive_locations?.name ?? "TBD";
      tripDetails = `${booking.num_dives}-tank fun dive at ${location}`;
    } else if (booking.booking_type === "course" && booking.shop_courses) {
      const course = booking.shop_courses as { course_types?: { name?: string } };
      tripDate = booking.course_start_date ?? "";
      tripDetails = `${course.course_types?.name ?? "Dive Course"}`;
    }

    const formattedDate = tripDate
      ? format(new Date(tripDate + "T00:00:00"), "EEEE, MMMM d, yyyy")
      : "TBD";

    if (!customer?.email) {
      return NextResponse.json({ error: "No customer email" }, { status: 400 });
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: customer.email,
      subject: `Booking Cancelled — ${tripDetails}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Booking Cancelled</h1>
          <p>Hi ${customer.first_name},</p>
          <p>Your booking has been cancelled and a full refund has been initiated.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
            <p><strong>Booking Reference:</strong> ${bookingId.slice(0, 8).toUpperCase()}</p>
            <p><strong>Trip:</strong> ${tripDetails}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Refund:</strong> $${booking.amount_paid?.toFixed(2) ?? "0.00"} will be returned to your original payment method within 5–10 business days.</p>
          </div>
          <p>We're sorry to see you go! If you'd like to rebook, you're always welcome.</p>
          <p>If you have questions, please don't hesitate to reach out to the shop directly.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancellation email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
