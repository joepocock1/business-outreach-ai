"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessageSquare, Loader2 } from "lucide-react";
import { markEmailReplied } from "@/app/dashboard/campaigns/[id]/actions";

interface Email {
  id: string;
  status: string;
  sentAt: Date | null;
  lead: {
    businessName: string;
    email: string;
  };
  variation: {
    variationName: string;
  };
}

interface CampaignEmailsTableProps {
  emails: Email[];
}

const canMarkAsReplied = (status: string) => {
  return ["Sent", "Delivered", "Opened", "Clicked"].includes(status);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Queued":
      return "bg-gray-100 text-gray-800";
    case "Sent":
      return "bg-blue-100 text-blue-800";
    case "Delivered":
      return "bg-cyan-100 text-cyan-800";
    case "Opened":
      return "bg-green-100 text-green-800";
    case "Clicked":
      return "bg-purple-100 text-purple-800";
    case "Replied":
      return "bg-amber-100 text-amber-800";
    case "Bounced":
      return "bg-red-100 text-red-800";
    case "Failed":
      return "bg-red-100 text-red-800";
    case "Unsubscribed":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function CampaignEmailsTable({ emails }: CampaignEmailsTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleMarkReplied = async (emailId: string) => {
    setLoadingId(emailId);
    try {
      const result = await markEmailReplied(emailId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Email marked as replied");
      }
    } catch {
      toast.error("Failed to mark as replied");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Business</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Variation</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Sent</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {emails.map((email) => (
          <TableRow key={email.id}>
            <TableCell className="font-medium">{email.lead.businessName}</TableCell>
            <TableCell className="text-gray-500">{email.lead.email}</TableCell>
            <TableCell>{email.variation.variationName}</TableCell>
            <TableCell>
              <Badge className={getStatusColor(email.status)}>{email.status}</Badge>
            </TableCell>
            <TableCell className="text-gray-500">
              {email.sentAt
                ? new Date(email.sentAt).toLocaleString("en-GB", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "-"}
            </TableCell>
            <TableCell className="text-right">
              {canMarkAsReplied(email.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkReplied(email.id)}
                  disabled={loadingId === email.id}
                >
                  {loadingId === email.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Mark Replied
                    </>
                  )}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
