"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardData } from "@/app/dashboard/campaigns/new/page";
import { Clock, Calendar, AlertCircle } from "lucide-react";

interface StepRateLimitsProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

const hours = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00`,
}));

export function StepRateLimits({ data, updateData, onNext, onBack, canProceed }: StepRateLimitsProps) {
  // Calculate estimated completion time
  const estimatedDays = useMemo(() => {
    const totalLeads = data.leadIds.length;
    if (totalLeads === 0) return 0;

    // Calculate hours in send window per day
    const hoursPerDay = Math.max(1, data.sendWindowEnd - data.sendWindowStart);

    // Calculate max emails per day based on hourly rate
    const maxByHourlyRate = data.emailsPerHour * hoursPerDay;
    const effectiveDailyRate = Math.min(data.emailsPerDay, maxByHourlyRate);

    // If weekdays only, account for weekends
    const daysPerWeek = data.sendWeekdaysOnly ? 5 : 7;
    const avgDailyRate = (effectiveDailyRate * daysPerWeek) / 7;

    return Math.ceil(totalLeads / avgDailyRate);
  }, [data.leadIds.length, data.emailsPerHour, data.emailsPerDay, data.sendWindowStart, data.sendWindowEnd, data.sendWeekdaysOnly]);

  const isWindowValid = data.sendWindowEnd > data.sendWindowStart;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Limits & Scheduling</CardTitle>
        <CardDescription>
          Control how fast emails are sent to maintain deliverability and avoid spam filters.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rate limits */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emailsPerHour">Emails per hour</Label>
            <Input
              id="emailsPerHour"
              type="number"
              min={1}
              max={50}
              value={data.emailsPerHour}
              onChange={(e) => updateData({ emailsPerHour: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)) })}
            />
            <p className="text-xs text-gray-500">Max: 50 emails/hour</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailsPerDay">Emails per day</Label>
            <Input
              id="emailsPerDay"
              type="number"
              min={1}
              max={200}
              value={data.emailsPerDay}
              onChange={(e) => updateData({ emailsPerDay: Math.min(200, Math.max(1, parseInt(e.target.value) || 1)) })}
            />
            <p className="text-xs text-gray-500">Max: 200 emails/day</p>
          </div>
        </div>

        {/* Send window */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <Label>Send window</Label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sendWindowStart" className="text-sm text-gray-500">Start time</Label>
              <Select
                value={data.sendWindowStart.toString()}
                onValueChange={(value) => updateData({ sendWindowStart: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value.toString()}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sendWindowEnd" className="text-sm text-gray-500">End time</Label>
              <Select
                value={data.sendWindowEnd.toString()}
                onValueChange={(value) => updateData({ sendWindowEnd: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value.toString()}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isWindowValid && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              End time must be after start time
            </p>
          )}
        </div>

        {/* Weekdays only */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="sendWeekdaysOnly"
            checked={data.sendWeekdaysOnly}
            onCheckedChange={(checked) => updateData({ sendWeekdaysOnly: checked === true })}
          />
          <Label htmlFor="sendWeekdaysOnly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            Weekdays only (Mon-Fri)
          </Label>
        </div>

        {/* Estimated completion */}
        {data.leadIds.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Estimated completion</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              With {data.leadIds.length} leads and current settings, the campaign will take approximately{" "}
              <strong>{estimatedDays} day{estimatedDays !== 1 ? "s" : ""}</strong> to complete.
            </p>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={!canProceed || !isWindowValid}>
            Next: Timing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
