"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { CalendarDays, RefreshCw } from "lucide-react";

interface TripSlotGeneratorProps {
  shopId: string;
  weekStartDate: string;
  nextWeekStartDate: string;
  funDives: Array<{
    id: string;
    dive_locations?: { name: string };
  }>;
}

export default function TripSlotGenerator({
  weekStartDate,
  nextWeekStartDate,
}: TripSlotGeneratorProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  async function generate(weekStart: string) {
    setLoading(weekStart);
    try {
      const res = await fetch("/api/admin/trip-slots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start_date: weekStart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({
        title: "Trip slots generated",
        description: `Created ${data.created} trip slots.`,
      });
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to generate slots",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-ocean-600" />
          Generate Trip Slots from Template
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Generate trip slots for a week based on your schedule template and any
          weekly overrides. This replaces any existing open slots for that week.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => generate(weekStartDate)}
            disabled={loading !== null}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading === weekStartDate ? "animate-spin" : ""}`}
            />
            This Week
          </Button>
          <Button
            variant="outline"
            onClick={() => generate(nextWeekStartDate)}
            disabled={loading !== null}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading === nextWeekStartDate ? "animate-spin" : ""}`}
            />
            Next Week
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
