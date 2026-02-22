"use client";

import { BookingType } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Waves, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepTripTypeProps {
  value: BookingType | null;
  onChange: (type: BookingType) => void;
}

const TRIP_TYPES = [
  {
    value: "fun_dive" as BookingType,
    icon: Waves,
    title: "Fun Dive",
    description:
      "Join a guided dive with our team. Perfect for certified divers who want to explore the reefs. Choose 1 or 2 tanks.",
    badge: "Most popular",
  },
  {
    value: "course" as BookingType,
    icon: GraduationCap,
    title: "Dive Course",
    description:
      "Learn to dive or advance your skills with a certified instructor. From Open Water to Divemaster.",
    badge: null,
  },
];

export default function StepTripType({ onChange }: StepTripTypeProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">What brings you diving?</h2>
        <p className="text-gray-500 mt-1">Choose your booking type to get started.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TRIP_TYPES.map(({ value, icon: Icon, title, description, badge }) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={cn(
              "relative text-left rounded-xl border-2 p-6 transition-all hover:border-ocean-400 hover:shadow-md",
              "border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
            )}
          >
            {badge && (
              <span className="absolute top-4 right-4 bg-ocean-100 text-ocean-700 text-xs font-medium px-2 py-1 rounded-full">
                {badge}
              </span>
            )}
            <div className="flex items-start gap-4">
              <div className="bg-ocean-100 p-3 rounded-lg">
                <Icon className="h-6 w-6 text-ocean-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
                <p className="text-gray-500 text-sm mt-1 leading-relaxed">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
