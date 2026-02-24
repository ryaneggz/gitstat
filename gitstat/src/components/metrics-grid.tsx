"use client";

import * as React from "react";
import { MetricCard } from "./metric-card";
import { fetchPullRequests } from "@/app/actions/pull-requests";
import { fetchReviewTurnaround } from "@/app/actions/reviews";
import { fetchIssueCloseRate } from "@/app/actions/issues";
import { fetchLinesChanged } from "@/app/actions/lines-changed";
import {
  DateRangeState,
  toGitHubDateRange,
} from "@/components/date-range-picker";
import type { Commit, PullRequest, Repository } from "@/lib/github";
import type { ReviewTurnaround } from "@/app/actions/reviews";
import type { IssueCloseRate } from "@/app/actions/issues";
import type { LinesChanged } from "@/app/actions/lines-changed";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const initialState = <T,>(): MetricState<T> => ({
  data: null,
  loading: false,
  error: null,
});

/** Group ISO date strings by day and return sorted daily counts */
function groupByDay(dates: string[]): number[] {
  if (dates.length === 0) return [];
  const counts = new Map<string, number>();
  for (const date of dates) {
    const day = date.slice(0, 10);
    counts.set(day, (counts.get(day) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, count]) => count);
}

/** Format percentage delta between current and previous values */
function formatDelta(current: number, previous: number): string | undefined {
  if (previous === 0 && current === 0) return undefined;
  if (previous === 0) return current > 0 ? "+100%" : undefined;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return "0%";
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

/** Compare first half vs second half of sparkline data */
function computeTrend(sparklineData: number[]): "up" | "down" | "flat" {
  if (sparklineData.length < 2) return "flat";
  const mid = Math.floor(sparklineData.length / 2);
  const firstHalf = sparklineData.slice(0, mid).reduce((a, b) => a + b, 0);
  const secondHalf = sparklineData.slice(mid).reduce((a, b) => a + b, 0);
  if (secondHalf > firstHalf) return "up";
  if (secondHalf < firstHalf) return "down";
  return "flat";
}

function LoadingCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-[88px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function ErrorCard({ title, error }: { title: string; error: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-[88px] items-center justify-center">
        <div className="flex items-center gap-2 text-center">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="text-xs text-destructive line-clamp-2">{error}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricsGridProps {
  /** Commits already fetched by the parent (shared with timeline chart) */
  commits: Commit[];
  commitsLoading: boolean;
  commitsError: string | null;
  selectedRepos: string[];
  dateRange: DateRangeState;
  repositories: Repository[];
  /** Whether period-over-period comparison is enabled */
  compareEnabled?: boolean;
  /** Commits from the previous period (shared with timeline chart) */
  previousCommits?: Commit[];
  /** Previous period date range for non-commit metric fetching */
  previousDateRange?: DateRangeState;
}

export function MetricsGrid({
  commits,
  commitsLoading,
  commitsError,
  selectedRepos,
  dateRange,
  repositories,
  compareEnabled,
  previousCommits,
  previousDateRange,
}: MetricsGridProps) {
  const [prState, setPrState] = React.useState<MetricState<PullRequest[]>>(
    initialState
  );
  const [reviewState, setReviewState] = React.useState<
    MetricState<ReviewTurnaround>
  >(initialState);
  const [issueState, setIssueState] = React.useState<
    MetricState<IssueCloseRate>
  >(initialState);
  const [linesState, setLinesState] = React.useState<MetricState<LinesChanged>>(
    initialState
  );

  // Previous period metric states
  const [prevPrState, setPrevPrState] = React.useState<MetricState<PullRequest[]>>(
    initialState
  );
  const [prevReviewState, setPrevReviewState] = React.useState<
    MetricState<ReviewTurnaround>
  >(initialState);
  const [prevIssueState, setPrevIssueState] = React.useState<
    MetricState<IssueCloseRate>
  >(initialState);
  const [prevLinesState, setPrevLinesState] = React.useState<MetricState<LinesChanged>>(
    initialState
  );

  React.useEffect(() => {
    if (selectedRepos.length === 0) {
      setPrState(initialState());
      setReviewState(initialState());
      setIssueState(initialState());
      setLinesState(initialState());
      return;
    }

    const selectedFullNames = repositories
      .filter((repo) => selectedRepos.includes(repo.name))
      .map((repo) => repo.fullName);

    const githubDateRange = toGitHubDateRange(dateRange);
    const range =
      githubDateRange.since || githubDateRange.until
        ? githubDateRange
        : undefined;

    // Fetch all non-commit metrics in parallel with independent error handling
    setPrState((prev) => ({ ...prev, loading: true, error: null }));
    fetchPullRequests(selectedFullNames, range).then((result) => {
      if (result.success) {
        setPrState({ data: result.data, loading: false, error: null });
      } else {
        setPrState({ data: null, loading: false, error: result.error });
      }
    });

    setReviewState((prev) => ({ ...prev, loading: true, error: null }));
    fetchReviewTurnaround(selectedFullNames, range).then((result) => {
      if (result.success) {
        setReviewState({ data: result.data, loading: false, error: null });
      } else {
        setReviewState({ data: null, loading: false, error: result.error });
      }
    });

    setIssueState((prev) => ({ ...prev, loading: true, error: null }));
    fetchIssueCloseRate(selectedFullNames, range).then((result) => {
      if (result.success) {
        setIssueState({ data: result.data, loading: false, error: null });
      } else {
        setIssueState({ data: null, loading: false, error: result.error });
      }
    });

    setLinesState((prev) => ({ ...prev, loading: true, error: null }));
    fetchLinesChanged(selectedFullNames, range).then((result) => {
      if (result.success) {
        setLinesState({ data: result.data, loading: false, error: null });
      } else {
        setLinesState({ data: null, loading: false, error: result.error });
      }
    });
  }, [selectedRepos, dateRange, repositories]);

  // Fetch previous period metrics when comparison is enabled
  React.useEffect(() => {
    if (!compareEnabled || !previousDateRange?.from || !previousDateRange?.to) {
      setPrevPrState(initialState());
      setPrevReviewState(initialState());
      setPrevIssueState(initialState());
      setPrevLinesState(initialState());
      return;
    }

    if (selectedRepos.length === 0) return;

    const selectedFullNames = repositories
      .filter((repo) => selectedRepos.includes(repo.name))
      .map((repo) => repo.fullName);

    const prevRange = toGitHubDateRange(previousDateRange);

    setPrevPrState((prev) => ({ ...prev, loading: true, error: null }));
    fetchPullRequests(selectedFullNames, prevRange).then((result) => {
      if (result.success) {
        setPrevPrState({ data: result.data, loading: false, error: null });
      } else {
        setPrevPrState({ data: null, loading: false, error: result.error });
      }
    });

    setPrevReviewState((prev) => ({ ...prev, loading: true, error: null }));
    fetchReviewTurnaround(selectedFullNames, prevRange).then((result) => {
      if (result.success) {
        setPrevReviewState({ data: result.data, loading: false, error: null });
      } else {
        setPrevReviewState({ data: null, loading: false, error: result.error });
      }
    });

    setPrevIssueState((prev) => ({ ...prev, loading: true, error: null }));
    fetchIssueCloseRate(selectedFullNames, prevRange).then((result) => {
      if (result.success) {
        setPrevIssueState({ data: result.data, loading: false, error: null });
      } else {
        setPrevIssueState({ data: null, loading: false, error: result.error });
      }
    });

    setPrevLinesState((prev) => ({ ...prev, loading: true, error: null }));
    fetchLinesChanged(selectedFullNames, prevRange).then((result) => {
      if (result.success) {
        setPrevLinesState({ data: result.data, loading: false, error: null });
      } else {
        setPrevLinesState({ data: null, loading: false, error: result.error });
      }
    });
  }, [compareEnabled, previousDateRange, selectedRepos, repositories]);

  // Derived commit metrics
  const commitSparkline = React.useMemo(
    () => groupByDay(commits.map((c) => c.date)),
    [commits]
  );
  const commitTrend = computeTrend(commitSparkline);
  const totalCommits = commits.length;
  const velocity = commitSparkline.length > 0 ? totalCommits / commitSparkline.length : 0;

  // Derived PR metrics
  const prsOpened = prState.data?.length ?? 0;
  const prsMerged = prState.data?.filter((pr) => pr.merged).length ?? 0;
  const prOpenedSparkline = React.useMemo(
    () => (prState.data ? groupByDay(prState.data.map((pr) => pr.createdAt)) : []),
    [prState.data]
  );
  const prMergedSparkline = React.useMemo(
    () =>
      prState.data
        ? groupByDay(
            prState.data
              .filter((pr) => pr.merged && pr.mergedAt)
              .map((pr) => pr.mergedAt!)
          )
        : [],
    [prState.data]
  );

  // Compute deltas when comparison is enabled
  const showDelta = compareEnabled && previousCommits !== undefined;
  const prevTotalCommits = previousCommits?.length ?? 0;
  const prevVelocity = React.useMemo(() => {
    if (!previousCommits || previousCommits.length === 0) return 0;
    const days = groupByDay(previousCommits.map((c) => c.date));
    return days.length > 0 ? previousCommits.length / days.length : 0;
  }, [previousCommits]);
  const prevPrsOpened = prevPrState.data?.length ?? 0;
  const prevPrsMerged = prevPrState.data?.filter((pr) => pr.merged).length ?? 0;

  const commitsDelta = showDelta ? formatDelta(totalCommits, prevTotalCommits) : undefined;
  const velocityDelta = showDelta ? formatDelta(velocity, prevVelocity) : undefined;
  const prsOpenedDelta = showDelta && !prevPrState.loading ? formatDelta(prsOpened, prevPrsOpened) : undefined;
  const prsMergedDelta = showDelta && !prevPrState.loading ? formatDelta(prsMerged, prevPrsMerged) : undefined;
  const linesDelta = showDelta && !prevLinesState.loading && linesState.data && prevLinesState.data
    ? formatDelta(linesState.data.total, prevLinesState.data.total)
    : undefined;
  const reviewDelta = showDelta && !prevReviewState.loading && reviewState.data && prevReviewState.data
    ? formatDelta(reviewState.data.averageHours, prevReviewState.data.averageHours)
    : undefined;
  const issueDelta = showDelta && !prevIssueState.loading && issueState.data && prevIssueState.data
    ? formatDelta(issueState.data.rate, prevIssueState.data.rate)
    : undefined;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* 1. Commits */}
      {commitsLoading ? (
        <LoadingCard title="Commits" />
      ) : commitsError ? (
        <ErrorCard title="Commits" error={commitsError} />
      ) : (
        <MetricCard
          title="Commits"
          value={String(totalCommits)}
          trend={commitTrend}
          sparklineData={commitSparkline}
          unit="commits"
          delta={commitsDelta}
        />
      )}

      {/* 2. PRs Opened */}
      {prState.loading ? (
        <LoadingCard title="PRs Opened" />
      ) : prState.error ? (
        <ErrorCard title="PRs Opened" error={prState.error} />
      ) : (
        <MetricCard
          title="PRs Opened"
          value={String(prsOpened)}
          trend={computeTrend(prOpenedSparkline)}
          sparklineData={prOpenedSparkline}
          unit="pull requests"
          delta={prsOpenedDelta}
        />
      )}

      {/* 3. PRs Merged */}
      {prState.loading ? (
        <LoadingCard title="PRs Merged" />
      ) : prState.error ? (
        <ErrorCard title="PRs Merged" error={prState.error} />
      ) : (
        <MetricCard
          title="PRs Merged"
          value={String(prsMerged)}
          trend={computeTrend(prMergedSparkline)}
          sparklineData={prMergedSparkline}
          unit="merged"
          delta={prsMergedDelta}
        />
      )}

      {/* 4. Lines Changed */}
      {linesState.loading ? (
        <LoadingCard title="Lines Changed" />
      ) : linesState.error ? (
        <ErrorCard title="Lines Changed" error={linesState.error} />
      ) : (
        <MetricCard
          title="Lines Changed"
          value={
            linesState.data ? linesState.data.total.toLocaleString() : "0"
          }
          trend="flat"
          sparklineData={[]}
          unit="lines"
          description={
            linesState.data
              ? `+${linesState.data.additions.toLocaleString()} / -${linesState.data.deletions.toLocaleString()}`
              : undefined
          }
          delta={linesDelta}
        />
      )}

      {/* 5. Review Turnaround */}
      {reviewState.loading ? (
        <LoadingCard title="Review Turnaround" />
      ) : reviewState.error ? (
        <ErrorCard title="Review Turnaround" error={reviewState.error} />
      ) : (
        <MetricCard
          title="Review Turnaround"
          value={
            reviewState.data ? String(reviewState.data.averageHours) : "0"
          }
          trend="flat"
          sparklineData={[]}
          unit="avg hours"
          description={
            reviewState.data
              ? `${reviewState.data.totalPRsReviewed} PRs reviewed`
              : undefined
          }
          delta={reviewDelta}
        />
      )}

      {/* 6. Issue Close Rate */}
      {issueState.loading ? (
        <LoadingCard title="Issue Close Rate" />
      ) : issueState.error ? (
        <ErrorCard title="Issue Close Rate" error={issueState.error} />
      ) : (
        <MetricCard
          title="Issue Close Rate"
          value={
            issueState.data
              ? `${Math.round(issueState.data.rate * 100)}%`
              : "0%"
          }
          trend="flat"
          sparklineData={[]}
          unit="close rate"
          description={
            issueState.data
              ? `${issueState.data.closed} closed / ${issueState.data.opened} opened`
              : undefined
          }
          delta={issueDelta}
        />
      )}

      {/* 7. Coding Velocity */}
      {commitsLoading ? (
        <LoadingCard title="Coding Velocity" />
      ) : commitsError ? (
        <ErrorCard title="Coding Velocity" error={commitsError} />
      ) : (
        <MetricCard
          title="Coding Velocity"
          value={velocity.toFixed(1)}
          trend={commitTrend}
          sparklineData={commitSparkline}
          unit="commits/day"
          delta={velocityDelta}
        />
      )}
    </div>
  );
}
