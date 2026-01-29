"use client";

import { Check, FileText, Users, Target, Gauge, Timer, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  name: string;
  description?: string;
}

interface WizardStepsProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

// Map step names to icons
const stepIcons: Record<string, typeof FileText> = {
  "Basic Info": FileText,
  "Select Leads": Users,
  "Strategy": Target,
  "Rate Limits": Gauge,
  "Timing": Timer,
  "Review": Eye,
};

// Step descriptions for current step
const stepDescriptions: Record<string, string> = {
  "Basic Info": "Name and template",
  "Select Leads": "Choose recipients",
  "Strategy": "A/B testing approach",
  "Rate Limits": "Sending speed",
  "Timing": "When to start",
  "Review": "Confirm and launch",
};

export function WizardSteps({ steps, currentStep, onStepClick }: WizardStepsProps) {
  const completedSteps = currentStep - 1;
  const progressPercentage = Math.round((completedSteps / (steps.length - 1)) * 100);

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Step {currentStep} of {steps.length}
        </span>
        <span className="font-medium text-blue-600 dark:text-blue-400">
          {progressPercentage}% complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Steps */}
      <nav aria-label="Progress" className="mt-6">
        <ol className="flex items-start justify-between">
          {steps.map((step, index) => {
            const isComplete = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isClickable = step.id < currentStep;
            const isLast = index === steps.length - 1;
            const StepIcon = stepIcons[step.name] || FileText;

            return (
              <li
                key={step.id}
                className={cn(
                  "relative flex flex-col items-center",
                  !isLast && "flex-1"
                )}
              >
                {/* Connector line */}
                {!isLast && (
                  <div
                    className="absolute top-5 left-1/2 w-full h-0.5 -translate-y-1/2"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        "h-full transition-all duration-500",
                        isComplete
                          ? "bg-gradient-to-r from-green-500 to-green-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      )}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "group relative flex flex-col items-center z-10 transition-all duration-300",
                    isClickable && "cursor-pointer"
                  )}
                >
                  {/* Step circle */}
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isComplete &&
                        "bg-green-500 border-green-500 text-white shadow-md group-hover:bg-green-600 group-hover:scale-105",
                      isCurrent &&
                        "bg-blue-500 border-blue-500 text-white scale-110 shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/50",
                      !isComplete &&
                        !isCurrent &&
                        "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-400"
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>

                  {/* Step label */}
                  <div className="mt-3 flex flex-col items-center">
                    <span
                      className={cn(
                        "text-xs sm:text-sm font-medium transition-all duration-300 text-center",
                        isComplete && "text-green-600 dark:text-green-400",
                        isCurrent && "text-blue-600 dark:text-blue-400 font-semibold",
                        !isComplete &&
                          !isCurrent &&
                          "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      <span className="hidden sm:inline">{step.name}</span>
                      <span className="sm:hidden">{step.id}</span>
                    </span>

                    {/* Step description - only show for current step */}
                    {isCurrent && (
                      <span className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 mt-0.5 animate-fade-in">
                        {stepDescriptions[step.name]}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile current step display */}
      <div className="sm:hidden flex items-center justify-center gap-2 pt-2">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {steps[currentStep - 1]?.name}
        </span>
        <span className="text-xs text-gray-500">
          {stepDescriptions[steps[currentStep - 1]?.name]}
        </span>
      </div>
    </div>
  );
}
