"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookingFormData } from "@/types";

interface StepPersonalDetailsProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numDivesLogged: string;
  onChange: (partial: Partial<BookingFormData>) => void;
  onNext: () => Promise<void>;
  onBack: () => void;
}

export default function StepPersonalDetails({
  firstName,
  lastName,
  email,
  phone,
  numDivesLogged,
  onChange,
  onNext,
  onBack,
}: StepPersonalDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid =
    firstName.trim() &&
    lastName.trim() &&
    email.includes("@") &&
    phone.trim();

  async function handleNext() {
    setError("");
    setLoading(true);
    try {
      await onNext();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your Details</h2>
        <p className="text-gray-500 mt-1">
          We need your contact info to send your booking confirmation.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">
            First name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="first-name"
            value={firstName}
            onChange={(e) => onChange({ first_name: e.target.value })}
            placeholder="Alex"
            autoComplete="given-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">
            Last name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="last-name"
            value={lastName}
            onChange={(e) => onChange({ last_name: e.target.value })}
            placeholder="Smith"
            autoComplete="family-name"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="alex@example.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+1 555 000 0000"
            autoComplete="tel"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="num-dives">
            Dives logged
          </Label>
          <Input
            id="num-dives"
            type="number"
            min="0"
            value={numDivesLogged}
            onChange={(e) => onChange({ num_dives_logged: e.target.value })}
            placeholder="0"
          />
          <p className="text-xs text-gray-500">
            Helps us classify your experience level for capacity planning.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!isValid || loading} className="flex-1">
          {loading ? "Saving..." : "Continue to Payment"}
        </Button>
      </div>
    </div>
  );
}
