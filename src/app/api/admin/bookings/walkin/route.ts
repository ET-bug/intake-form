import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { classifyDiver } from "@/lib/capacity";
import { CertLevel } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const serviceSupabase = createServiceClient();

    // Verify admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      booking_type,
      trip_slot_id,
      shop_course_id,
      course_start_date,
      num_dives,
      cert_level,
      num_dives_logged,
      first_name,
      last_name,
      email,
      phone,
      gear_items,
      wetsuit_size,
      shoe_size_eu,
      weight_kg,
      amount_paid,
      shop_id,
    } = await request.json();

    // Upsert customer
    const { data: customer, error: customerError } = await serviceSupabase
      .from("customers")
      .upsert(
        {
          email,
          first_name,
          last_name,
          phone,
          num_dives_logged: parseInt(num_dives_logged) || 0,
        },
        { onConflict: "email", ignoreDuplicates: false }
      )
      .select()
      .single();

    if (customerError) throw customerError;

    // Get beginner threshold
    const { data: threshold } = await serviceSupabase
      .from("beginner_thresholds")
      .select("min_cert_level, min_dives_logged")
      .eq("shop_id", shop_id)
      .single();

    const isBeginner = threshold
      ? classifyDiver(
          cert_level as CertLevel,
          parseInt(num_dives_logged) || 0,
          threshold.min_cert_level as CertLevel,
          threshold.min_dives_logged
        )
      : true;

    // Create booking — confirmed immediately, no Stripe
    const { data: booking, error: bookingError } = await serviceSupabase
      .from("bookings")
      .insert({
        customer_id: customer.id,
        booking_type,
        trip_slot_id: trip_slot_id || null,
        shop_course_id: shop_course_id || null,
        course_start_date: course_start_date || null,
        num_dives: num_dives || null,
        is_beginner: isBeginner,
        status: "confirmed",
        amount_paid: parseFloat(amount_paid) || 0,
        stripe_payment_id: null,
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Create gear rental record
    if (gear_items && gear_items.length > 0) {
      await serviceSupabase.from("gear_rentals").insert({
        booking_id: booking.id,
        items: gear_items,
        wetsuit_size: wetsuit_size || null,
        shoe_size_eu: shoe_size_eu || null,
        weight_kg: weight_kg ? parseFloat(weight_kg) : null,
      });
    }

    // Create certification record
    if (cert_level && cert_level !== "none") {
      await serviceSupabase.from("certification_records").insert({
        customer_id: customer.id,
        cert_level,
        verified: true, // admin verified in person
      });
    }

    // Send confirmation email (fire and forget)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
    } catch (e) {
      console.error("Failed to send walk-in confirmation email:", e);
    }

    return NextResponse.json({ bookingId: booking.id });
  } catch (error) {
    console.error("Walk-in booking error:", error);
    return NextResponse.json({ error: "Failed to create walk-in booking" }, { status: 500 });
  }
}
