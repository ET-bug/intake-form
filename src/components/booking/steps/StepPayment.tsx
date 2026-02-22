"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookingFormData } from "@/types";
import { CreditCard, Loader2 } from "lucide-react";

interface ShopCourse {
  id: string;
  price: number;
  course_types?: { name: string; duration_days: number };
}

interface StepPaymentProps {
  bookingId: string | null;
  form: BookingFormData;
  courses: ShopCourse[];
}

export default function StepPayment({ bookingId, form, courses }: StepPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    if (!bookingId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start checkout");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const course = form.shop_course_id ? courses.find((c) => c.id === form.shop_course_id) : null;

  const gearLabel = form.bring_own_gear
    ? "Own gear"
    : form.gear_items.length > 0
    ? form.gear_items.join(", ")
    : "No rental";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review & Pay</h2>
        <p className="text-gray-500 mt-1">
          Confirm your booking details and complete payment.
        </p>
      </div>

      {/* Booking summary */}
      <div className="bg-ocean-50 rounded-xl border border-ocean-200 p-5 space-y-3">
        <h3 className="font-semibold text-ocean-900">Booking Summary</h3>
        <Separator className="bg-ocean-200" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Type</span>
            <span className="font-medium capitalize">
              {form.booking_type?.replace("_", " ")}
            </span>
          </div>

          {form.booking_type === "fun_dive" && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Tanks</span>
                <span className="font-medium">{form.num_dives}-tank dive</span>
              </div>
            </>
          )}

          {form.booking_type === "course" && course && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Course</span>
                <span className="font-medium">{course.course_types?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Start date</span>
                <span className="font-medium">{form.course_start_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">{course.course_types?.duration_days} days</span>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <span className="text-gray-600">Gear rental</span>
            <span className="font-medium">{gearLabel}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Name</span>
            <span className="font-medium">
              {form.first_name} {form.last_name}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Email</span>
            <span className="font-medium">{form.email}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Cert level</span>
            <Badge variant="outline" className="text-xs capitalize">
              {form.cert_level?.replace("_", " ") ?? "Not specified"}
            </Badge>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!bookingId && (
        <p className="text-sm text-red-600">
          Something went wrong saving your booking. Please go back and try again.
        </p>
      )}

      <div className="space-y-3">
        <Button
          onClick={handlePay}
          disabled={!bookingId || loading}
          size="lg"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Redirecting to payment...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Securely with Stripe
            </>
          )}
        </Button>

        <p className="text-xs text-center text-gray-500">
          You&apos;ll be redirected to Stripe&apos;s secure checkout.
          Your booking will be confirmed after successful payment.
        </p>
      </div>
    </div>
  );
}
