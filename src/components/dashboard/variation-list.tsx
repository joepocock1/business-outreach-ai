"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Template, EmailVariation } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trophy, BarChart3, Loader2 } from "lucide-react";
import { generateVariations } from "@/app/dashboard/templates/[id]/actions";

interface VariationListProps {
  template: Template;
  variations: EmailVariation[];
}

export function VariationList({ template, variations }: VariationListProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateVariations(template.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Generated ${result.count} variations`);
        router.refresh();
      }
    } catch {
      toast.error("Failed to generate variations");
    } finally {
      setGenerating(false);
    }
  };

  if (variations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Sparkles className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No variations yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
            Let AI generate 5 email variations using different copywriting frameworks
            like PAS, AIDA, BAB, and more. This helps you A/B test and find what works
            best.
          </p>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Variations
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Email Variations
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {variations.length} variations generated from your master template
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} variant="outline">
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Regenerate
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4">
        {variations.map((variation) => (
          <Card
            key={variation.id}
            className={variation.isWinner ? "border-amber-500 border-2" : ""}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {variation.variationName}
                    {variation.isWinner && (
                      <Trophy className="h-4 w-4 text-amber-500" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    {variation.copywritingFramework} Framework
                    {variation.toneAnalysis && ` - ${variation.toneAnalysis}`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={variation.isActive ? "default" : "secondary"}>
                    {variation.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Subject</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {variation.subject}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Preview</p>
                <div
                  className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-4"
                  dangerouslySetInnerHTML={{
                    __html: variation.bodyText.substring(0, 300) + "...",
                  }}
                />
              </div>

              {variation.timesSent > 0 && (
                <div className="flex items-center gap-6 pt-4 border-t">
                  <div className="flex items-center gap-1 text-sm">
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Sent:</span>
                    <span className="font-medium">{variation.timesSent}</span>
                  </div>
                  {variation.openRate !== null && (
                    <div className="text-sm">
                      <span className="text-gray-500">Open Rate:</span>{" "}
                      <span className="font-medium text-blue-600">
                        {variation.openRate.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {variation.replyRate !== null && (
                    <div className="text-sm">
                      <span className="text-gray-500">Reply Rate:</span>{" "}
                      <span className="font-medium text-green-600">
                        {variation.replyRate.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
