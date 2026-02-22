"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BookingFormData, GearItem } from "@/types";

const GEAR_OPTIONS: { value: GearItem; label: string; description: string }[] = [
  { value: "BCD", label: "BCD", description: "Buoyancy control device" },
  { value: "wetsuit", label: "Wetsuit", description: "Full or shortie wetsuit" },
  { value: "regulator", label: "Regulator", description: "Breathing apparatus" },
  { value: "fins", label: "Fins", description: "Dive fins" },
  { value: "mask", label: "Mask", description: "Dive mask" },
];

interface StepGearProps {
  gearItems: GearItem[];
  bringOwn: boolean;
  wetsuitSize: string;
  shoeSize: string;
  weight: string;
  onChange: (partial: Partial<BookingFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepGear({
  gearItems,
  bringOwn,
  wetsuitSize,
  shoeSize,
  weight,
  onChange,
  onNext,
  onBack,
}: StepGearProps) {
  function toggleItem(item: GearItem) {
    const updated = gearItems.includes(item)
      ? gearItems.filter((g) => g !== item)
      : [...gearItems, item];
    onChange({ gear_items: updated });
  }

  const needsSizing = !bringOwn && gearItems.length > 0;
  const needsWetsuitSize = !bringOwn && gearItems.includes("wetsuit");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Gear Rental</h2>
        <p className="text-gray-500 mt-1">Let us know what you need. Rental gear is included in the trip price.</p>
      </div>

      <div className="flex items-center gap-3 p-4 bg-ocean-50 rounded-xl border border-ocean-200">
        <Switch
          checked={bringOwn}
          onCheckedChange={(v) => onChange({ bring_own_gear: v, gear_items: v ? [] : gearItems })}
          id="bring-own"
        />
        <Label htmlFor="bring-own" className="cursor-pointer">
          <span className="font-medium">I&apos;ll bring my own gear</span>
          <p className="text-sm text-gray-500 font-normal">Skip the sizing questions</p>
        </Label>
      </div>

      {!bringOwn && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Select what you need to rent:</p>
          {GEAR_OPTIONS.map(({ value, label, description }) => (
            <div
              key={value}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
              onClick={() => toggleItem(value)}
            >
              <Checkbox
                checked={gearItems.includes(value)}
                onCheckedChange={() => toggleItem(value)}
                id={`gear-${value}`}
              />
              <div>
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-gray-500">{description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {needsSizing && (
        <div className="space-y-4 pt-2 border-t">
          <p className="font-medium text-sm text-gray-700">Sizing information</p>
          <div className="grid grid-cols-3 gap-4">
            {needsWetsuitSize && (
              <div className="space-y-1.5">
                <Label htmlFor="wetsuit-size" className="text-xs">Wetsuit Size</Label>
                <Input
                  id="wetsuit-size"
                  value={wetsuitSize}
                  onChange={(e) => onChange({ wetsuit_size: e.target.value })}
                  placeholder="e.g. M, L, XL"
                />
              </div>
            )}
            {(gearItems.includes("fins") || gearItems.includes("BCD")) && (
              <div className="space-y-1.5">
                <Label htmlFor="shoe-size" className="text-xs">Shoe Size (EU)</Label>
                <Input
                  id="shoe-size"
                  value={shoeSize}
                  onChange={(e) => onChange({ shoe_size_eu: e.target.value })}
                  placeholder="e.g. 42"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="weight" className="text-xs">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => onChange({ weight_kg: e.target.value })}
                placeholder="e.g. 70"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}
