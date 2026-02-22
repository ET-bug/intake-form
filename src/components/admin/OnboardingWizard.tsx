"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BeginnerThresholdConfig from "./onboarding/BeginnerThresholdConfig";
import CapacityConfigSetup from "./onboarding/CapacityConfigSetup";
import PairingRuleEditor from "./onboarding/PairingRuleEditor";
import ScheduleTemplateBuilder from "./onboarding/ScheduleTemplateBuilder";
import ShopDetailsConfig from "./onboarding/ShopDetailsConfig";
import { Check } from "lucide-react";

interface OnboardingWizardProps {
  shopId: string;
  shop: unknown;
  beginnerThreshold: unknown;
  capacityConfig: unknown;
  pairingRules: unknown[];
  templateSlots: unknown[];
  funDives: unknown[];
  diveLocations: unknown[];
}

const TABS = [
  { id: "shop", label: "Shop Details" },
  { id: "threshold", label: "Beginner Threshold" },
  { id: "capacity", label: "Capacity Rules" },
  { id: "pairing", label: "Pairing Table" },
  { id: "schedule", label: "Schedule Template" },
];

export default function OnboardingWizard({
  shopId,
  shop,
  beginnerThreshold,
  capacityConfig,
  pairingRules,
  templateSlots,
  funDives,
  diveLocations,
}: OnboardingWizardProps) {
  const [activeTab, setActiveTab] = useState("shop");

  const completedSteps = {
    shop: !!shop,
    threshold: !!beginnerThreshold,
    capacity: !!capacityConfig,
    pairing: pairingRules.length > 0,
    schedule: templateSlots.length > 0,
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid grid-cols-5 w-full h-auto">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="flex items-center gap-1.5 py-2.5"
          >
            {completedSteps[tab.id as keyof typeof completedSteps] && (
              <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
            )}
            <span className="text-xs sm:text-sm">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="shop">
        <ShopDetailsConfig shopId={shopId} shop={shop} />
      </TabsContent>

      <TabsContent value="threshold">
        <BeginnerThresholdConfig
          shopId={shopId}
          threshold={beginnerThreshold}
          onSaved={() => setActiveTab("capacity")}
        />
      </TabsContent>

      <TabsContent value="capacity">
        <CapacityConfigSetup
          shopId={shopId}
          config={capacityConfig}
          onSaved={() => setActiveTab("pairing")}
        />
      </TabsContent>

      <TabsContent value="pairing">
        <PairingRuleEditor
          shopId={shopId}
          rules={pairingRules}
          capacityConfig={capacityConfig}
          onSaved={() => setActiveTab("schedule")}
        />
      </TabsContent>

      <TabsContent value="schedule">
        <ScheduleTemplateBuilder
          shopId={shopId}
          templateSlots={templateSlots}
          funDives={funDives}
        />
      </TabsContent>
    </Tabs>
  );
}
