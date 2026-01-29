"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trash2,
  Pause,
  Play,
  Square,
  Pencil,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import {
  deleteCampaign,
  cancelCampaign,
  pauseCampaign,
  resumeCampaign,
} from "@/app/dashboard/campaigns/actions";

interface CampaignActionsProps {
  campaignId: string;
  campaignName: string;
  status: string;
  variant?: "dropdown" | "buttons";
}

export function CampaignActions({
  campaignId,
  campaignName,
  status,
  variant = "dropdown",
}: CampaignActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleDelete = async () => {
    setLoading("delete");
    const result = await deleteCampaign(campaignId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Campaign deleted");
      router.push("/dashboard/campaigns");
    }
    setLoading(null);
    setDeleteDialogOpen(false);
  };

  const handleCancel = async () => {
    setLoading("cancel");
    const result = await cancelCampaign(campaignId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Campaign stopped");
    }
    setLoading(null);
    setCancelDialogOpen(false);
  };

  const handlePause = async () => {
    setLoading("pause");
    const result = await pauseCampaign(campaignId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Campaign paused");
    }
    setLoading(null);
  };

  const handleResume = async () => {
    setLoading("resume");
    const result = await resumeCampaign(campaignId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Campaign resumed");
    }
    setLoading(null);
  };

  const canDelete = ["Draft", "Completed", "Cancelled"].includes(status);
  const canCancel = ["Active", "Scheduled", "Paused"].includes(status);
  const canPause = status === "Active";
  const canResume = status === "Paused";
  const canEdit = status === "Draft";

  if (variant === "buttons") {
    return (
      <>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/campaigns/${campaignId}/edit`)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}

          {canPause && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              disabled={loading === "pause"}
            >
              {loading === "pause" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Pause className="h-4 w-4 mr-1" />
              )}
              Pause
            </Button>
          )}

          {canResume && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResume}
              disabled={loading === "resume"}
            >
              {loading === "resume" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Resume
            </Button>
          )}

          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCancelDialogOpen(true)}
              disabled={loading === "cancel"}
            >
              {loading === "cancel" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Square className="h-4 w-4 mr-1" />
              )}
              Stop
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={loading === "delete"}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {loading === "delete" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete
            </Button>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{campaignName}&quot;? This action cannot be
                undone. All associated emails and data will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading === "delete"}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={loading === "delete"}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading === "delete" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Campaign"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Stop Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to stop &quot;{campaignName}&quot;? Queued emails will not be
                sent. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading === "cancel"}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={loading === "cancel"}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading === "cancel" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Stopping...
                  </>
                ) : (
                  "Stop Campaign"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Dropdown variant for campaign cards
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/campaigns/${campaignId}/edit`);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}

          {canPause && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handlePause();
              }}
              disabled={loading === "pause"}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </DropdownMenuItem>
          )}

          {canResume && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleResume();
              }}
              disabled={loading === "resume"}
            >
              <Play className="h-4 w-4 mr-2" />
              Resume
            </DropdownMenuItem>
          )}

          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setCancelDialogOpen(true);
                }}
                className="text-red-600"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Campaign
              </DropdownMenuItem>
            </>
          )}

          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDialogOpen(true);
                }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{campaignName}&quot;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading === "delete"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading === "delete"}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading === "delete" ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop &quot;{campaignName}&quot;? Queued emails will not be
              sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading === "cancel"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={loading === "cancel"}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading === "cancel" ? "Stopping..." : "Stop"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
