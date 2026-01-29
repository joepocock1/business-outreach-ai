import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Send, Clock, CheckCircle, Pause } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Send }> = {
  Draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: Clock },
  Scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800", icon: Clock },
  Active: { label: "Active", color: "bg-green-100 text-green-800", icon: Send },
  Paused: { label: "Paused", color: "bg-yellow-100 text-yellow-800", icon: Pause },
  Completed: { label: "Completed", color: "bg-purple-100 text-purple-800", icon: CheckCircle },
  Cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: Clock },
};

export default async function CampaignsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const campaigns = await db.campaign.findMany({
    where: { userId: session.user.id },
    include: {
      template: {
        select: { name: true },
      },
      _count: {
        select: { leadSelections: true, emails: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage and monitor your email campaigns.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/campaigns/new">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Send className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No campaigns yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
              Create your first campaign to start reaching out to leads.
            </p>
            <Button asChild>
              <Link href="/dashboard/campaigns/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const status = statusConfig[campaign.status] || statusConfig.Draft;
            const StatusIcon = status.icon;
            const progress = campaign.totalLeads > 0
              ? Math.round((campaign.emailsSent / campaign.totalLeads) * 100)
              : 0;

            return (
              <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-1">{campaign.name}</CardTitle>
                      <Badge className={status.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-1">
                      {campaign.template.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <p className="font-medium">{campaign._count.leadSelections}</p>
                          <p className="text-gray-500">Leads</p>
                        </div>
                        <div>
                          <p className="font-medium">{campaign.emailsSent}</p>
                          <p className="text-gray-500">Sent</p>
                        </div>
                        <div>
                          <p className="font-medium">{campaign.emailsReplied}</p>
                          <p className="text-gray-500">Replied</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
