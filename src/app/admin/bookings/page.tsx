import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BookingActions from "@/components/admin/BookingActions";
import { UserPlus } from "lucide-react";

const STATUS_VARIANTS: Record<string, "default" | "success" | "destructive" | "warning" | "outline"> = {
  confirmed: "success",
  pending_payment: "warning",
  cancelled: "destructive",
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { slot?: string; status?: string };
}) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: admin } = await supabase
    .from("admins")
    .select("shop_id")
    .eq("id", session!.user.id)
    .single();

  const shopId = admin?.shop_id;

  // Build query
  let query = supabase
    .from("bookings")
    .select(
      `
      *,
      customers(*),
      trip_slots(id, date, time_slot, shop_fun_dives(dive_locations(name))),
      shop_courses(shop_id, course_types(name)),
      gear_rentals(items)
    `
    )
    .order("created_at", { ascending: false });

  if (searchParams.slot) {
    query = query.eq("trip_slot_id", searchParams.slot);
  }
  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data: bookings } = await query;

  // Filter to this shop
  const shopBookings = (bookings ?? []).filter((b: {
    trip_slots?: { shop_fun_dives?: unknown } | null;
    shop_courses?: { shop_id?: string } | null;
  }) => {
    if (b.trip_slots) return true; // trip slots are already filtered by RLS
    if (b.shop_courses) return (b.shop_courses as { shop_id?: string })?.shop_id === shopId;
    return false;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/admin/bookings/walkin">
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add Walk-In
            </Link>
          </Button>
          {(["all", "confirmed", "pending_payment", "cancelled"] as const).map(
            (status) => (
              <a
                key={status}
                href={
                  status === "all"
                    ? "/admin/bookings"
                    : `/admin/bookings?status=${status}`
                }
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  (searchParams.status ?? "all") === status
                    ? "bg-ocean-700 text-white border-ocean-700"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {status === "all"
                  ? "All"
                  : status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </a>
            )
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {shopBookings.length} booking{shopBookings.length !== 1 ? "s" : ""}
            {searchParams.slot ? " for this slot" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Gear</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shopBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                shopBookings.map((booking: {
                  id: string;
                  status: string;
                  booking_type: string;
                  trip_slot_id: string | null;
                  num_dives: number | null;
                  is_beginner: boolean;
                  amount_paid: number | null;
                  course_start_date: string | null;
                  created_at: string;
                  customers?: { first_name?: string; last_name?: string; email?: string; phone?: string };
                  trip_slots?: { id?: string; date?: string; time_slot?: string; shop_fun_dives?: { dive_locations?: { name?: string } } } | null;
                  shop_courses?: { course_types?: { name?: string } } | null;
                  gear_rentals?: { items?: string[] } | null;
                }) => {
                  const customer = booking.customers;
                  const slot = booking.trip_slots;
                  const course = booking.shop_courses;

                  let tripName = "";
                  let tripDate = "";
                  if (slot) {
                    tripName = slot.shop_fun_dives?.dive_locations?.name ?? "Fun Dive";
                    tripDate = slot.date
                      ? format(new Date(slot.date + "T00:00:00"), "MMM d, yyyy")
                      : "";
                  } else if (course) {
                    tripName = course.course_types?.name ?? "Course";
                    tripDate = booking.course_start_date
                      ? format(new Date(booking.course_start_date + "T00:00:00"), "MMM d, yyyy")
                      : "";
                  }

                  const gearItems = booking.gear_rentals?.items ?? [];

                  return (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {customer?.first_name} {customer?.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{customer?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{tripName}</TableCell>
                      <TableCell className="text-sm">{tripDate}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge
                            variant={booking.booking_type === "fun_dive" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {booking.booking_type === "fun_dive"
                              ? `${booking.num_dives}-tank`
                              : "Course"}
                          </Badge>
                          <div className="text-xs text-gray-500">
                            {booking.is_beginner ? "Beginner" : "Experienced"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {gearItems.length > 0 ? (
                          <span className="text-xs text-gray-600">
                            {gearItems.join(", ")}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Own gear</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[booking.status] ?? "outline"}>
                          {booking.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${booking.amount_paid?.toFixed(2) ?? "0.00"}
                      </TableCell>
                      <TableCell>
                        <BookingActions
                          bookingId={booking.id}
                          status={booking.status}
                          bookingType={booking.booking_type}
                          tripSlotId={booking.trip_slot_id}
                          numDives={booking.num_dives}
                          gearItems={booking.gear_rentals?.items ?? []}
                          shopId={shopId}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
