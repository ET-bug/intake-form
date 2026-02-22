"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

const GEAR_OPTIONS = ["BCD", "wetsuit", "regulator", "fins", "mask"] as const;

const CERT_LEVELS = [
  { value: "none", label: "No certification" },
  { value: "open_water", label: "Open Water" },
  { value: "advanced", label: "Advanced" },
  { value: "rescue", label: "Rescue" },
  { value: "divemaster", label: "Divemaster" },
  { value: "instructor", label: "Instructor" },
  { value: "other", label: "Other" },
] as const;

interface TripSlot {
  id: string;
  date: string;
  time_slot: string;
  shop_fun_dives?: { dive_locations?: { name?: string } };
}

interface ShopCourse {
  id: string;
  price: number;
  course_types?: { name?: string; duration_days?: number };
}

interface WalkInBookingFormProps {
  shopId: string;
  tripSlots: TripSlot[];
  courses: ShopCourse[];
}

const TIME_LABELS: Record<string, string> = {
  morning: "AM",
  afternoon: "PM",
  full_day: "Full Day",
};

export default function WalkInBookingForm({
  shopId,
  tripSlots,
  courses,
}: WalkInBookingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [bookingType, setBookingType] = useState<"fun_dive" | "course">("fun_dive");
  const [tripSlotId, setTripSlotId] = useState("");
  const [numDives, setNumDives] = useState<"1" | "2">("1");
  const [shopCourseId, setShopCourseId] = useState("");
  const [courseStartDate, setCourseStartDate] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [numDivesLogged, setNumDivesLogged] = useState("0");
  const [certLevel, setCertLevel] = useState("none");
  const [gearItems, setGearItems] = useState<string[]>([]);
  const [wetsuitSize, setWetsuitSize] = useState("");
  const [shoeSizeEu, setShoeSizeEu] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [amountPaid, setAmountPaid] = useState("0");

  function toggleGear(item: string) {
    setGearItems((prev) =>
      prev.includes(item) ? prev.filter((g) => g !== item) : [...prev, item]
    );
  }

  // Auto-fill price from catalog when trip/course changes
  function handleCourseChange(courseId: string) {
    setShopCourseId(courseId);
    const course = courses.find((c) => c.id === courseId);
    if (course) setAmountPaid(String(course.price));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!firstName || !lastName || !email) {
      toast({ title: "Missing fields", description: "First name, last name, and email are required.", variant: "destructive" });
      return;
    }
    if (bookingType === "fun_dive" && !tripSlotId) {
      toast({ title: "Missing trip", description: "Please select a trip date.", variant: "destructive" });
      return;
    }
    if (bookingType === "course" && (!shopCourseId || !courseStartDate)) {
      toast({ title: "Missing course details", description: "Please select a course and start date.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings/walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_type: bookingType,
          trip_slot_id: bookingType === "fun_dive" ? tripSlotId : null,
          num_dives: bookingType === "fun_dive" ? parseInt(numDives) : null,
          shop_course_id: bookingType === "course" ? shopCourseId : null,
          course_start_date: bookingType === "course" ? courseStartDate : null,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          num_dives_logged: numDivesLogged,
          cert_level: certLevel,
          gear_items: gearItems,
          wetsuit_size: wetsuitSize,
          shoe_size_eu: shoeSizeEu,
          weight_kg: weightKg,
          amount_paid: amountPaid,
          shop_id: shopId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }

      toast({ title: "Walk-in booking created", description: "Booking confirmed and email sent." });
      router.push("/admin/bookings");
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create booking.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const showGearSizing = gearItems.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Trip Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trip Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            {(["fun_dive", "course"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setBookingType(type)}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                  bookingType === type
                    ? "border-ocean-600 bg-ocean-50 text-ocean-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                {type === "fun_dive" ? "Fun Dive" : "Dive Course"}
              </button>
            ))}
          </div>

          {bookingType === "fun_dive" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Trip Date & Location</Label>
                <Select value={tripSlotId} onValueChange={setTripSlotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trip…" />
                  </SelectTrigger>
                  <SelectContent>
                    {tripSlots.length === 0 ? (
                      <SelectItem value="_none" disabled>No upcoming trips found</SelectItem>
                    ) : (
                      tripSlots.map((slot) => (
                        <SelectItem key={slot.id} value={slot.id}>
                          {format(new Date(slot.date + "T00:00:00"), "EEE, MMM d")}
                          {" · "}
                          {TIME_LABELS[slot.time_slot] ?? slot.time_slot}
                          {" · "}
                          {slot.shop_fun_dives?.dive_locations?.name ?? "Dive"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Number of Dives</Label>
                <Select value={numDives} onValueChange={(v) => setNumDives(v as "1" | "2")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Tank</SelectItem>
                    <SelectItem value="2">2 Tanks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {bookingType === "course" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Course</Label>
                <Select value={shopCourseId} onValueChange={handleCourseChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course…" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.course_types?.name ?? "Course"}
                        {" · "}
                        {course.course_types?.duration_days ?? 1} day
                        {(course.course_types?.duration_days ?? 1) !== 1 ? "s" : ""}
                        {" · "}
                        ${course.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={courseStartDate}
                  onChange={(e) => setCourseStartDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cert Level</Label>
              <Select value={certLevel} onValueChange={setCertLevel}>
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
            </div>
            <div className="space-y-1.5">
              <Label>Logged Dives</Label>
              <Input
                type="number"
                min="0"
                value={numDivesLogged}
                onChange={(e) => setNumDivesLogged(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gear Rental */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gear Rental</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {GEAR_OPTIONS.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Checkbox
                  id={`gear-${item}`}
                  checked={gearItems.includes(item)}
                  onCheckedChange={() => toggleGear(item)}
                />
                <label htmlFor={`gear-${item}`} className="text-sm capitalize cursor-pointer">
                  {item}
                </label>
              </div>
            ))}
          </div>

          {showGearSizing && (
            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label>Wetsuit Size</Label>
                <Input
                  value={wetsuitSize}
                  onChange={(e) => setWetsuitSize(e.target.value)}
                  placeholder="M, L, XL…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Shoe Size (EU)</Label>
                <Input
                  type="number"
                  value={shoeSizeEu}
                  onChange={(e) => setShoeSizeEu(e.target.value)}
                  placeholder="42"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="70"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>Amount Paid (USD) — paid in person</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-gray-500">
              Booking will be marked as confirmed immediately. No Stripe charge will be made.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating booking…" : "Confirm Walk-In Booking"}
        </Button>
      </div>
    </form>
  );
}
