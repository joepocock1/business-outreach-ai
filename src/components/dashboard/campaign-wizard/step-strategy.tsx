"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardData } from "@/app/dashboard/campaigns/new/page";
import { campaignStrategies } from "@/lib/validations/campaign";
import { Scale, Trophy } from "lucide-react";

interface StepStrategyProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepStrategy({ data, updateData, onNext, onBack }: StepStrategyProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sending Strategy</CardTitle>
        <CardDescription>
          Choose how email variations will be distributed across your leads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={data.strategy}
          onValueChange={(value) => updateData({ strategy: value as WizardData["strategy"] })}
          className="space-y-4"
        >
          {campaignStrategies.map((strategy) => (
            <div key={strategy.value}>
              <Label
                htmlFor={strategy.value}
                className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors [&:has([data-state=checked])]:border-blue-600 [&:has([data-state=checked])]:bg-blue-50 dark:[&:has([data-state=checked])]:bg-blue-900/20"
              >
                <RadioGroupItem value={strategy.value} id={strategy.value} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {strategy.value === "balanced" ? (
                      <Scale className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Trophy className="h-5 w-5 text-amber-500" />
                    )}
                    <span className="font-medium">{strategy.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {strategy.description}
                  </p>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Strategy explanation */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">How it works</h4>
          {data.strategy === "balanced" ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Each email variation will be sent to an equal number of leads. This is ideal for
              A/B testing when you want to compare performance across all variations fairly.
              For example, with 5 variations and 100 leads, each variation will be sent to 20 leads.
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Initially, each variation is tested equally with at least 30 sends per variation.
              After gathering enough data, the system automatically shifts to sending 70% of
              emails using the best-performing variation, while continuing to test others with
              the remaining 30%.
            </p>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>
            Next: Rate Limits
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
