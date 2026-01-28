import { notFound } from "next/navigation";
import Link from "next/link";
import { getTemplate } from "../actions";
import { TemplateForm } from "@/components/dashboard/template-form";
import { VariationList } from "@/components/dashboard/variation-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles } from "lucide-react";

interface TemplateDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({
  params,
}: TemplateDetailPageProps) {
  const { id } = await params;

  let template;
  try {
    template = await getTemplate(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {template.name}
            </h1>
            {template.description && (
              <p className="text-gray-600 dark:text-gray-400">
                {template.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="template" className="space-y-6">
        <TabsList>
          <TabsTrigger value="template">Master Template</TabsTrigger>
          <TabsTrigger value="variations" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Variations ({template.variations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="template">
          <TemplateForm template={template} mode="edit" />
        </TabsContent>

        <TabsContent value="variations">
          <VariationList template={template} variations={template.variations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
