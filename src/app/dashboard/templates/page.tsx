import Link from "next/link";
import { getTemplates } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Sparkles, Trophy } from "lucide-react";
import { TemplateActions } from "@/components/dashboard/template-actions";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Email Templates
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage your email templates with AI-powered variations
          </p>
        </div>
        <Link href="/dashboard/templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No templates yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
              Create your first email template and let AI generate variations for A/B
              testing.
            </p>
            <Link href="/dashboard/templates/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const activeVariations = template.variations.filter((v) => v.isActive);
            const winnerVariation = template.variations.find((v) => v.isWinner);
            const avgReplyRate =
              activeVariations.length > 0
                ? activeVariations.reduce((acc, v) => acc + (v.replyRate || 0), 0) /
                  activeVariations.length
                : 0;

            return (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                    <TemplateActions template={template} />
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Subject Line
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {template.masterSubject}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{template.tone}</Badge>
                      {template.targetIndustry && (
                        <Badge variant="outline">{template.targetIndustry}</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Sparkles className="h-4 w-4" />
                        <span>{activeVariations.length} variations</span>
                      </div>
                      {winnerVariation && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <Trophy className="h-4 w-4" />
                          <span>Winner found</span>
                        </div>
                      )}
                    </div>

                    {avgReplyRate > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-500">Avg. Reply Rate:</span>{" "}
                        <span className="font-medium text-green-600">
                          {avgReplyRate.toFixed(1)}%
                        </span>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <Link href={`/dashboard/templates/${template.id}`}>
                        <Button variant="outline" className="w-full">
                          View & Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
