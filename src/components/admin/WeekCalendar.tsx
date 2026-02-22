"use client";

import { format, addDays, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { calculateCapacity } from "@/lib/capacity";
import { StaffPairingRule } from "@/types";
import { cn } from "@/lib/utils";

interface SlotWithCounts {
  id: string;
  date: string;
  shop_fun_dive_id: string;
  trip_duration: string;
  time_slot: string;
  status: string;
  num_beginners: number;
  num_experienced: number;
  total_booked: number;
  shop_fun_dives?: {
    dive_locations?: { name: string };
    price_1_tank: number;
    price_2_tank: number;
  };
}

interface WeekCalendarProps {
  weekStartDate: string;
  tripSlots: SlotWithCounts[];
  totalStaff: number;
  maxBeginnersPerStaff: number;
  pairingRules: StaffPairingRule[];
  shopId: string;
}

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "AM",
  afternoon: "PM",
  full_day: "Full Day",
};

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeekCalendar({
  weekStartDate,
  tripSlots,
  totalStaff,
  maxBeginnersPerStaff,
  pairingRules,
  shopId,
}: WeekCalendarProps) {
  const router = useRouter();
  const weekStart = parseISO(weekStartDate);

  function navigate(direction: "prev" | "next") {
    const newDate = addDays(weekStart, direction === "next" ? 7 : -7);
    router.push(`/admin/dashboard?week=${newDate.toISOString().split("T")[0]}`);
  }

  function goToToday() {
    router.push("/admin/dashboard");
  }

  // Group slots by date
  const slotsByDate: Record<string, SlotWithCounts[]> = {};
  for (const slot of tripSlots) {
    if (!slotsByDate[slot.date]) slotsByDate[slot.date] = [];
    slotsByDate[slot.date].push(slot);
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            <CalendarDays className="h-4 w-4 mr-1.5" />
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm font-medium text-gray-600">
          {format(weekStart, "MMMM yyyy")}
        </span>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7">
        {DAYS.map((_, i) => {
          const date = addDays(weekStart, i);
          const dateStr = date.toISOString().split("T")[0];
          const slots = slotsByDate[dateStr] ?? [];
          const isToday = dateStr === new Date().toISOString().split("T")[0];

          return (
            <div
              key={dateStr}
              className={cn(
                "border-r last:border-r-0 min-h-[200px]",
                isToday && "bg-ocean-50"
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  "px-3 py-3 border-b text-center",
                  isToday && "bg-ocean-100"
                )}
              >
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {DAY_LABELS[i]}
                </div>
                <div
                  className={cn(
                    "text-lg font-semibold mt-0.5",
                    isToday ? "text-ocean-700" : "text-gray-900"
                  )}
                >
                  {format(date, "d")}
                </div>
              </div>

              {/* Slots */}
              <div className="p-2 space-y-1.5">
                {slots.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center pt-4">No trips</p>
                ) : (
                  slots.map((slot) => {
                    const cap = calculateCapacity({
                      availableStaff: totalStaff,
                      numBeginners: slot.num_beginners,
                      numExperienced: slot.num_experienced,
                      maxBeginnersPerStaff,
                      pairingRules,
                    });

                    const totalMax = cap.maxBeginners + cap.maxExperienced;
                    const isCancelled = slot.status === "cancelled";
                    const isFull =
                      !cap.canAddBeginner && !cap.canAddExperienced;

                    return (
                      <button
                        key={slot.id}
                        onClick={() =>
                          router.push(`/admin/bookings?slot=${slot.id}`)
                        }
                        className={cn(
                          "w-full text-left rounded-lg p-2 text-xs transition-colors border",
                          isCancelled
                            ? "bg-gray-100 border-gray-200 text-gray-400"
                            : isFull
                            ? "bg-red-50 border-red-200 hover:bg-red-100"
                            : "bg-ocean-50 border-ocean-200 hover:bg-ocean-100"
                        )}
                      >
                        <div className="font-semibold truncate">
                          {slot.shop_fun_dives?.dive_locations?.name ?? "Dive"}
                        </div>
                        <div className="text-gray-500 mt-0.5">
                          {TIME_SLOT_LABELS[slot.time_slot]}
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span
                            className={cn(
                              "font-medium",
                              isCancelled
                                ? "text-gray-400"
                                : isFull
                                ? "text-red-600"
                                : "text-ocean-700"
                            )}
                          >
                            {slot.total_booked}
                            {totalMax > 0 ? `/${totalMax}` : ""}
                          </span>
                          {isCancelled ? (
                            <Badge variant="outline" className="text-[10px] py-0">
                              Cancelled
                            </Badge>
                          ) : isFull ? (
                            <Badge variant="destructive" className="text-[10px] py-0">
                              Full
                            </Badge>
                          ) : null}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
