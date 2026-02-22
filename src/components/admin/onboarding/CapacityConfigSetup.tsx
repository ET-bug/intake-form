"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { generatePairingRules } from "@/lib/capacity";
import { Info } from "lucide-react";

interface CapacityConfigSetupProps {
  shopId: string;
  config: {
    max_experienced_per_staff?: number;
    max_beginners_per_staff?: number;
  } | null;
  onSaved: () => void;
}

export default function CapacityConfigSetup({
  shopId,
  config,
  onSaved,
}: CapacityConfigSetupProps) {
  const [maxExp, setMaxExp] = useState(config?.max_experienced_per_staff?.toString() ?? "5");
  const [maxBeg, setMaxBeg] = useState(config?.max_beginners_per_staff?.toString() ?? "3");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const maxExpNum = parseInt(maxExp) || 0;
  const maxBegNum = parseInt(maxBeg) || 0;

  // Preview the pairing table
  const preview = maxExpNum > 0 && maxBegNum > 0
    ? generatePairingRules(shopId, maxExpNum, maxBegNum)
    : [];

  async function handleSave() {
    const expNum = parseInt(maxExp);
    const begNum = parseInt(maxBeg);
    if (isNaN(expNum) || isNaN(begNum) || expNum <= 0 || begNum <= 0) {
      toast({ title: "Invalid values", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Save capacity config
    const { error: configError } = await supabase.from("shop_capacity_configs").upsert(
      {
        shop_id: shopId,
        max_experienced_per_staff: expNum,
        max_beginners_per_staff: begNum,
      },
      { onConflict: "shop_id" }
    );
    if (configError) {
      toast({ title: "Error", description: configError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Auto-generate pairing rules
    const rules = generatePairingRules(shopId, expNum, begNum);
    // Delete existing rules and re-insert
    await supabase.from("staff_pairing_rules").delete().eq("shop_id", shopId);
    const { error: rulesError } = await supabase.from("staff_pairing_rules").insert(rules);

    setLoading(false);
    if (rulesError) {
      toast({ title: "Error saving pairing rules", description: rulesError.message, variant: "destructive" });
    } else {
      toast({ title: "Capacity config saved!", description: "Pairing table auto-generated." });
      router.refresh();
      onSaved();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacity Rules</CardTitle>
        <CardDescription>
          Set the maximum number of divers per staff member based on experience level.
          The pairing table is auto-generated and can be fine-tuned in the next step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="max-exp">Max experienced divers per staff</Label>
            <Input
              id="max-exp"
              type="number"
              min="1"
              max="20"
              value={maxExp}
              onChange={(e) => setMaxExp(e.target.value)}
              className="max-w-[120px]"
            />
            <p className="text-xs text-gray-500">
              When no beginners are on the trip
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-beg">Max beginners per staff</Label>
            <Input
              id="max-beg"
              type="number"
              min="1"
              max="10"
              value={maxBeg}
              onChange={(e) => setMaxBeg(e.target.value)}
              className="max-w-[120px]"
            />
            <p className="text-xs text-gray-500">
              When only beginners are on the trip
            </p>
          </div>
        </div>

        {preview.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Auto-generated pairing table preview:</strong>
              <div className="mt-2 flex gap-4 flex-wrap">
                {preview.map((r) => (
                  <div
                    key={r.num_beginners}
                    className="bg-white border rounded px-3 py-1.5 text-sm"
                  >
                    <span className="text-gray-500">{r.num_beginners} beginner{r.num_beginners !== 1 ? "s" : ""} →</span>{" "}
                    <strong>{r.max_experienced_allowed} max exp</strong> per staff
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save & Generate Table"}
        </Button>
      </CardContent>
    </Card>
  );
}
