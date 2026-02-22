import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getDayOfWeek } from "@/lib/capacity";
import { DayOfWeek } from "@/types";

const DAY_TO_NUM: Record<DayOfWeek, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const serviceSupabase = createServiceClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: admin } = await supabase
      .from("admins")
      .select("shop_id")
      .eq("id", session.user.id)
      .single();

    if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

    const body = await request.json();
    const { week_start_date } = body; // ISO date string (Monday)

    if (!week_start_date) return NextResponse.json({ error: "week_start_date required" }, { status: 400 });

    const weekStart = new Date(week_start_date + "T00:00:00");
    const shopId = admin.shop_id;

    // Get template slots for this shop
    const { data: templateSlots } = await supabase
      .from("schedule_template_slots")
      .select("*")
      .eq("shop_id", shopId)
      .eq("active", true);

    // Get overrides for this week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const { data: overrides } = await supabase
      .from("weekly_schedule_overrides")
      .select("*")
      .eq("shop_id", shopId)
      .gte("date", week_start_date)
      .lte("date", weekEnd.toISOString().split("T")[0]);

    // Build slots for each day of the week
    const slotsToCreate = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const dow = getDayOfWeek(date);

      // Get template slots for this day
      const dayTemplates = (templateSlots ?? []).filter(
        (s: { day_of_week: DayOfWeek }) => s.day_of_week === dow
      );

      // Apply overrides
      const dayOverrides = (overrides ?? []).filter((o: { date: string }) => o.date === dateStr);
      const removedFunDiveIds = dayOverrides
        .filter((o: { action: string }) => o.action === "remove")
        .map((o: { shop_fun_dive_id: string }) => o.shop_fun_dive_id);

      // Add template slots (minus removed ones)
      for (const tmpl of dayTemplates) {
        if (!removedFunDiveIds.includes(tmpl.shop_fun_dive_id)) {
          slotsToCreate.push({
            shop_id: shopId,
            date: dateStr,
            shop_fun_dive_id: tmpl.shop_fun_dive_id,
            trip_duration: tmpl.trip_duration,
            time_slot: tmpl.time_slot,
            status: "open",
          });
        }
      }

      // Add override "add" slots
      for (const override of dayOverrides.filter((o: { action: string }) => o.action === "add")) {
        slotsToCreate.push({
          shop_id: shopId,
          date: dateStr,
          shop_fun_dive_id: override.shop_fun_dive_id,
          trip_duration: override.trip_duration,
          time_slot: override.time_slot,
          status: "open",
        });
      }
    }

    // Delete existing slots for this week (to regenerate)
    await serviceSupabase
      .from("trip_slots")
      .delete()
      .eq("shop_id", shopId)
      .gte("date", week_start_date)
      .lte("date", weekEnd.toISOString().split("T")[0])
      .eq("status", "open"); // Don't delete cancelled ones

    // Insert new slots
    if (slotsToCreate.length > 0) {
      const { error } = await serviceSupabase.from("trip_slots").insert(slotsToCreate);
      if (error) throw error;
    }

    return NextResponse.json({ created: slotsToCreate.length });
  } catch (error) {
    console.error("Generate trip slots error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
