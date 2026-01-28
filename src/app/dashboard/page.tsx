import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Send, MailOpen, MessageSquare, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function getDashboardStats(userId: string) {
  const [
    totalLeads,
    totalEmails,
    openedEmails,
    repliedEmails,
    activeCampaigns,
    recentCampaigns,
    insights,
  ] = await Promise.all([
    db.lead.count({ where: { userId } }),
    db.email.count({
      where: { campaign: { userId }, status: { not: "Queued" } },
    }),
    db.email.count({
      where: { campaign: { userId }, openedAt: { not: null } },
    }),
    db.email.count({
      where: { campaign: { userId }, repliedAt: { not: null } },
    }),
    db.campaign.count({
      where: { userId, status: { in: ["Active", "Scheduled"] } },
    }),
    db.campaign.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { template: true },
    }),
    db.aIInsight.findMany({
      where: { userId, isActive: true },
      orderBy: { confidence: "desc" },
      take: 3,
    }),
  ]);

  const openRate = totalEmails > 0 ? ((openedEmails / totalEmails) * 100).toFixed(1) : "0";
  const replyRate = totalEmails > 0 ? ((repliedEmails / totalEmails) * 100).toFixed(1) : "0";

  return {
    totalLeads,
    totalEmails,
    openRate,
    replyRate,
    activeCampaigns,
    recentCampaigns,
    insights,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const stats = await getDashboardStats(session.user.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back, {session.user.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/leads/new">
            <Button variant="outline">Add Lead</Button>
          </Link>
          <Link href="/dashboard/campaigns/new">
            <Button>New Campaign</Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Leads"
          value={stats.totalLeads}
          description="in your database"
          icon={Users}
        />
        <StatsCard
          title="Emails Sent"
          value={stats.totalEmails}
          description="all time"
          icon={Send}
        />
        <StatsCard
          title="Open Rate"
          value={`${stats.openRate}%`}
          description="average"
          icon={MailOpen}
        />
        <StatsCard
          title="Reply Rate"
          value={`${stats.replyRate}%`}
          description="average"
          icon={MessageSquare}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Campaigns</CardTitle>
            <Link href="/dashboard/campaigns">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentCampaigns.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <p>No campaigns yet</p>
                <Link href="/dashboard/campaigns/new">
                  <Button variant="link" className="mt-2">
                    Create your first campaign
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {campaign.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {campaign.template.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p className="text-gray-900 dark:text-white">
                          {campaign.emailsSent}/{campaign.totalLeads}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">sent</p>
                      </div>
                      <StatusBadge status={campaign.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              AI Insights
            </CardTitle>
            <Link href="/dashboard/analytics">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.insights.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <p>No insights yet</p>
                <p className="text-sm mt-1">
                  Send more emails to unlock AI-powered recommendations
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {insight.title}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(insight.confidence * 100)}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {insight.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      Based on {insight.dataPoints} emails
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Draft: "secondary",
    Scheduled: "outline",
    Active: "default",
    Paused: "secondary",
    Completed: "default",
    Cancelled: "destructive",
  };

  return (
    <Badge variant={variants[status] || "secondary"}>
      {status}
    </Badge>
  );
}
