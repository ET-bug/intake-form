import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";
import { format, addDays } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be called by a cron job
    // Vercel Cron or external scheduler sends POST to this route daily
    const supabase = createServiceClient();

    const targetDate = format(addDays(new Date(), 2), "yyyy-MM-dd");

    // Find all confirmed fun dive bookings for 2 days from now
    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        *,
        customers(*),
        trip_slots(*, shop_fun_dives(*, dive_locations(*)))
      `)
      .eq("status", "confirmed")
      .eq("booking_type", "fun_dive");

    const relevantBookings = (bookings ?? []).filter((b: { trip_slots?: { date?: string } }) =>
      b.trip_slots?.date === targetDate
    );

    // Get shop info
    const { data: shop } = await supabase.from("shops").select("*").single();

    for (const booking of relevantBookings) {
      const customer = booking.customers as { email?: string; first_name?: string };
      if (!customer?.email) continue;

      const slot = booking.trip_slots as { date?: string; time_slot?: string; shop_fun_dives?: { dive_locations?: { name?: string } } };
      const location = slot.shop_fun_dives?.dive_locations?.name ?? "TBD";
      const formattedDate = slot.date ? format(new Date(slot.date + "T00:00:00"), "EEEE, MMMM d") : "TBD";
      const timeSlot = slot.time_slot === "morning" ? "Morning (8:00 AM)" : slot.time_slot === "afternoon" ? "Afternoon (1:00 PM)" : "Full Day (8:00 AM)";

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: customer.email,
        subject: `Your dive is tomorrow! — ${location}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0369a1;">Your dive is tomorrow! 🤿</h1>
            <p>Hi ${customer.first_name},</p>
            <p>Just a reminder that your dive is coming up:</p>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Location:</strong> ${location}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${timeSlot}</p>
            </div>
            <h3>Remember to bring:</h3>
            <ul>
              <li>Your certification card</li>
              <li>Towel and swimwear</li>
              <li>Sunscreen (reef-safe please!)</li>
              <li>Water bottle</li>
              <li>Any personal gear items</li>
            </ul>
            <p>Questions? Contact us at ${shop?.phone ?? shop?.email ?? "the shop"}.</p>
            <p>See you tomorrow!</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ sent: relevantBookings.length });
  } catch (error) {
    console.error("Reminder email error:", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
