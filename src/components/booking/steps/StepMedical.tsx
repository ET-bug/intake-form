"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const MEDICAL_QUESTIONS = [
  {
    id: "q1",
    text: "Do you have, or have you ever had, asthma or wheezing with exercise or when exposed to cold air?",
  },
  {
    id: "q2",
    text: "Do you have, or have you ever had, a heart condition, heart surgery, or any heart-related problems?",
  },
  {
    id: "q3",
    text: "Do you have, or have you ever had, epilepsy or seizures?",
  },
  {
    id: "q4",
    text: "Do you have, or have you ever had, diabetes requiring medication?",
  },
  {
    id: "q5",
    text: "Are you currently taking any prescription medications (other than contraception)?",
  },
  {
    id: "q6",
    text: "Do you have, or have you ever had, any lung or breathing problems?",
  },
  {
    id: "q7",
    text: "Have you had any surgery in the past 12 months?",
  },
  {
    id: "q8",
    text: "Are you pregnant or trying to become pregnant?",
  },
  {
    id: "q9",
    text: "Have you ever been told you should not scuba dive for any medical reason?",
  },
  {
    id: "q10",
    text: "Are you currently suffering from a cold, nasal congestion, or ear infection?",
  },
];

interface StepMedicalProps {
  responses: Record<string, boolean>;
  onChange: (responses: Record<string, boolean>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepMedical({
  responses,
  onChange,
  onNext,
  onBack,
}: StepMedicalProps) {
  const [localResponses, setLocalResponses] = useState<Record<string, boolean>>(responses);

  const allAnswered = MEDICAL_QUESTIONS.every((q) => q.id in localResponses);
  const anyFlagged = Object.values(localResponses).some(Boolean);

  function handleResponse(id: string, value: boolean) {
    const updated = { ...localResponses, [id]: value };
    setLocalResponses(updated);
    onChange(updated);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Medical Declaration</h2>
        <p className="text-gray-500 mt-1">
          Please answer all questions honestly. This information stays confidential and is used for your safety.
        </p>
      </div>

      <div className="space-y-3">
        {MEDICAL_QUESTIONS.map((q, i) => (
          <div key={q.id} className="border rounded-xl p-4">
            <p className="text-sm font-medium text-gray-800 mb-3">
              <span className="text-gray-400 mr-2">{i + 1}.</span>
              {q.text}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleResponse(q.id, false)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors",
                  localResponses[q.id] === false
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                No
              </button>
              <button
                onClick={() => handleResponse(q.id, true)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors",
                  localResponses[q.id] === true
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                Yes
              </button>
            </div>
          </div>
        ))}
      </div>

      {anyFlagged && allAnswered && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You&apos;ve answered &quot;Yes&quot; to one or more questions. We may ask you to provide a medical
            certificate from a doctor confirming you&apos;re fit to dive. You can still proceed with your
            booking — our team will be in touch.
          </AlertDescription>
        </Alert>
      )}

      {allAnswered && !anyFlagged && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Great — no medical concerns flagged. You&apos;re good to go!
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!allAnswered} className="flex-1">
          {allAnswered ? "Continue" : `Answer all ${MEDICAL_QUESTIONS.length} questions`}
        </Button>
      </div>
    </div>
  );
}
