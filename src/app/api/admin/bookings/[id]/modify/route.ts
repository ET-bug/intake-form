import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const serviceSupabase = createServiceClient();

    // Verify admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { trip_slot_id, num_dives, gear_items } = await request.json();

    const { data: booking, error } = await serviceSupabase
      .from("bookings")
      .select("id, status, booking_type")
      .eq("id", params.id)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "Cannot modify a cancelled booking" }, { status: 400 });
    }

    // Build booking update payload
    const bookingUpdate: Record<string, unknown> = {};
    if (trip_slot_id !== undefined) bookingUpdate.trip_slot_id = trip_slot_id;
    if (num_dives !== undefined) bookingUpdate.num_dives = num_dives;

    if (Object.keys(bookingUpdate).length > 0) {
      const { error: updateError } = await serviceSupabase
        .from("bookings")
        .update(bookingUpdate)
        .eq("id", params.id);

      if (updateError) throw updateError;
    }

    // Update gear rental if provided
    if (gear_items !== undefined) {
      const { data: existingGear } = await serviceSupabase
        .from("gear_rentals")
        .select("id")
        .eq("booking_id", params.id)
        .single();

      if (existingGear) {
        await serviceSupabase
          .from("gear_rentals")
          .update({ items: gear_items })
          .eq("booking_id", params.id);
      } else if (gear_items.length > 0) {
        await serviceSupabase
          .from("gear_rentals")
          .insert({ booking_id: params.id, items: gear_items });
      }
    }

    // Resend confirmation email if booking is confirmed
    if (booking.status === "confirmed") {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/confirmation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: params.id }),
        });
      } catch (e) {
        console.error("Failed to resend confirmation email:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Modify booking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
