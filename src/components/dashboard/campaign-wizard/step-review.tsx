"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WizardData } from "@/app/dashboard/campaigns/new/page";
import { getLeadById, getTemplateWithVariations } from "@/app/dashboard/campaigns/new/actions";
import { campaignStrategies } from "@/lib/validations/campaign";
import {
  Loader2,
  FileText,
  Users,
  Mail,
  Clock,
  Calendar,
  Zap,
  Save,
  Rocket,
} from "lucide-react";

interface StepReviewProps {
  data: WizardData;
  onBack: () => void;
  onSaveDraft: () => void;
  onLaunch: () => void;
  saving: boolean;
  launching: boolean;
}

interface PreviewData {
  templateName: string;
  variationCount: number;
  sampleLead: {
    businessName: string;
    email: string;
  } | null;
  sampleEmail: {
    subject: string;
    body: string;
  } | null;
}

export function StepReview({
  data,
  onBack,
  onSaveDraft,
  onLaunch,
  saving,
  launching,
}: StepReviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPreview() {
      if (!data.templateId || data.leadIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const [template, firstLead] = await Promise.all([
          getTemplateWithVariations(data.templateId),
          getLeadById(data.leadIds[0]),
        ]);

        if (template && firstLead) {
          const variation = template.variations[0];
          let sampleSubject = variation?.subject || template.masterSubject;
          let sampleBody = variation?.bodyText || template.masterBody;

          // Replace variables
          sampleSubject = sampleSubject.replace(/{{businessName}}/g, firstLead.businessName);
          sampleSubject = sampleSubject.replace(/{{contactName}}/g, firstLead.contactName || firstLead.businessName);
          sampleBody = sampleBody.replace(/{{businessName}}/g, firstLead.businessName);
          sampleBody = sampleBody.replace(/{{contactName}}/g, firstLead.contactName || firstLead.businessName);

          setPreview({
            templateName: template.name,
            variationCount: template.variations.length,
            sampleLead: {
              businessName: firstLead.businessName,
              email: firstLead.email,
            },
            sampleEmail: {
              subject: sampleSubject,
              body: sampleBody,
            },
          });
        }
      } catch (error) {
        console.error("Failed to load preview:", error);
      }

      setLoading(false);
    }

    loadPreview();
  }, [data.templateId, data.leadIds]);

  const formatHour = (hour: number) => `${hour.toString().padStart(2, "0")}:00`;

  const strategyLabel = campaignStrategies.find((s) => s.value === data.strategy)?.label || data.strategy;

  const formatScheduledFor = (date: Date | null) => {
    if (!date) return "Not set";
    return date.toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Summary</CardTitle>
          <CardDescription>
            Review your campaign settings before launching.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic info */}
          <div>
            <h4 className="font-medium text-sm text-gray-500 mb-2">CAMPAIGN DETAILS</h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{data.name}</span>
              </div>
              {data.description && (
                <p className="text-sm text-gray-500 pl-6">{data.description}</p>
              )}
              <div className="flex items-center gap-2 pl-6">
                <Badge variant="secondary">
                  {preview?.templateName || "Loading..."}
                </Badge>
                {preview && (
                  <span className="text-sm text-gray-500">
                    ({preview.variationCount} variation{preview.variationCount !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Leads */}
          <div>
            <h4 className="font-medium text-sm text-gray-500 mb-2">LEADS</h4>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{data.leadIds.length} leads selected</span>
            </div>
          </div>

          <Separator />

          {/* Strategy */}
          <div>
            <h4 className="font-medium text-sm text-gray-500 mb-2">SENDING STRATEGY</h4>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{strategyLabel}</span>
            </div>
          </div>

          <Separator />

          {/* Rate limits */}
          <div>
            <h4 className="font-medium text-sm text-gray-500 mb-2">RATE LIMITS</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{data.emailsPerHour} emails/hour, {data.emailsPerDay} emails/day</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>
                  Send window: {formatHour(data.sendWindowStart)} - {formatHour(data.sendWindowEnd)}
                  {data.sendWeekdaysOnly && " (weekdays only)"}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timing */}
          <div>
            <h4 className="font-medium text-sm text-gray-500 mb-2">LAUNCH TIMING</h4>
            <div className="flex items-center gap-2">
              {data.startImmediately ? (
                <>
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">Start immediately</span>
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">
                    Scheduled: {formatScheduledFor(data.scheduledFor)}
                  </span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Email Preview</CardTitle>
          <CardDescription>
            Sample email for the first selected lead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : preview?.sampleEmail ? (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="text-gray-500">To: </span>
                <span>{preview.sampleLead?.businessName} &lt;{preview.sampleLead?.email}&gt;</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Subject: </span>
                <span className="font-medium">{preview.sampleEmail.subject}</span>
              </div>
              <Separator />
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                {preview.sampleEmail.body}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Unable to generate preview. Make sure the template has variations.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={saving || launching}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onSaveDraft}
            disabled={saving || launching}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </>
            )}
          </Button>
          <Button onClick={onLaunch} disabled={saving || launching}>
            {launching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                {data.startImmediately ? "Launch Campaign" : "Schedule Campaign"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
