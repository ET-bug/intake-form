"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, addDays, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

interface TripSlotWithCapacity {
  id: string;
  date: string;
  time_slot: string;
  trip_duration: string;
  status: string;
  shop_fun_dives?: {
    price_1_tank: number;
    price_2_tank: number;
    dive_locations?: { name: string };
  };
  capacity: {
    spotsRemainingBeginners: number;
    spotsRemainingExperienced: number;
    canAddBeginner: boolean;
    canAddExperienced: boolean;
    maxBeginners: number;
    maxExperienced: number;
  };
}

interface StepFunDiveProps {
  shopId: string;
  selectedSlotId: string | null;
  numDives: 1 | 2 | null;
  onSelect: (slotId: string, dives: 1 | 2) => void;
  onNext: () => void;
  onBack: () => void;
}

const TIME_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  full_day: "Full Day",
};

export default function StepFunDive({
  shopId,
  selectedSlotId,
  numDives,
  onSelect,
  onNext,
  onBack,
}: StepFunDiveProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const [trips, setTrips] = useState<TripSlotWithCapacity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TripSlotWithCapacity | null>(null);
  const [selectedDives, setSelectedDives] = useState<1 | 2>(numDives ?? 1);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);

  useEffect(() => {
    async function fetchTrips() {
      setLoading(true);
      const start = format(monthStart, "yyyy-MM-dd");
      const end = format(monthEnd, "yyyy-MM-dd");
      const res = await fetch(
        `/api/trips/available?shop_id=${shopId}&start=${start}&end=${end}`
      );
      if (res.ok) {
        const data = await res.json();
        setTrips(data.trips ?? []);
      }
      setLoading(false);
    }
    fetchTrips();
  }, [viewDate, shopId]);

  // Build a map of date → trips
  const tripsByDate: Record<string, TripSlotWithCapacity[]> = {};
  for (const trip of trips) {
    if (!tripsByDate[trip.date]) tripsByDate[trip.date] = [];
    tripsByDate[trip.date].push(trip);
  }

  // Calendar grid (full weeks covering the month)
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(calendarStart.getDate() - ((calendarStart.getDay() + 6) % 7)); // Monday start

  const calendarDays: Date[] = [];
  let d = new Date(calendarStart);
  while (d <= monthEnd || calendarDays.length % 7 !== 0) {
    calendarDays.push(new Date(d));
    d.setDate(d.getDate() + 1);
    if (calendarDays.length > 42) break;
  }

  const today = format(new Date(), "yyyy-MM-dd");

  function handleDaySelect(dateStr: string) {
    const dayTrips = tripsByDate[dateStr];
    if (!dayTrips || dayTrips.length === 0) return;
    // Auto-select if only one trip that day
    if (dayTrips.length === 1) setSelectedSlot(dayTrips[0]);
  }

  function handleSlotSelect(slot: TripSlotWithCapacity) {
    setSelectedSlot(slot);
    onSelect(slot.id, selectedDives);
  }

  const canProceed = selectedSlot && selectedSlotId;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Dive Date</h2>
        <p className="text-gray-500 mt-1">Select an available date and trip time.</p>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setViewDate(addDays(monthStart, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold">{format(viewDate, "MMMM yyyy")}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setViewDate(addDays(monthEnd, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div>
        <div className="grid grid-cols-7 mb-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
              {d}
            </div>
          ))}
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading trips...</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isPast = dateStr < today;
              const dayTrips = tripsByDate[dateStr] ?? [];
              const hasTrips = dayTrips.length > 0;
              const isSelected = selectedSlot?.date === dateStr;

              return (
                <button
                  key={dateStr}
                  disabled={!hasTrips || isPast}
                  onClick={() => handleDaySelect(dateStr)}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors",
                    !isCurrentMonth && "text-gray-300",
                    isPast && "text-gray-300 cursor-not-allowed",
                    hasTrips && !isPast && "hover:bg-ocean-100 cursor-pointer",
                    isSelected && "bg-ocean-500 text-white hover:bg-ocean-600",
                    !hasTrips && isCurrentMonth && !isPast && "text-gray-400",
                    hasTrips && !isPast && !isSelected && "bg-ocean-50 text-ocean-900 font-medium"
                  )}
                >
                  <span>{format(day, "d")}</span>
                  {hasTrips && !isPast && (
                    <span className={cn("text-[8px] mt-0.5", isSelected ? "text-ocean-100" : "text-ocean-500")}>
                      {dayTrips.length} trip{dayTrips.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Trip slots for selected date */}
      {selectedSlot && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">
            Trips on {format(new Date(selectedSlot.date + "T00:00:00"), "EEEE, MMMM d")}
          </h3>
          {(tripsByDate[selectedSlot.date] ?? []).map((slot) => {
            const cap = slot.capacity;
            const isFull = !cap.canAddBeginner && !cap.canAddExperienced;
            return (
              <button
                key={slot.id}
                disabled={isFull}
                onClick={() => handleSlotSelect(slot)}
                className={cn(
                  "w-full text-left border-2 rounded-xl p-4 transition-all",
                  isFull && "opacity-50 cursor-not-allowed border-gray-200",
                  !isFull && selectedSlot?.id === slot.id
                    ? "border-ocean-500 bg-ocean-50"
                    : !isFull && "border-gray-200 hover:border-ocean-300"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Waves className="h-5 w-5 text-ocean-500" />
                    <div>
                      <div className="font-semibold">
                        {slot.shop_fun_dives?.dive_locations?.name ?? "Dive"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {TIME_LABELS[slot.time_slot]} · {slot.trip_duration.replace("_", " ")}
                      </div>
                    </div>
                  </div>
                  {isFull ? (
                    <Badge variant="destructive">Full</Badge>
                  ) : (
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {Math.min(cap.spotsRemainingBeginners, cap.spotsRemainingExperienced)} spots left
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Number of dives */}
      {selectedSlot && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">Number of tanks</h3>
          <div className="grid grid-cols-2 gap-3">
            {([1, 2] as const).map((dives) => {
              const price =
                dives === 1
                  ? selectedSlot.shop_fun_dives?.price_1_tank
                  : selectedSlot.shop_fun_dives?.price_2_tank;
              return (
                <button
                  key={dives}
                  onClick={() => {
                    setSelectedDives(dives);
                    onSelect(selectedSlot.id, dives);
                  }}
                  className={cn(
                    "border-2 rounded-xl p-4 text-center transition-all",
                    selectedDives === dives
                      ? "border-ocean-500 bg-ocean-50"
                      : "border-gray-200 hover:border-ocean-300"
                  )}
                >
                  <div className="font-semibold">{dives}-Tank</div>
                  {price && (
                    <div className="text-2xl font-bold text-ocean-700 mt-1">${price}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}
