"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";

const GEAR_OPTIONS = ["BCD", "wetsuit", "regulator", "fins", "mask"] as const;

interface TripSlotOption {
  id: string;
  date: string;
  time_slot: string;
  shop_fun_dives?: { dive_locations?: { name?: string } };
}

interface BookingActionsProps {
  bookingId: string;
  status: string;
  bookingType: string;
  tripSlotId?: string | null;
  numDives?: number | null;
  gearItems?: string[];
  shopId: string;
}

export default function BookingActions({
  bookingId,
  status,
  bookingType,
  tripSlotId,
  numDives,
  gearItems = [],
  shopId,
}: BookingActionsProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [modifyLoading, setModifyLoading] = useState(false);

  // Modify form state
  const [selectedSlotId, setSelectedSlotId] = useState(tripSlotId ?? "");
  const [selectedDives, setSelectedDives] = useState(numDives ?? 1);
  const [selectedGear, setSelectedGear] = useState<string[]>(gearItems);
  const [availableSlots, setAvailableSlots] = useState<TripSlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  async function fetchSlots() {
    if (bookingType !== "fun_dive") return;
    setSlotsLoading(true);
    try {
      const start = new Date().toISOString().split("T")[0];
      const end = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const res = await fetch(`/api/trips/available?start=${start}&end=${end}&shop_id=${shopId}`);
      const data = await res.json();
      setAvailableSlots(data.trips ?? []);
    } catch {
      // ignore
    } finally {
      setSlotsLoading(false);
    }
  }

  useEffect(() => {
    if (modifyOpen) {
      setSelectedSlotId(tripSlotId ?? "");
      setSelectedDives(numDives ?? 1);
      setSelectedGear(gearItems);
      fetchSlots();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modifyOpen]);

  function toggleGear(item: string) {
    setSelectedGear((prev) =>
      prev.includes(item) ? prev.filter((g) => g !== item) : [...prev, item]
    );
  }

  async function handleCancel() {
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to cancel");
      toast({ title: "Booking cancelled", description: "Refund initiated via Stripe." });
      setCancelOpen(false);
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Failed to cancel booking.",
        variant: "destructive",
      });
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleModify() {
    setModifyLoading(true);
    try {
      const body: Record<string, unknown> = { gear_items: selectedGear };
      if (bookingType === "fun_dive") {
        body.trip_slot_id = selectedSlotId || null;
        body.num_dives = selectedDives;
      }
      const res = await fetch(`/api/admin/bookings/${bookingId}/modify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to modify");
      toast({ title: "Booking updated", description: "Changes saved and confirmation resent." });
      setModifyOpen(false);
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update booking.",
        variant: "destructive",
      });
    } finally {
      setModifyLoading(false);
    }
  }

  if (status === "cancelled") return null;

  const TIME_LABELS: Record<string, string> = {
    morning: "AM",
    afternoon: "PM",
    full_day: "Full Day",
  };

  return (
    <div className="flex items-center gap-1">
      {/* Modify dialog */}
      <Dialog open={modifyOpen} onOpenChange={setModifyOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 hover:bg-gray-100">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modify Booking</DialogTitle>
            <DialogDescription>
              Update trip details or gear. A new confirmation email will be sent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Fun dive: slot + dives */}
            {bookingType === "fun_dive" && (
              <>
                <div className="space-y-2">
                  <Label>Trip Date</Label>
                  {slotsLoading ? (
                    <p className="text-sm text-gray-500">Loading available trips…</p>
                  ) : (
                    <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trip date" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots.map((slot) => (
                          <SelectItem key={slot.id} value={slot.id}>
                            {format(new Date(slot.date + "T00:00:00"), "EEE, MMM d")}
                            {" · "}
                            {TIME_LABELS[slot.time_slot] ?? slot.time_slot}
                            {" · "}
                            {slot.shop_fun_dives?.dive_locations?.name ?? "Dive"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Number of Dives</Label>
                  <Select
                    value={String(selectedDives)}
                    onValueChange={(v) => setSelectedDives(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Tank</SelectItem>
                      <SelectItem value="2">2 Tanks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Gear rental */}
            <div className="space-y-2">
              <Label>Gear Rental</Label>
              <div className="grid grid-cols-2 gap-2">
                {GEAR_OPTIONS.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Checkbox
                      id={`gear-${item}`}
                      checked={selectedGear.includes(item)}
                      onCheckedChange={() => toggleGear(item)}
                    />
                    <label
                      htmlFor={`gear-${item}`}
                      className="text-sm capitalize cursor-pointer"
                    >
                      {item}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleModify} disabled={modifyLoading}>
              {modifyLoading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              This will cancel the booking and initiate a full Stripe refund if payment was taken.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep Booking
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelLoading}>
              {cancelLoading ? "Cancelling…" : "Cancel & Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
