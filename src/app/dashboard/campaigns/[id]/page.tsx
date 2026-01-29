import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  Pause,
  Mail,
  MailOpen,
  MousePointerClick,
  MessageSquare,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { CampaignActions } from "@/components/dashboard/campaign-actions";
import { CampaignEmailsTable } from "@/components/dashboard/campaign-emails-table";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Send }> = {
  Draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: Clock },
  Scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800", icon: Clock },
  Active: { label: "Active", color: "bg-green-100 text-green-800", icon: Send },
  Paused: { label: "Paused", color: "bg-yellow-100 text-yellow-800", icon: Pause },
  Completed: { label: "Completed", color: "bg-purple-100 text-purple-800", icon: CheckCircle },
  Cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: XCircle },
};

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const campaign = await db.campaign.findFirst({
    where: {
      id: resolvedParams.id,
      userId: session.user.id,
    },
    include: {
      template: {
        include: {
          variations: {
            select: {
              id: true,
              variationName: true,
              copywritingFramework: true,
              timesSent: true,
              timesOpened: true,
              timesReplied: true,
              openRate: true,
              replyRate: true,
              isWinner: true,
            },
          },
        },
      },
      leadSelections: {
        include: {
          lead: {
            select: {
              id: true,
              businessName: true,
              email: true,
            },
          },
        },
        take: 10,
      },
      emails: {
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          lead: {
            select: {
              businessName: true,
              email: true,
            },
          },
          variation: {
            select: {
              variationName: true,
            },
          },
        },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const status = statusConfig[campaign.status] || statusConfig.Draft;
  const StatusIcon = status.icon;

  // Calculate rates
  const openRate = campaign.emailsSent > 0
    ? ((campaign.emailsOpened / campaign.emailsSent) * 100).toFixed(1)
    : "0.0";
  const replyRate = campaign.emailsSent > 0
    ? ((campaign.emailsReplied / campaign.emailsSent) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/campaigns">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {campaign.name}
              </h1>
              <Badge className={status.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Using template: {campaign.template.name}
            </p>
          </div>
        </div>
        <CampaignActions
          campaignId={campaign.id}
          campaignName={campaign.name}
          status={campaign.status}
          variant="buttons"
        />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaign.emailsSent}</p>
                <p className="text-sm text-gray-500">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <MailOpen className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaign.emailsOpened}</p>
                <p className="text-sm text-gray-500">{openRate}% opened</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <MousePointerClick className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaign.emailsClicked}</p>
                <p className="text-sm text-gray-500">Clicked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <MessageSquare className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaign.emailsReplied}</p>
                <p className="text-sm text-gray-500">{replyRate}% replied</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaign.emailsBounced}</p>
                <p className="text-sm text-gray-500">Bounced</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variation performance */}
      <Card>
        <CardHeader>
          <CardTitle>Variation Performance</CardTitle>
          <CardDescription>
            How each email variation is performing in this campaign.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaign.template.variations.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No variations available for this template.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variation</TableHead>
                  <TableHead>Framework</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Opened</TableHead>
                  <TableHead className="text-right">Replied</TableHead>
                  <TableHead className="text-right">Reply Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaign.template.variations.map((variation) => (
                  <TableRow key={variation.id}>
                    <TableCell className="font-medium">
                      {variation.variationName}
                      {variation.isWinner && (
                        <Badge className="ml-2 bg-amber-100 text-amber-800">Winner</Badge>
                      )}
                    </TableCell>
                    <TableCell>{variation.copywritingFramework}</TableCell>
                    <TableCell className="text-right">{variation.timesSent}</TableCell>
                    <TableCell className="text-right">{variation.timesOpened}</TableCell>
                    <TableCell className="text-right">{variation.timesReplied}</TableCell>
                    <TableCell className="text-right">
                      {variation.replyRate !== null
                        ? `${(variation.replyRate * 100).toFixed(1)}%`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent emails */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Emails</CardTitle>
          <CardDescription>
            Latest emails sent in this campaign. Click &quot;Mark Replied&quot; when a lead responds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaign.emails.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No emails have been sent yet.
            </p>
          ) : (
            <CampaignEmailsTable emails={campaign.emails} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
