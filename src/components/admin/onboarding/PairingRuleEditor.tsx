"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle } from "lucide-react";

interface Rule {
  id?: string;
  num_beginners: number;
  max_experienced_allowed: number;
}

interface PairingRuleEditorProps {
  shopId: string;
  rules: Rule[];
  capacityConfig: {
    max_experienced_per_staff?: number;
    max_beginners_per_staff?: number;
  } | null;
  onSaved: () => void;
}

export default function PairingRuleEditor({
  shopId,
  rules,
  onSaved,
}: PairingRuleEditorProps) {
  const [localRules, setLocalRules] = useState<Rule[]>(rules);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  function updateRule(index: number, value: number) {
    const updated = [...localRules];
    updated[index] = { ...updated[index], max_experienced_allowed: value };
    setLocalRules(updated);

    // Validate monotonically non-increasing
    for (let i = 1; i < updated.length; i++) {
      if (updated[i].max_experienced_allowed > updated[i - 1].max_experienced_allowed) {
        setValidationError(
          `Row ${i + 1} (${updated[i].num_beginners} beginners) cannot have more allowed experienced divers than row ${i}.`
        );
        return;
      }
    }
    setValidationError("");
  }

  async function handleSave() {
    if (validationError) return;
    setLoading(true);

    // Delete and re-insert all rules
    await supabase.from("staff_pairing_rules").delete().eq("shop_id", shopId);
    const { error } = await supabase.from("staff_pairing_rules").insert(
      localRules.map((r) => ({
        shop_id: shopId,
        num_beginners: r.num_beginners,
        max_experienced_allowed: r.max_experienced_allowed,
      }))
    );

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pairing table saved!" });
      router.refresh();
      onSaved();
    }
  }

  if (localRules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pairing Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please complete the Capacity Rules step first to auto-generate the pairing table.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pairing Table</CardTitle>
        <CardDescription>
          Fine-tune the maximum experienced divers allowed per staff member for each beginner count.
          Values must be non-increasing (more beginners = fewer experienced allowed).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Beginners on trip
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Max experienced per staff
                </th>
              </tr>
            </thead>
            <tbody>
              {localRules.map((rule, i) => (
                <tr key={rule.num_beginners} className="border-t">
                  <td className="px-4 py-3 font-medium">{rule.num_beginners}</td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min="0"
                      value={rule.max_experienced_allowed}
                      onChange={(e) => updateRule(i, parseInt(e.target.value) || 0)}
                      className="max-w-[100px]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button onClick={handleSave} disabled={loading || !!validationError}>
          {loading ? "Saving..." : "Save Pairing Table"}
        </Button>
      </CardContent>
    </Card>
  );
}
