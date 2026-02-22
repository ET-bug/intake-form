"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { BookingFormData, BookingType, CertLevel, GearItem } from "@/types";

// Step components
import StepTripType from "./steps/StepTripType";
import StepFunDive from "./steps/StepFunDive";
import StepCourse from "./steps/StepCourse";
import StepGear from "./steps/StepGear";
import StepCertification from "./steps/StepCertification";
import StepMedical from "./steps/StepMedical";
import StepWaiver from "./steps/StepWaiver";
import StepPersonalDetails from "./steps/StepPersonalDetails";
import StepPayment from "./steps/StepPayment";

interface ShopCourse {
  id: string;
  price: number;
  notes: string | null;
  course_types?: {
    name: string;
    duration_days: number;
    prerequisite_cert_level: string | null;
  };
}

interface BookingFlowProps {
  shopId: string;
  shopName: string;
  courses: ShopCourse[];
}

const STEPS = [
  "Trip Type",
  "Select Date",
  "Gear",
  "Certification",
  "Medical",
  "Waiver",
  "Your Details",
  "Payment",
];

const INITIAL_FORM: BookingFormData = {
  booking_type: null,
  trip_slot_id: null,
  num_dives: null,
  shop_course_id: null,
  course_start_date: null,
  gear_items: [],
  wetsuit_size: "",
  shoe_size_eu: "",
  weight_kg: "",
  bring_own_gear: false,
  cert_level: null,
  cert_file: null,
  medical_responses: {},
  waiver_signature: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  num_dives_logged: "0",
};

export default function BookingFlow({ shopId, shopName, courses }: BookingFlowProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BookingFormData>(INITIAL_FORM);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const router = useRouter();

  function updateForm(partial: Partial<BookingFormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function nextStep() {
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prevStep() {
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Effective step index for progress (step 1 is either fun dive or course selection)
  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  async function submitBooking(): Promise<string | null> {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_type: form.booking_type,
        trip_slot_id: form.trip_slot_id,
        shop_course_id: form.shop_course_id,
        course_start_date: form.course_start_date,
        num_dives: form.num_dives,
        cert_level: form.cert_level,
        num_dives_logged: form.num_dives_logged,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        gear_items: form.bring_own_gear ? [] : form.gear_items,
        wetsuit_size: form.wetsuit_size || null,
        shoe_size_eu: form.shoe_size_eu || null,
        weight_kg: form.weight_kg || null,
        medical_responses: form.medical_responses,
        waiver_signature: form.waiver_signature,
        shop_id: shopId,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.bookingId;
  }

  async function handlePersonalDetailsComplete() {
    const id = await submitBooking();
    if (!id) return;
    setBookingId(id);
    nextStep();
  }

  const stepComponents = [
    // 0: Trip type
    <StepTripType
      key="type"
      value={form.booking_type}
      onChange={(type) => {
        updateForm({ booking_type: type });
        nextStep();
      }}
    />,

    // 1: Date / course selection
    form.booking_type === "fun_dive" ? (
      <StepFunDive
        key="fun-dive"
        shopId={shopId}
        selectedSlotId={form.trip_slot_id}
        numDives={form.num_dives}
        onSelect={(slotId, dives) => {
          updateForm({ trip_slot_id: slotId, num_dives: dives });
        }}
        onNext={nextStep}
        onBack={prevStep}
      />
    ) : (
      <StepCourse
        key="course"
        courses={courses}
        selectedCourseId={form.shop_course_id}
        startDate={form.course_start_date}
        onSelect={(courseId, startDate) => {
          updateForm({ shop_course_id: courseId, course_start_date: startDate });
        }}
        onNext={nextStep}
        onBack={prevStep}
      />
    ),

    // 2: Gear
    <StepGear
      key="gear"
      gearItems={form.gear_items}
      bringOwn={form.bring_own_gear}
      wetsuitSize={form.wetsuit_size}
      shoeSize={form.shoe_size_eu}
      weight={form.weight_kg}
      onChange={(partial) => updateForm(partial)}
      onNext={nextStep}
      onBack={prevStep}
    />,

    // 3: Certification
    <StepCertification
      key="cert"
      certLevel={form.cert_level}
      bookingType={form.booking_type}
      courseId={form.shop_course_id}
      courses={courses}
      onChange={(certLevel, file) => updateForm({ cert_level: certLevel, cert_file: file })}
      onNext={nextStep}
      onBack={prevStep}
    />,

    // 4: Medical
    <StepMedical
      key="medical"
      responses={form.medical_responses}
      onChange={(responses) => updateForm({ medical_responses: responses })}
      onNext={nextStep}
      onBack={prevStep}
    />,

    // 5: Waiver
    <StepWaiver
      key="waiver"
      signature={form.waiver_signature}
      onChange={(sig) => updateForm({ waiver_signature: sig })}
      onNext={nextStep}
      onBack={prevStep}
    />,

    // 6: Personal details
    <StepPersonalDetails
      key="details"
      firstName={form.first_name}
      lastName={form.last_name}
      email={form.email}
      phone={form.phone}
      numDivesLogged={form.num_dives_logged}
      onChange={(partial) => updateForm(partial)}
      onNext={handlePersonalDetailsComplete}
      onBack={prevStep}
    />,

    // 7: Payment
    <StepPayment
      key="payment"
      bookingId={bookingId}
      form={form}
      courses={courses}
    />,
  ];

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Step {step + 1} of {totalSteps}</span>
          <span>{STEPS[step]}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl border shadow-sm p-6 sm:p-8">
        {stepComponents[step]}
      </div>
    </div>
  );
}
