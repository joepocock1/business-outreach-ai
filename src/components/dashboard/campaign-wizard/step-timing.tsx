"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardData } from "@/app/dashboard/campaigns/new/page";
import { Zap, CalendarClock } from "lucide-react";

interface StepTimingProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

export function StepTiming({ data, updateData, onNext, onBack, canProceed }: StepTimingProps) {
  const handleTimingChange = (value: string) => {
    const startImmediately = value === "immediately";
    updateData({
      startImmediately,
      scheduledFor: startImmediately ? null : data.scheduledFor,
    });
  };

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateData({
      scheduledFor: value ? new Date(value) : null,
    });
  };

  // Format date for datetime-local input
  const formatDateTimeLocal = (date: Date | null) => {
    if (!date) return "";
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - offset * 60 * 1000);
    return adjusted.toISOString().slice(0, 16);
  };

  // Get minimum date (now + 5 minutes)
  const minDateTime = () => {
    const min = new Date();
    min.setMinutes(min.getMinutes() + 5);
    return formatDateTimeLocal(min);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Launch Timing</CardTitle>
        <CardDescription>
          Choose when to start sending emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={data.startImmediately ? "immediately" : "scheduled"}
          onValueChange={handleTimingChange}
          className="space-y-4"
        >
          <div>
            <Label
              htmlFor="immediately"
              className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors [&:has([data-state=checked])]:border-blue-600 [&:has([data-state=checked])]:bg-blue-50 dark:[&:has([data-state=checked])]:bg-blue-900/20"
            >
              <RadioGroupItem value="immediately" id="immediately" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">Start immediately</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Begin sending emails as soon as the campaign is launched.
                </p>
              </div>
            </Label>
          </div>

          <div>
            <Label
              htmlFor="scheduled"
              className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors [&:has([data-state=checked])]:border-blue-600 [&:has([data-state=checked])]:bg-blue-50 dark:[&:has([data-state=checked])]:bg-blue-900/20"
            >
              <RadioGroupItem value="scheduled" id="scheduled" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Schedule for later</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Set a specific date and time to start the campaign.
                </p>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {/* Date/time picker for scheduled campaigns */}
        {!data.startImmediately && (
          <div className="space-y-2 pl-12">
            <Label htmlFor="scheduledFor">Schedule date and time</Label>
            <Input
              id="scheduledFor"
              type="datetime-local"
              value={formatDateTimeLocal(data.scheduledFor)}
              onChange={handleDateTimeChange}
              min={minDateTime()}
              className="max-w-xs"
            />
            <p className="text-xs text-gray-500">
              The campaign will be activated at this time and start sending within your send window.
            </p>
          </div>
        )}

        {/* Info box */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">What happens after launch?</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>• Emails are queued and sent according to your rate limits</li>
            <li>• Sending only occurs within your configured send window</li>
            <li>• You can pause or stop the campaign at any time</li>
            <li>• Performance tracking begins immediately</li>
          </ul>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={!canProceed}>
            Next: Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
