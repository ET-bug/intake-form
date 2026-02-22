import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    const supabase = createServiceClient();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        *,
        customers(*),
        trip_slots(*, shop_fun_dives(*, dive_locations(*))),
        shop_courses(*, course_types(*))
      `)
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "pending_payment") {
      return NextResponse.json({ error: "Booking already processed" }, { status: 400 });
    }

    // Build line item description
    let description = "";
    let productName = "";
    if (booking.booking_type === "fun_dive" && booking.trip_slots) {
      const slot = booking.trip_slots as { date?: string; shop_fun_dives?: { dive_locations?: { name?: string } } };
      const location = slot.shop_fun_dives?.dive_locations?.name ?? "Fun Dive";
      description = `${booking.num_dives}-tank dive at ${location} on ${slot.date}`;
      productName = `Fun Dive — ${location}`;
    } else if (booking.booking_type === "course" && booking.shop_courses) {
      const course = booking.shop_courses as { course_types?: { name?: string } };
      productName = `${course.course_types?.name ?? "Dive Course"} Course`;
      description = `Starting ${booking.course_start_date}`;
    }

    const amountInCents = Math.round((booking.amount_paid ?? 0) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/confirmation?booking_id=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/book?cancelled=true`,
      customer_email: booking.customers?.email,
      metadata: {
        booking_id: bookingId,
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
