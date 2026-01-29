"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  name: string;
}

interface WizardStepsProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function WizardSteps({ steps, currentStep, onStepClick }: WizardStepsProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isComplete = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = step.id < currentStep;

          return (
            <li
              key={step.id}
              className={cn("relative", index !== steps.length - 1 && "pr-8 sm:pr-20 flex-1")}
            >
              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div
                  className="absolute top-4 left-8 -ml-px w-full h-0.5"
                  aria-hidden="true"
                >
                  <div
                    className={cn(
                      "h-full",
                      isComplete ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={cn(
                  "group relative flex items-center",
                  isClickable && "cursor-pointer"
                )}
              >
                <span className="flex h-9 items-center" aria-hidden="true">
                  <span
                    className={cn(
                      "relative z-10 flex h-8 w-8 items-center justify-center rounded-full",
                      isComplete
                        ? "bg-blue-600 group-hover:bg-blue-700"
                        : isCurrent
                        ? "border-2 border-blue-600 bg-white dark:bg-gray-900"
                        : "border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          isCurrent
                            ? "bg-blue-600"
                            : "bg-transparent"
                        )}
                      />
                    )}
                  </span>
                </span>
                <span className="ml-3 hidden sm:block">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isComplete || isCurrent
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                    )}
                  >
                    {step.name}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
