"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WizardSteps } from "@/components/dashboard/campaign-wizard/wizard-steps";
import { StepBasicInfo } from "@/components/dashboard/campaign-wizard/step-basic-info";
import { StepLeadSelection } from "@/components/dashboard/campaign-wizard/step-lead-selection";
import { StepStrategy } from "@/components/dashboard/campaign-wizard/step-strategy";
import { StepRateLimits } from "@/components/dashboard/campaign-wizard/step-rate-limits";
import { StepTiming } from "@/components/dashboard/campaign-wizard/step-timing";
import { StepReview } from "@/components/dashboard/campaign-wizard/step-review";
import { CampaignInput } from "@/lib/validations/campaign";
import { createCampaign, launchCampaign } from "./actions";

export interface WizardData {
  name: string;
  description: string;
  templateId: string;
  leadIds: string[];
  strategy: "balanced" | "winner_focused";
  emailsPerHour: number;
  emailsPerDay: number;
  sendWindowStart: number;
  sendWindowEnd: number;
  sendWeekdaysOnly: boolean;
  scheduledFor: Date | null;
  startImmediately: boolean;
}

const defaultData: WizardData = {
  name: "",
  description: "",
  templateId: "",
  leadIds: [],
  strategy: "balanced",
  emailsPerHour: 10,
  emailsPerDay: 50,
  sendWindowStart: 9,
  sendWindowEnd: 17,
  sendWeekdaysOnly: true,
  scheduledFor: null,
  startImmediately: true,
};

const steps = [
  { id: 1, name: "Basic Info" },
  { id: 2, name: "Select Leads" },
  { id: 3, name: "Strategy" },
  { id: 4, name: "Rate Limits" },
  { id: 5, name: "Timing" },
  { id: 6, name: "Review" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= steps.length) {
      setCurrentStep(step);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const campaignData: CampaignInput = {
        name: data.name,
        description: data.description || undefined,
        templateId: data.templateId,
        leadIds: data.leadIds,
        strategy: data.strategy,
        emailsPerHour: data.emailsPerHour,
        emailsPerDay: data.emailsPerDay,
        sendWindowStart: data.sendWindowStart,
        sendWindowEnd: data.sendWindowEnd,
        sendWeekdaysOnly: data.sendWeekdaysOnly,
        scheduledFor: data.scheduledFor || undefined,
      };

      const result = await createCampaign(campaignData, false);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Campaign saved as draft");
        router.push(`/dashboard/campaigns/${result.campaignId}`);
      }
    } catch {
      toast.error("Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const campaignData: CampaignInput = {
        name: data.name,
        description: data.description || undefined,
        templateId: data.templateId,
        leadIds: data.leadIds,
        strategy: data.strategy,
        emailsPerHour: data.emailsPerHour,
        emailsPerDay: data.emailsPerDay,
        sendWindowStart: data.sendWindowStart,
        sendWindowEnd: data.sendWindowEnd,
        sendWeekdaysOnly: data.sendWeekdaysOnly,
        scheduledFor: data.startImmediately ? undefined : data.scheduledFor || undefined,
      };

      // First create the campaign
      const createResult = await createCampaign(campaignData, true);

      if (createResult.error) {
        toast.error(createResult.error);
        return;
      }

      // Then launch it
      const launchResult = await launchCampaign(createResult.campaignId!, data.startImmediately);

      if (launchResult.error) {
        toast.error(launchResult.error);
      } else {
        toast.success(data.startImmediately ? "Campaign launched!" : "Campaign scheduled!");
        router.push(`/dashboard/campaigns/${createResult.campaignId}`);
      }
    } catch {
      toast.error("Failed to launch campaign");
    } finally {
      setLaunching(false);
    }
  };

  const canProceed = (step: number): boolean => {
    switch (step) {
      case 1:
        return data.name.trim().length > 0 && data.templateId.length > 0;
      case 2:
        return data.leadIds.length > 0;
      case 3:
        return true; // Strategy has default value
      case 4:
        return data.emailsPerHour > 0 && data.emailsPerDay > 0;
      case 5:
        return data.startImmediately || data.scheduledFor !== null;
      case 6:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create New Campaign
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Set up your email campaign in a few simple steps.
        </p>
      </div>

      <WizardSteps steps={steps} currentStep={currentStep} onStepClick={goToStep} />

      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <StepBasicInfo
            data={data}
            updateData={updateData}
            onNext={nextStep}
            canProceed={canProceed(1)}
          />
        )}
        {currentStep === 2 && (
          <StepLeadSelection
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
            canProceed={canProceed(2)}
          />
        )}
        {currentStep === 3 && (
          <StepStrategy
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {currentStep === 4 && (
          <StepRateLimits
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
            canProceed={canProceed(4)}
          />
        )}
        {currentStep === 5 && (
          <StepTiming
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
            canProceed={canProceed(5)}
          />
        )}
        {currentStep === 6 && (
          <StepReview
            data={data}
            onBack={prevStep}
            onSaveDraft={handleSaveDraft}
            onLaunch={handleLaunch}
            saving={saving}
            launching={launching}
          />
        )}
      </div>
    </div>
  );
}
