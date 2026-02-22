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
        shop_courses(*, course_types(*)),
        gear_rentals(*)
      `)
      .eq("id", bookingId)
      .single();

    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const customer = booking.customers as { email?: string; first_name?: string; last_name?: string };
    const gearRental = booking.gear_rentals as { items?: string[] } | null;

    let tripDetails = "";
    let tripDate = "";

    if (booking.booking_type === "fun_dive" && booking.trip_slots) {
      const slot = booking.trip_slots as { date?: string; time_slot?: string; shop_fun_dives?: { dive_locations?: { name?: string } } };
      tripDate = slot.date ?? "";
      const location = slot.shop_fun_dives?.dive_locations?.name ?? "TBD";
      tripDetails = `${booking.num_dives}-tank fun dive at ${location}`;
    } else if (booking.booking_type === "course" && booking.shop_courses) {
      const course = booking.shop_courses as { course_types?: { name?: string; duration_days?: number } };
      tripDate = booking.course_start_date ?? "";
      tripDetails = `${course.course_types?.name ?? "Dive Course"} (${course.course_types?.duration_days ?? 1} days)`;
    }

    const formattedDate = tripDate ? format(new Date(tripDate + "T00:00:00"), "EEEE, MMMM d, yyyy") : "TBD";
    const gearList = gearRental?.items?.length ? gearRental.items.join(", ") : "None";

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: customer.email!,
      subject: `Booking Confirmed — ${tripDetails}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0369a1;">Booking Confirmed! 🤿</h1>
          <p>Hi ${customer.first_name},</p>
          <p>Your booking is confirmed. Here's your summary:</p>
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Booking Reference:</strong> ${bookingId.slice(0, 8).toUpperCase()}</p>
            <p><strong>Trip:</strong> ${tripDetails}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Gear Rental:</strong> ${gearList}</p>
            <p><strong>Amount Paid:</strong> $${booking.amount_paid?.toFixed(2)}</p>
          </div>
          <h3>What to bring:</h3>
          <ul>
            <li>Your certification card (if you have one)</li>
            <li>Towel and swimwear</li>
            <li>Sunscreen</li>
            <li>Water bottle</li>
          </ul>
          <p>See you at the dive site!</p>
        </div>
      `,
    });

    // Send admin alert
    const { data: shop } = await supabase
      .from("shops")
      .select("email, name")
      .single();

    if (shop?.email) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: shop.email,
        subject: `New Booking — ${customer.first_name} ${customer.last_name}`,
        html: `
          <p>New booking received:</p>
          <p><strong>Customer:</strong> ${customer.first_name} ${customer.last_name} (${customer.email})</p>
          <p><strong>Trip:</strong> ${tripDetails}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Reference:</strong> ${bookingId.slice(0, 8).toUpperCase()}</p>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Confirmation email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
