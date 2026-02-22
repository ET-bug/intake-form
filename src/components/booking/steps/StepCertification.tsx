"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingType, CertLevel } from "@/types";
import { Upload, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const CERT_LEVELS: { value: CertLevel; label: string }[] = [
  { value: "none", label: "Not certified (Open Water student)" },
  { value: "open_water", label: "Open Water Diver" },
  { value: "advanced", label: "Advanced Open Water" },
  { value: "rescue", label: "Rescue Diver" },
  { value: "divemaster", label: "Divemaster" },
  { value: "instructor", label: "Instructor" },
  { value: "other", label: "Other certification" },
];

interface StepCertificationProps {
  certLevel: CertLevel | null;
  bookingType: BookingType | null;
  courseId: string | null;
  courses: Array<{
    id: string;
    course_types?: {
      prerequisite_cert_level: string | null;
    };
  }>;
  onChange: (certLevel: CertLevel, file: File | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepCertification({
  certLevel,
  bookingType,
  courseId,
  courses,
  onChange,
  onNext,
  onBack,
}: StepCertificationProps) {
  const [selectedCert, setSelectedCert] = useState<CertLevel | null>(certLevel);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Determine if cert upload is required
  const selectedCourse = courses.find((c) => c.id === courseId);
  const prereq = selectedCourse?.course_types?.prerequisite_cert_level;
  const uploadRequired = bookingType === "course" && prereq !== null && prereq !== undefined;
  const isOpenWaterCourse = bookingType === "course" && !prereq;

  const certLevelsRequiringUpload: CertLevel[] = ["advanced", "rescue", "divemaster", "instructor", "other"];
  const showUpload = !isOpenWaterCourse && (uploadRequired || (bookingType === "fun_dive"));
  const uploadMandatory = uploadRequired && selectedCert && certLevelsRequiringUpload.includes(selectedCert);

  const canProceed =
    selectedCert !== null &&
    (!uploadMandatory || file !== null);

  function handleCertChange(val: string) {
    const level = val as CertLevel;
    setSelectedCert(level);
    onChange(level, file);
  }

  function handleFile(f: File) {
    setFile(f);
    if (selectedCert) onChange(selectedCert, f);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Certification</h2>
        <p className="text-gray-500 mt-1">Tell us about your dive certification.</p>
      </div>

      {isOpenWaterCourse && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Open Water is a beginner course — no prior certification needed!
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Your highest certification level</Label>
        <Select value={selectedCert ?? undefined} onValueChange={handleCertChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select your cert level..." />
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

      {showUpload && selectedCert && selectedCert !== "none" && (
        <div className="space-y-2">
          <Label>
            Certification card photo
            {uploadMandatory ? (
              <span className="text-red-500 ml-1">*required</span>
            ) : (
              <span className="text-gray-400 ml-1">(optional but recommended)</span>
            )}
          </Label>

          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
              dragOver ? "border-ocean-400 bg-ocean-50" : "border-gray-300 hover:border-ocean-300",
              file && "border-green-400 bg-green-50"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            onClick={() => document.getElementById("cert-file-input")?.click()}
          >
            <input
              id="cert-file-input"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {file ? (
              <div>
                <div className="text-green-600 font-medium">{file.name}</div>
                <div className="text-sm text-gray-500 mt-1">Click to change</div>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <div className="font-medium text-gray-600">Drop your cert card here</div>
                <div className="text-sm text-gray-400 mt-1">or click to browse · JPEG, PNG, PDF</div>
              </div>
            )}
          </div>

          {uploadMandatory && !file && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A certification card upload is required for this course.
              </AlertDescription>
            </Alert>
          )}

          {!uploadMandatory && bookingType === "fun_dive" && (
            <p className="text-xs text-gray-500">
              Uploading your cert card helps us verify your experience level before the dive.
            </p>
          )}
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
