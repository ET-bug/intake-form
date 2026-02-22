"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, FileText } from "lucide-react";

const WAIVER_TEXT = `ASSUMPTION OF RISK, RELEASE OF LIABILITY, AND INDEMNITY AGREEMENT

PLEASE READ CAREFULLY BEFORE SIGNING

I, the undersigned, acknowledge that scuba diving and related water activities involve certain inherent risks including but not limited to: equipment failure, environmental conditions (currents, surge, low visibility), physical exertion, interaction with marine life, decompression sickness, barotrauma, and other diving-related injuries or death.

I understand that these risks cannot be eliminated regardless of the care taken to avoid them. I voluntarily assume all risks associated with participating in scuba diving activities organised by the Dive Shop.

RELEASE OF LIABILITY
In consideration for being allowed to participate in these activities, I hereby release, waive, discharge, and covenant not to sue the Dive Shop, its owners, operators, employees, agents, instructors, and divemasters (collectively "Released Parties") from any and all liability, claims, demands, actions, and causes of action arising out of or relating to any loss, damage, injury, or death that may occur to me as a result of my participation in these activities.

This release applies to any and all claims, including those caused by the negligence of the Released Parties.

MEDICAL FITNESS
I confirm that I am in good physical health, am not suffering from any condition that would make it unsafe for me to dive, and have completed the medical declaration honestly. I agree to seek medical advice if I have any doubt about my fitness to dive.

CERTIFICATION AND EXPERIENCE
I confirm that I have provided accurate information regarding my diving certification and experience. I understand that misrepresenting my experience level could result in serious injury or death to myself or others.

GOVERNING LAW
This agreement shall be governed by the laws of the jurisdiction where the Dive Shop operates.

By signing below, I acknowledge that I have read, understood, and agree to be bound by all terms of this agreement. I am 18 years of age or older (or have parental consent), of sound mind, and fully competent to understand this agreement.`;

interface StepWaiverProps {
  signature: string;
  onChange: (sig: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepWaiver({
  signature,
  onChange,
  onNext,
  onBack,
}: StepWaiverProps) {
  const [localSig, setLocalSig] = useState(signature);
  const [scrolled, setScrolled] = useState(false);

  const canSign = scrolled;
  const signed = localSig.trim().length >= 2;

  function handleSigChange(val: string) {
    setLocalSig(val);
    onChange(val);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Liability Waiver</h2>
        <p className="text-gray-500 mt-1">
          Please read the waiver carefully and sign by typing your full name.
        </p>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 flex items-center gap-2 border-b">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Assumption of Risk & Release of Liability
          </span>
        </div>
        <div
          className="h-64 overflow-y-auto p-4 text-sm text-gray-600 leading-relaxed"
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop <= el.clientHeight + 20) {
              setScrolled(true);
            }
          }}
        >
          <pre className="whitespace-pre-wrap font-sans">{WAIVER_TEXT}</pre>
          {!scrolled && (
            <div className="text-center text-gray-400 mt-4 text-xs">
              ↓ Scroll to the bottom to sign
            </div>
          )}
        </div>
      </div>

      {scrolled && (
        <div className="space-y-3">
          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              You&apos;ve read the waiver. Please type your full name below to sign electronically.
              Your name and timestamp serve as your digital signature.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="signature">
              Type your full name to sign <span className="text-red-500">*</span>
            </Label>
            <Input
              id="signature"
              value={localSig}
              onChange={(e) => handleSigChange(e.target.value)}
              placeholder="Your full legal name"
              className="text-lg font-medium"
            />
            {signed && (
              <p className="text-xs text-gray-500">
                Signed electronically on {new Date().toLocaleString()} — IP address will be recorded.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canSign || !signed} className="flex-1">
          I Agree & Continue
        </Button>
      </div>
    </div>
  );
}
