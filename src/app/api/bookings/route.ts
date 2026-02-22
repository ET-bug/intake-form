import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { classifyDiver } from "@/lib/capacity";
import { CertLevel } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

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
      medical_responses,
      waiver_signature,
      ip_address,
      shop_id,
    } = body;

    // Upsert customer
    const { data: customer, error: customerError } = await supabase
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

    // Get beginner threshold for the shop
    let shopIdForThreshold = shop_id;
    if (!shopIdForThreshold && trip_slot_id) {
      const { data: slot } = await supabase
        .from("trip_slots")
        .select("shop_id")
        .eq("id", trip_slot_id)
        .single();
      shopIdForThreshold = slot?.shop_id;
    }
    if (!shopIdForThreshold && shop_course_id) {
      const { data: course } = await supabase
        .from("shop_courses")
        .select("shop_id")
        .eq("id", shop_course_id)
        .single();
      shopIdForThreshold = course?.shop_id;
    }

    const { data: threshold } = await supabase
      .from("beginner_thresholds")
      .select("min_cert_level, min_dives_logged")
      .eq("shop_id", shopIdForThreshold)
      .single();

    const isBeginner = threshold
      ? classifyDiver(
          cert_level as CertLevel,
          parseInt(num_dives_logged) || 0,
          threshold.min_cert_level as CertLevel,
          threshold.min_dives_logged
        )
      : true;

    // Determine amount
    let amountPaid = 0;
    if (booking_type === "fun_dive" && trip_slot_id) {
      const { data: slot } = await supabase
        .from("trip_slots")
        .select("shop_fun_dives(price_1_tank, price_2_tank)")
        .eq("id", trip_slot_id)
        .single();
      const prices = (slot as { shop_fun_dives?: { price_1_tank?: number; price_2_tank?: number } })?.shop_fun_dives;
      amountPaid = num_dives === 2 ? (prices?.price_2_tank ?? 0) : (prices?.price_1_tank ?? 0);
    } else if (booking_type === "course" && shop_course_id) {
      const { data: course } = await supabase
        .from("shop_courses")
        .select("price")
        .eq("id", shop_course_id)
        .single();
      amountPaid = course?.price ?? 0;
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        customer_id: customer.id,
        booking_type,
        trip_slot_id: trip_slot_id || null,
        shop_course_id: shop_course_id || null,
        course_start_date: course_start_date || null,
        num_dives: num_dives || null,
        is_beginner: isBeginner,
        status: "pending_payment",
        amount_paid: amountPaid,
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Create gear rental record
    if (gear_items && gear_items.length > 0) {
      await supabase.from("gear_rentals").insert({
        booking_id: booking.id,
        items: gear_items,
        wetsuit_size: wetsuit_size || null,
        shoe_size_eu: shoe_size_eu || null,
        weight_kg: weight_kg ? parseFloat(weight_kg) : null,
      });
    }

    // Create certification record
    if (cert_level) {
      await supabase.from("certification_records").insert({
        customer_id: customer.id,
        cert_level,
        verified: false,
      });
    }

    // Create medical declaration
    if (medical_responses) {
      await supabase.from("medical_declarations").insert({
        booking_id: booking.id,
        responses: medical_responses,
        signed: true,
      });
    }

    // Create waiver signature
    if (waiver_signature) {
      await supabase.from("waiver_signatures").insert({
        booking_id: booking.id,
        ip_address: ip_address || request.headers.get("x-forwarded-for") || "unknown",
        signature_data: waiver_signature,
      });
    }

    return NextResponse.json({ bookingId: booking.id, amount: amountPaid });
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
