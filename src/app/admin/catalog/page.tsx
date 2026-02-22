import { createClient } from "@/lib/supabase/server";
import CatalogManager from "@/components/admin/CatalogManager";

export default async function CatalogPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: admin } = await supabase
    .from("admins")
    .select("shop_id")
    .eq("id", session!.user.id)
    .single();

  const shopId = admin?.shop_id;

  const [
    { data: funDives },
    { data: courses },
    { data: diveLocations },
    { data: courseTypes },
  ] = await Promise.all([
    supabase
      .from("shop_fun_dives")
      .select("*, dive_locations(*)")
      .eq("shop_id", shopId)
      .order("active", { ascending: false }),
    supabase
      .from("shop_courses")
      .select("*, course_types(*)")
      .eq("shop_id", shopId)
      .order("active", { ascending: false }),
    supabase.from("dive_locations").select("*").order("name"),
    supabase.from("course_types").select("*").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Catalog</h1>
      <CatalogManager
        shopId={shopId}
        funDives={funDives ?? []}
        courses={courses ?? []}
        diveLocations={diveLocations ?? []}
        courseTypes={courseTypes ?? []}
      />
    </div>
  );
}
