"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { GraduationCap, Clock, Award } from "lucide-react";

interface CourseType {
  name: string;
  duration_days: number;
  prerequisite_cert_level: string | null;
}

interface ShopCourse {
  id: string;
  price: number;
  notes: string | null;
  course_types?: CourseType;
}

interface StepCourseProps {
  courses: ShopCourse[];
  selectedCourseId: string | null;
  startDate: string | null;
  onSelect: (courseId: string, startDate: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const CERT_DISPLAY: Record<string, string> = {
  open_water: "Open Water",
  advanced: "Advanced",
  rescue: "Rescue Diver",
  divemaster: "Divemaster",
  instructor: "Instructor",
};

export default function StepCourse({
  courses,
  selectedCourseId,
  startDate,
  onSelect,
  onNext,
  onBack,
}: StepCourseProps) {
  const [selectedId, setSelectedId] = useState(selectedCourseId);
  const [date, setDate] = useState(startDate ?? "");

  const today = new Date().toISOString().split("T")[0];

  function handleSelect(courseId: string) {
    setSelectedId(courseId);
    if (date) onSelect(courseId, date);
  }

  function handleDateChange(d: string) {
    setDate(d);
    if (selectedId) onSelect(selectedId, d);
  }

  const canProceed = selectedId && date && date >= today;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Course</h2>
        <p className="text-gray-500 mt-1">Select the course and your preferred start date.</p>
      </div>

      <div className="space-y-3">
        {courses.map((course) => {
          const ct = course.course_types;
          return (
            <button
              key={course.id}
              onClick={() => handleSelect(course.id)}
              className={cn(
                "w-full text-left border-2 rounded-xl p-4 transition-all",
                selectedId === course.id
                  ? "border-ocean-500 bg-ocean-50"
                  : "border-gray-200 hover:border-ocean-300"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="bg-ocean-100 p-2 rounded-lg mt-0.5">
                    <GraduationCap className="h-5 w-5 text-ocean-700" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{ct?.name ?? "Course"}</div>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="h-3.5 w-3.5" />
                        {ct?.duration_days} day{ct?.duration_days !== 1 ? "s" : ""}
                      </span>
                      {ct?.prerequisite_cert_level && (
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          <Award className="h-3.5 w-3.5" />
                          Requires: {CERT_DISPLAY[ct.prerequisite_cert_level] ?? ct.prerequisite_cert_level}
                        </span>
                      )}
                      {!ct?.prerequisite_cert_level && (
                        <Badge variant="success" className="text-xs">
                          No experience needed
                        </Badge>
                      )}
                    </div>
                    {course.notes && (
                      <p className="text-sm text-gray-500 mt-1">{course.notes}</p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="text-2xl font-bold text-ocean-700">${course.price}</div>
                </div>
              </div>
            </button>
          );
        })}
        {courses.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No courses are currently available. Please contact the shop.
          </p>
        )}
      </div>

      {selectedId && (
        <div className="space-y-2">
          <Label htmlFor="start-date">Preferred start date</Label>
          <Input
            id="start-date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="max-w-[200px]"
          />
          <p className="text-xs text-gray-500">
            We&apos;ll confirm the exact schedule after booking.
          </p>
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
