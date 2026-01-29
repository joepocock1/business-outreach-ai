"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardData } from "@/app/dashboard/campaigns/new/page";
import { getTemplates } from "@/app/dashboard/campaigns/new/actions";
import { Loader2, FileText } from "lucide-react";

interface StepBasicInfoProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  canProceed: boolean;
}

interface Template {
  id: string;
  name: string;
  variationCount: number;
}

export function StepBasicInfo({ data, updateData, onNext, canProceed }: StepBasicInfoProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTemplates() {
      const result = await getTemplates();
      setTemplates(result);
      setLoading(false);
    }
    loadTemplates();
  }, []);

  const selectedTemplate = templates.find((t) => t.id === data.templateId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Details</CardTitle>
        <CardDescription>
          Give your campaign a name and select the email template to use.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Campaign Name *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            placeholder="e.g., Cardiff Restaurants Q1 2024"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            placeholder="Brief description of this campaign's goals"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template">Email Template *</Label>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">
                No templates found. Create a template first.
              </p>
              <Button variant="outline" asChild>
                <a href="/dashboard/templates/new">Create Template</a>
              </Button>
            </div>
          ) : (
            <Select
              value={data.templateId || "__none__"}
              onValueChange={(value) => updateData({ templateId: value === "__none__" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select a template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{template.name}</span>
                      <span className="text-gray-500">
                        ({template.variationCount} variation{template.variationCount !== 1 ? "s" : ""})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedTemplate && selectedTemplate.variationCount === 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              This template has no variations. Generate variations before launching the campaign.
            </p>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onNext} disabled={!canProceed}>
            Next: Select Leads
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
