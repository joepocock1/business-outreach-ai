"use client";

import { useEffect, useState, useCallback } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WizardData } from "@/app/dashboard/campaigns/new/page";
import { getLeads } from "@/app/dashboard/campaigns/new/actions";
import { leadStatuses, industries } from "@/lib/validations/lead";
import { Loader2, Search, Users } from "lucide-react";

interface StepLeadSelectionProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

interface Lead {
  id: string;
  businessName: string;
  contactName: string | null;
  email: string;
  industry: string | null;
  status: string;
}

export function StepLeadSelection({
  data,
  updateData,
  onNext,
  onBack,
  canProceed,
}: StepLeadSelectionProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [industryFilter, setIndustryFilter] = useState("__all__");
  const [excludeContacted, setExcludeContacted] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const result = await getLeads({
      status: statusFilter === "__all__" ? undefined : statusFilter,
      industry: industryFilter === "__all__" ? undefined : industryFilter,
      search: search || undefined,
      excludeContacted,
    });
    setLeads(result);
    setLoading(false);
  }, [statusFilter, industryFilter, search, excludeContacted]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const toggleLead = (leadId: string) => {
    const isSelected = data.leadIds.includes(leadId);
    if (isSelected) {
      updateData({ leadIds: data.leadIds.filter((id) => id !== leadId) });
    } else {
      updateData({ leadIds: [...data.leadIds, leadId] });
    }
  };

  const toggleAll = () => {
    if (data.leadIds.length === leads.length) {
      updateData({ leadIds: [] });
    } else {
      updateData({ leadIds: leads.map((l) => l.id) });
    }
  };

  const getStatusColor = (status: string) => {
    const statusObj = leadStatuses.find((s) => s.value === status);
    return statusObj?.color || "bg-gray-100 text-gray-800";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Leads</CardTitle>
        <CardDescription>
          Choose which leads to include in this campaign.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                {leadStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Industry</Label>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All industries</SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="excludeContacted"
                checked={excludeContacted}
                onCheckedChange={(checked) => setExcludeContacted(checked === true)}
              />
              <Label htmlFor="excludeContacted" className="text-sm">
                New leads only
              </Label>
            </div>
          </div>
        </div>

        {/* Selection info */}
        <div className="flex items-center justify-between py-2 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {data.leadIds.length} lead{data.leadIds.length !== 1 ? "s" : ""} selected
            </span>
          </div>
          {leads.length > 0 && (
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {data.leadIds.length === leads.length ? "Deselect All" : "Select All"}
            </Button>
          )}
        </div>

        {/* Leads table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No leads found matching your filters.
          </div>
        ) : (
          <div className="border rounded-lg max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={data.leadIds.length === leads.length && leads.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => toggleLead(lead.id)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={data.leadIds.includes(lead.id)}
                        onCheckedChange={() => toggleLead(lead.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{lead.businessName}</TableCell>
                    <TableCell>{lead.contactName || "-"}</TableCell>
                    <TableCell className="text-gray-500">{lead.email}</TableCell>
                    <TableCell>{lead.industry || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={!canProceed}>
            Next: Choose Strategy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
