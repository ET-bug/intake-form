"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Users } from "lucide-react";

interface WeeklyCapacityManagerProps {
  shopId: string;
  weekStartDate: string;
  weekLabel: string;
  initialStaff: number | null;
}

export default function WeeklyCapacityManager({
  shopId,
  weekStartDate,
  weekLabel,
  initialStaff,
}: WeeklyCapacityManagerProps) {
  const [staff, setStaff] = useState(initialStaff?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    const num = parseInt(staff);
    if (isNaN(num) || num < 0) {
      toast({ title: "Invalid number", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("weekly_staff_availability").upsert(
      {
        shop_id: shopId,
        week_start_date: weekStartDate,
        total_staff_available: num,
      },
      { onConflict: "shop_id,week_start_date" }
    );
    setLoading(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved!", description: `${num} staff set for ${weekLabel}` });
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-ocean-600" />
          {weekLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`staff-${weekStartDate}`}>Total staff available</Label>
          <div className="flex gap-2">
            <Input
              id={`staff-${weekStartDate}`}
              type="number"
              min="0"
              max="50"
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
              placeholder="e.g. 5"
              className="max-w-[120px]"
            />
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
        {initialStaff !== null && (
          <p className="text-sm text-gray-500">
            Currently set: <strong>{initialStaff}</strong> staff
          </p>
        )}
      </CardContent>
    </Card>
  );
}
