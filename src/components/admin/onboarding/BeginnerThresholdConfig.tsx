"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Info } from "lucide-react";
import { CertLevel } from "@/types";

const CERT_LEVELS: { value: CertLevel; label: string }[] = [
  { value: "open_water", label: "Open Water" },
  { value: "advanced", label: "Advanced" },
  { value: "rescue", label: "Rescue Diver" },
  { value: "divemaster", label: "Divemaster" },
  { value: "instructor", label: "Instructor" },
];

interface BeginnerThresholdConfigProps {
  shopId: string;
  threshold: {
    min_cert_level?: CertLevel;
    min_dives_logged?: number;
  } | null;
  onSaved: () => void;
}

export default function BeginnerThresholdConfig({
  shopId,
  threshold,
  onSaved,
}: BeginnerThresholdConfigProps) {
  const [certLevel, setCertLevel] = useState<CertLevel>(
    threshold?.min_cert_level ?? "rescue"
  );
  const [minDives, setMinDives] = useState(
    threshold?.min_dives_logged?.toString() ?? "20"
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    const dives = parseInt(minDives);
    if (isNaN(dives) || dives < 0) {
      toast({ title: "Invalid dive count", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("beginner_thresholds").upsert(
      {
        shop_id: shopId,
        min_cert_level: certLevel,
        min_dives_logged: dives,
      },
      { onConflict: "shop_id" }
    );
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Beginner threshold saved!" });
      router.refresh();
      onSaved();
    }
  }

  const certLabel = CERT_LEVELS.find((c) => c.value === certLevel)?.label ?? certLevel;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Beginner Threshold</CardTitle>
        <CardDescription>
          Define what counts as an "experienced" diver at your shop. This affects
          how capacity is calculated per trip.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            A diver is <strong>experienced</strong> if they have at least a{" "}
            <strong>{certLabel}</strong> cert <em>or</em> have logged at least{" "}
            <strong>{minDives || "?"}</strong> dives. Otherwise they're a{" "}
            <strong>beginner</strong>.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Minimum cert level for "experienced"</Label>
            <Select
              value={certLevel}
              onValueChange={(v) => setCertLevel(v as CertLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CERT_LEVELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Divers with this cert level or above count as experienced
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-dives">Minimum dives logged for "experienced"</Label>
            <Input
              id="min-dives"
              type="number"
              min="0"
              value={minDives}
              onChange={(e) => setMinDives(e.target.value)}
              className="max-w-[120px]"
            />
            <p className="text-xs text-gray-500">
              Divers with this many logged dives or more count as experienced
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Threshold"}
        </Button>
      </CardContent>
    </Card>
  );
}
