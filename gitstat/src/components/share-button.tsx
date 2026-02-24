"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Link, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DateRangeState } from "@/components/date-range-picker";
import { toGitHubDateRange } from "@/components/date-range-picker";
import type { Commit, Repository } from "@/lib/github";
import { fetchPullRequests } from "@/app/actions/pull-requests";
import { fetchReviewTurnaround } from "@/app/actions/reviews";
import { fetchIssueCloseRate } from "@/app/actions/issues";
import { fetchLinesChanged } from "@/app/actions/lines-changed";

interface MetricSnapshot {
  totalCommits: number;
  prsOpened: number;
  prsMerged: number;
  linesChanged: number;
  reviewTurnaroundHours: number;
  issueCloseRate: number;
  velocity: number;
}

interface ShareButtonProps {
  selectedRepos: string[];
  dateRange: DateRangeState;
  commits: Commit[];
  repositories: Repository[];
  className?: string;
}

/**
 * Share button component that generates a shareable link with current filters
 * and a full metric snapshot for the read-only share page.
 */
export function ShareButton({
  selectedRepos,
  dateRange,
  commits,
  repositories,
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
      // Fetch metric snapshot for the share link
      const selectedFullNames = repositories
        .filter((repo) => selectedRepos.includes(repo.name))
        .map((repo) => repo.fullName);

      const githubDateRange = toGitHubDateRange(dateRange);
      const range =
        githubDateRange.since || githubDateRange.until
          ? githubDateRange
          : undefined;

      const [prResult, reviewResult, issueResult, linesResult] =
        await Promise.allSettled([
          fetchPullRequests(selectedFullNames, range),
          fetchReviewTurnaround(selectedFullNames, range),
          fetchIssueCloseRate(selectedFullNames, range),
          fetchLinesChanged(selectedFullNames, range),
        ]);

      const days = new Set(commits.map((c) => c.date.slice(0, 10))).size;
      const prs =
        prResult.status === "fulfilled" && prResult.value.success
          ? prResult.value.data
          : [];

      const metrics: MetricSnapshot = {
        totalCommits: commits.length,
        prsOpened: prs.length,
        prsMerged: prs.filter((pr) => pr.merged).length,
        linesChanged:
          linesResult.status === "fulfilled" && linesResult.value.success
            ? linesResult.value.data.total
            : 0,
        reviewTurnaroundHours:
          reviewResult.status === "fulfilled" && reviewResult.value.success
            ? reviewResult.value.data.averageHours
            : 0,
        issueCloseRate:
          issueResult.status === "fulfilled" && issueResult.value.success
            ? issueResult.value.data.rate
            : 0,
        velocity: days > 0 ? Math.round((commits.length / days) * 10) / 10 : 0,
      };

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
          metrics,
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
