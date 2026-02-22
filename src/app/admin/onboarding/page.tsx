import { createClient } from "@/lib/supabase/server";
import OnboardingWizard from "@/components/admin/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: admin } = await supabase
    .from("admins")
    .select("shop_id, shops(*)")
    .eq("id", session!.user.id)
    .single();

  const shopId = admin?.shop_id;

  // Fetch all existing config
  const [
    { data: shop },
    { data: beginnerThreshold },
    { data: capacityConfig },
    { data: pairingRules },
    { data: templateSlots },
    { data: funDives },
    { data: diveLocations },
  ] = await Promise.all([
    supabase.from("shops").select("*").eq("id", shopId).single(),
    supabase
      .from("beginner_thresholds")
      .select("*")
      .eq("shop_id", shopId)
      .single(),
    supabase
      .from("shop_capacity_configs")
      .select("*")
      .eq("shop_id", shopId)
      .single(),
    supabase
      .from("staff_pairing_rules")
      .select("*")
      .eq("shop_id", shopId)
      .order("num_beginners"),
    supabase
      .from("schedule_template_slots")
      .select("*, shop_fun_dives(*, dive_locations(*))")
      .eq("shop_id", shopId)
      .order("day_of_week"),
    supabase
      .from("shop_fun_dives")
      .select("*, dive_locations(*)")
      .eq("shop_id", shopId),
    supabase.from("dive_locations").select("*").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Setup & Configuration</h1>
        <p className="text-gray-500 mt-1">
          Configure your shop settings, capacity rules, and weekly schedule template.
        </p>
      </div>

      <OnboardingWizard
        shopId={shopId}
        shop={shop}
        beginnerThreshold={beginnerThreshold}
        capacityConfig={capacityConfig}
        pairingRules={pairingRules ?? []}
        templateSlots={templateSlots ?? []}
        funDives={funDives ?? []}
        diveLocations={diveLocations ?? []}
      />
    </div>
  );
}
