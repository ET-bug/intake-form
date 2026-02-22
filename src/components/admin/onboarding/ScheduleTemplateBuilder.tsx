"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import { DayOfWeek, TimeSlot, TripDuration } from "@/types";

interface ScheduleSlot {
  id?: string;
  day_of_week: DayOfWeek;
  shop_fun_dive_id: string;
  trip_duration: TripDuration;
  time_slot: TimeSlot;
  active: boolean;
  shop_fun_dives?: {
    dive_locations?: { name: string };
  };
}

interface FunDive {
  id: string;
  dive_locations?: { name: string };
}

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

const TIME_SLOTS: { value: TimeSlot; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "full_day", label: "Full Day" },
];

const DURATIONS: { value: TripDuration; label: string }[] = [
  { value: "half_day", label: "Half Day" },
  { value: "full_day", label: "Full Day" },
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu",
  fri: "Fri", sat: "Sat", sun: "Sun",
};

interface ScheduleTemplateBuilderProps {
  shopId: string;
  templateSlots: ScheduleSlot[];
  funDives: FunDive[];
}

export default function ScheduleTemplateBuilder({
  shopId,
  templateSlots,
  funDives,
}: ScheduleTemplateBuilderProps) {
  const [slots, setSlots] = useState<ScheduleSlot[]>(templateSlots);
  const [newDay, setNewDay] = useState<DayOfWeek>("mon");
  const [newDive, setNewDive] = useState(funDives[0]?.id ?? "");
  const [newDuration, setNewDuration] = useState<TripDuration>("full_day");
  const [newTimeSlot, setNewTimeSlot] = useState<TimeSlot>("full_day");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  async function addSlot() {
    if (!newDive) {
      toast({ title: "Select a dive location first", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("schedule_template_slots")
      .insert({
        shop_id: shopId,
        day_of_week: newDay,
        shop_fun_dive_id: newDive,
        trip_duration: newDuration,
        time_slot: newTimeSlot,
        active: true,
      })
      .select("*, shop_fun_dives(dive_locations(name))")
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSlots([...slots, data as ScheduleSlot]);
      router.refresh();
    }
  }

  async function toggleSlot(id: string, active: boolean) {
    await supabase
      .from("schedule_template_slots")
      .update({ active })
      .eq("id", id);
    setSlots(slots.map((s) => (s.id === id ? { ...s, active } : s)));
  }

  async function deleteSlot(id: string) {
    await supabase.from("schedule_template_slots").delete().eq("id", id);
    setSlots(slots.filter((s) => s.id !== id));
    router.refresh();
  }

  // Group by day
  const byDay = DAYS.map((day) => ({
    ...day,
    slots: slots.filter((s) => s.day_of_week === day.value),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Template</CardTitle>
        <CardDescription>
          Set your repeating weekly trip pattern. These auto-generate trip slots each week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new slot */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
          <h3 className="font-medium text-sm">Add Template Slot</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Day</Label>
              <Select value={newDay} onValueChange={(v) => setNewDay(v as DayOfWeek)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Select value={newDive} onValueChange={setNewDive}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {funDives.map((fd) => (
                    <SelectItem key={fd.id} value={fd.id}>
                      {fd.dive_locations?.name ?? fd.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duration</Label>
              <Select value={newDuration} onValueChange={(v) => setNewDuration(v as TripDuration)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Time Slot</Label>
              <Select value={newTimeSlot} onValueChange={(v) => setNewTimeSlot(v as TimeSlot)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((ts) => (
                    <SelectItem key={ts.value} value={ts.value}>{ts.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button size="sm" onClick={addSlot} disabled={!newDive}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Slot
          </Button>
        </div>

        {/* Current template */}
        <div className="space-y-3">
          {byDay.map((day) => (
            <div key={day.value}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-700 w-12">
                  {day.label.slice(0, 3)}
                </span>
                {day.slots.length === 0 ? (
                  <span className="text-xs text-gray-400">No trips</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {day.slots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm ${
                          slot.active ? "bg-white" : "bg-gray-50 opacity-60"
                        }`}
                      >
                        <span className="font-medium">
                          {slot.shop_fun_dives?.dive_locations?.name ?? "Dive"}
                        </span>
                        <Badge variant="outline" className="text-xs py-0">
                          {slot.time_slot}
                        </Badge>
                        <Switch
                          checked={slot.active}
                          onCheckedChange={(v) => slot.id && toggleSlot(slot.id, v)}
                          className="scale-75"
                        />
                        <button
                          onClick={() => slot.id && deleteSlot(slot.id)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
