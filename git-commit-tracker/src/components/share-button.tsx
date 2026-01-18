"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Link, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DateRangeState } from "@/components/date-range-picker";
import type { Commit } from "@/lib/github";

interface ShareButtonProps {
  selectedRepos: string[];
  dateRange: DateRangeState;
  commits: Commit[];
  className?: string;
}

/**
 * Share button component that generates a shareable link with current filters
 */
export function ShareButton({
  selectedRepos,
  dateRange,
  commits,
  className,
}: ShareButtonProps) {
  const [generating, setGenerating] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleGenerateLink = async () => {
    if (selectedRepos.length === 0) {
      toast.error("Cannot generate link", {
        description: "Please select at least one repository",
      });
      return;
    }

    setGenerating(true);
    setShareUrl(null);

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repos: selectedRepos,
          dateFrom: dateRange.from?.toISOString(),
          dateTo: dateRange.to?.toISOString(),
          commits,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate share link");
      }

      const { shareId } = await response.json();
      const url = `${window.location.origin}/share/${shareId}`;
      setShareUrl(url);

      toast.success("Share link generated", {
        description: "Click the copy button to copy the link",
      });
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to generate link", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied", {
        description: "Share link copied to clipboard",
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy", {
        description: "Could not copy link to clipboard",
      });
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Button
        variant="outline"
        onClick={handleGenerateLink}
        disabled={generating || selectedRepos.length === 0}
      >
        {generating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Link className="mr-2 h-4 w-4" />
        )}
        Generate Link
      </Button>

      {shareUrl && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopyToClipboard}
          title="Copy link to clipboard"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
