"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lead } from "@prisma/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Mail, Pencil, Trash2 } from "lucide-react";
import { deleteLead, deleteLeads, updateLeadStatus } from "@/app/dashboard/leads/actions";
import { leadStatuses } from "@/lib/validations/lead";

interface LeadTableProps {
  leads: Lead[];
}

export function LeadTable({ leads }: LeadTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const handleDelete = async () => {
    if (leadToDelete) {
      const result = await deleteLead(leadToDelete);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Lead deleted");
        router.refresh();
      }
    }
    setLeadToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const result = await deleteLeads(selectedIds);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${selectedIds.length} leads deleted`);
      setSelectedIds([]);
      router.refresh();
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const result = await updateLeadStatus(id, status);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Status updated");
      router.refresh();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = leadStatuses.find((s) => s.value === status);
    return (
      <Badge variant="outline" className={statusInfo?.color}>
        {status}
      </Badge>
    );
  };

  return (
    <>
      {selectedIds.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedIds.length} lead{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete selected
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === leads.length && leads.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No leads found
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                      className="font-medium hover:underline"
                    >
                      {lead.businessName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {lead.contactName || "-"}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {lead.email}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {lead.industry || "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(lead.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/leads/${lead.id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/leads/${lead.id}?send=true`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-gray-500">
                          Change Status
                        </DropdownMenuItem>
                        {leadStatuses.map((status) => (
                          <DropdownMenuItem
                            key={status.value}
                            onClick={() => handleStatusChange(lead.id, status.value)}
                            className="pl-6"
                          >
                            {status.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setLeadToDelete(lead.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
