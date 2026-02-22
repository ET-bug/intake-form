import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.CheckoutSession;
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) return NextResponse.json({ received: true });

    // Update booking to confirmed
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        stripe_payment_id: session.payment_intent as string,
      })
      .eq("id", bookingId);

    if (error) {
      console.error("Failed to confirm booking:", error);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    // Send confirmation email (fire and forget)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
    } catch (e) {
      console.error("Failed to send confirmation email:", e);
    }
  }

  return NextResponse.json({ received: true });
}

export const config = {
  api: { bodyParser: false },
};
