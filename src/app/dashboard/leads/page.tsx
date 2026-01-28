import { Suspense } from "react";
import Link from "next/link";
import { getLeads } from "./actions";
import { LeadTable } from "@/components/dashboard/lead-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, Users } from "lucide-react";
import { leadStatuses, industries } from "@/lib/validations/lead";
import { LeadFilters } from "@/components/dashboard/lead-filters";

interface LeadsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    industry?: string;
    page?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams;
  const { leads, total, totalPages, currentPage } = await getLeads({
    search: params.search,
    status: params.status,
    industry: params.industry,
    page: params.page ? parseInt(params.page) : 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {total} total leads in your database
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/leads/import">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </Link>
          <Link href="/dashboard/leads/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </Link>
        </div>
      </div>

      <Suspense fallback={<div>Loading filters...</div>}>
        <LeadFilters
          currentSearch={params.search}
          currentStatus={params.status}
          currentIndustry={params.industry}
        />
      </Suspense>

      <LeadTable leads={leads} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`/dashboard/leads?page=${currentPage - 1}${
                  params.search ? `&search=${params.search}` : ""
                }${params.status ? `&status=${params.status}` : ""}${
                  params.industry ? `&industry=${params.industry}` : ""
                }`}
              >
                <Button variant="outline" size="sm">
                  Previous
                </Button>
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={`/dashboard/leads?page=${currentPage + 1}${
                  params.search ? `&search=${params.search}` : ""
                }${params.status ? `&status=${params.status}` : ""}${
                  params.industry ? `&industry=${params.industry}` : ""
                }`}
              >
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
