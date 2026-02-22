import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const serviceSupabase = createServiceClient();

    // Verify admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: booking, error } = await serviceSupabase
      .from("bookings")
      .select("*, customers(*)")
      .eq("id", params.id)
      .single();

    if (error || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status === "cancelled") return NextResponse.json({ error: "Already cancelled" }, { status: 400 });

    // Initiate Stripe refund if payment exists
    if (booking.stripe_payment_id) {
      try {
        await stripe.refunds.create({
          payment_intent: booking.stripe_payment_id,
        });
      } catch (stripeError) {
        console.error("Stripe refund error:", stripeError);
        // Continue with cancellation even if refund fails
      }
    }

    // Update booking status
    await serviceSupabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", params.id);

    // Send cancellation email (fire and forget)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/cancellation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: params.id }),
      });
    } catch (e) {
      console.error("Failed to send cancellation email:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
