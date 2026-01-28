import { notFound } from "next/navigation";
import Link from "next/link";
import { getLead } from "../actions";
import { LeadForm } from "@/components/dashboard/lead-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Clock } from "lucide-react";
import { format } from "date-fns";
import { leadStatuses } from "@/lib/validations/lead";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;

  let lead;
  try {
    lead = await getLead(id);
  } catch {
    notFound();
  }

  const statusInfo = leadStatuses.find((s) => s.value === lead.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/leads">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {lead.businessName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{lead.email}</p>
        </div>
        <Badge variant="outline" className={statusInfo?.color}>
          {lead.status}
        </Badge>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="emails">
            Email History ({lead.emails.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <LeadForm lead={lead} mode="edit" />
        </TabsContent>

        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Email History</span>
                <Link href={`/dashboard/leads/${id}/send`}>
                  <Button size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.emails.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p>No emails sent to this lead yet</p>
                  <Link href={`/dashboard/leads/${id}/send`}>
                    <Button variant="link" className="mt-2">
                      Send your first email
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {lead.emails.map((email) => (
                    <div
                      key={email.id}
                      className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {email.subject}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {email.variation.variationName} ({email.variation.copywritingFramework})
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {email.sentAt
                              ? format(new Date(email.sentAt), "MMM d, yyyy h:mm a")
                              : "Not sent"}
                          </span>
                          <EmailStatusBadge status={email.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmailStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Queued: "bg-gray-100 text-gray-800",
    Sending: "bg-blue-100 text-blue-800",
    Sent: "bg-blue-100 text-blue-800",
    Delivered: "bg-green-100 text-green-800",
    Opened: "bg-emerald-100 text-emerald-800",
    Clicked: "bg-purple-100 text-purple-800",
    Replied: "bg-indigo-100 text-indigo-800",
    Bounced: "bg-red-100 text-red-800",
    Failed: "bg-red-100 text-red-800",
  };

  return (
    <Badge variant="outline" className={colors[status] || "bg-gray-100 text-gray-800"}>
      {status}
    </Badge>
  );
}
