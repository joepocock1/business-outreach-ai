"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Template } from "@prisma/client";
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
import { Badge } from "@/components/ui/badge";
import { createTemplate, updateTemplate } from "@/app/dashboard/templates/actions";
import { tones, TemplateInput } from "@/lib/validations/template";
import { industries } from "@/lib/validations/lead";

interface TemplateFormProps {
  template?: Template;
  mode: "create" | "edit";
}

const variables = [
  { key: "businessName", description: "Lead's business name" },
  { key: "contactName", description: "Lead's contact person" },
  { key: "yourName", description: "Your name" },
  { key: "portfolioUrl", description: "Your portfolio URL" },
];

export function TemplateForm({ template, mode }: TemplateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState(template?.masterBody || "");
  const [tone, setTone] = useState(template?.tone || "professional");
  const [targetIndustry, setTargetIndustry] = useState(template?.targetIndustry || "__none__");

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById("masterBody") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue =
        body.substring(0, start) + `{{${variable}}}` + body.substring(end);
      setBody(newValue);
      // Focus and set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus();
        const newPos = start + variable.length + 4;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: TemplateInput = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      masterSubject: formData.get("masterSubject") as string,
      masterBody: body,
      targetIndustry: targetIndustry === "__none__" ? undefined : targetIndustry,
      tone: tone as TemplateInput["tone"],
    };

    try {
      const result =
        mode === "create"
          ? await createTemplate(data)
          : await updateTemplate(template!.id, data);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(mode === "create" ? "Template created" : "Template updated");
        if (mode === "create" && result.template) {
          router.push(`/dashboard/templates/${result.template.id}`);
        }
        router.refresh();
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Create New Template" : "Edit Template"}
          </CardTitle>
          <CardDescription>
            Create a master template that AI will use to generate variations for A/B
            testing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={template?.name}
                placeholder="e.g., Local Business Outreach"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {tones.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={template?.description || ""}
              placeholder="Brief description of when to use this template"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetIndustry">Target Industry (Optional)</Label>
            <Select value={targetIndustry} onValueChange={setTargetIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="All industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All industries</SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="masterSubject">Subject Line *</Label>
            <Input
              id="masterSubject"
              name="masterSubject"
              defaultValue={template?.masterSubject}
              placeholder="e.g., Quick question about {{businessName}}"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Use {`{{variables}}`} to personalize. Keep under 50 characters for best
              results.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="masterBody">Email Body *</Label>
              <div className="flex gap-1 flex-wrap">
                {variables.map((v) => (
                  <Badge
                    key={v.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => insertVariable(v.key)}
                  >
                    {`{{${v.key}}}`}
                  </Badge>
                ))}
              </div>
            </div>
            <Textarea
              id="masterBody"
              name="masterBody"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email template here. Use {{variables}} for personalization."
              required
              disabled={loading}
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Aim for 80-150 words. AI will create variations based on this master
              template.
            </p>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                ? "Create Template"
                : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
