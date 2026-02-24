"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RepoSelector } from "@/components/repo-selector";
import {
  DateRangePicker,
  DateRangeState,
  toGitHubDateRange,
  getPreviousPeriod,
} from "@/components/date-range-picker";
import { TimelineChart } from "@/components/timeline-chart";
import { MetricsGrid } from "@/components/metrics-grid";
import type { DemoMetricData } from "@/components/metrics-grid";
import {
  MetricCustomizer,
  loadVisibleMetrics,
  type MetricKey,
} from "@/components/metric-customizer";
import {
  PrivacySettingsPanel,
  loadPrivacySettings,
  type PrivacySettings,
} from "@/components/privacy-settings";
import { RepoBreakdown } from "@/components/repo-breakdown";
import { ExportButton } from "@/components/export-button";
import { ShareButton } from "@/components/share-button";
import { SharePreview } from "@/components/share-preview";
import { DemoBanner } from "@/components/demo-banner";
import { fetchCommits } from "@/app/actions/commits";
import { fetchRepositories } from "@/app/actions/repositories";
import type { Commit, Repository } from "@/lib/github";
import {
  DEMO_REPOSITORIES,
  DEMO_REPO_NAMES,
  getDemoCommits,
  getDemoPullRequests,
  getDemoReviewTurnaround,
  getDemoIssueCloseRate,
  getDemoLinesChanged,
} from "@/lib/demo-data";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [selectedRepos, setSelectedRepos] = React.useState<string[]>(
    isDemo ? DEMO_REPO_NAMES : []
  );
  const [repositories, setRepositories] = React.useState<Repository[]>(
    isDemo ? DEMO_REPOSITORIES : []
  );
  const [dateRange, setDateRange] = React.useState<DateRangeState>({
    from: undefined,
    to: undefined,
  });
  const [commits, setCommits] = React.useState<Commit[]>(
    isDemo ? getDemoCommits() : []
  );
  const [loading, setLoading] = React.useState(false);
  const [reposLoading, setReposLoading] = React.useState(!isDemo);
  const [error, setError] = React.useState<string | null>(null);
  const [compareEnabled, setCompareEnabled] = React.useState(false);
  const [previousCommits, setPreviousCommits] = React.useState<Commit[]>([]);
  const [visibleMetrics, setVisibleMetrics] = React.useState<Set<MetricKey>>(
    () => loadVisibleMetrics()
  );
  const [privacy, setPrivacy] = React.useState<PrivacySettings>({
    shareableRepos: new Set(),
    shareableMetrics: new Set(),
  });
  const chartRef = React.useRef<HTMLDivElement>(null);

  const demoMetricData: DemoMetricData | undefined = React.useMemo(
    () =>
      isDemo
        ? {
            pullRequests: getDemoPullRequests(),
            reviewTurnaround: getDemoReviewTurnaround(),
            issueCloseRate: getDemoIssueCloseRate(),
            linesChanged: getDemoLinesChanged(),
          }
        : undefined,
    [isDemo]
  );

  const previousDateRange = React.useMemo(
    () => (compareEnabled ? getPreviousPeriod(dateRange) : null),
    [compareEnabled, dateRange]
  );

  // Load repositories on mount (skip in demo mode)
  React.useEffect(() => {
    if (isDemo) return;

    async function loadRepositories() {
      setReposLoading(true);
      setError(null);
      const result = await fetchRepositories();
      if (!result.success) {
        setError(result.error);
        setRepositories([]);
      } else {
        setRepositories(result.data);
      }
      setReposLoading(false);
    }
    loadRepositories();
  }, [isDemo]);

  // Load privacy settings when repositories are available
  React.useEffect(() => {
    if (repositories.length > 0) {
      setPrivacy(loadPrivacySettings(repositories));
    }
  }, [repositories]);

  // Fetch commits when repositories or date range changes (skip in demo mode)
  React.useEffect(() => {
    if (isDemo) return;

    async function loadCommits() {
      if (selectedRepos.length === 0) {
        setCommits([]);
        return;
      }

      setLoading(true);
      setError(null);

      // Convert selected repo names to full names
      const selectedFullNames = repositories
        .filter((repo) => selectedRepos.includes(repo.name))
        .map((repo) => repo.fullName);

      const githubDateRange = toGitHubDateRange(dateRange);
      const result = await fetchCommits(
        selectedFullNames,
        githubDateRange.since || githubDateRange.until ? githubDateRange : undefined
      );

      if (!result.success) {
        setError(result.error);
        setCommits([]);
      } else {
        setCommits(result.data);
      }
      setLoading(false);
    }

    loadCommits();
  }, [selectedRepos, dateRange, repositories, isDemo]);

  // Fetch previous period commits when comparison is enabled (skip in demo mode)
  React.useEffect(() => {
    if (isDemo) return;

    if (!compareEnabled || !previousDateRange) {
      setPreviousCommits([]);
      return;
    }

    if (selectedRepos.length === 0) {
      setPreviousCommits([]);
      return;
    }

    const selectedFullNames = repositories
      .filter((repo) => selectedRepos.includes(repo.name))
      .map((repo) => repo.fullName);

    const prevGithubDateRange = toGitHubDateRange(previousDateRange);
    fetchCommits(selectedFullNames, prevGithubDateRange).then((result) => {
      if (result.success) {
        setPreviousCommits(result.data);
      } else {
        setPreviousCommits([]);
      }
    });
  }, [compareEnabled, previousDateRange, selectedRepos, repositories, isDemo]);

  return (
    <div className="space-y-6">
      {isDemo && <DemoBanner />}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        {!isDemo && (
          <div className="flex items-center gap-1">
            <PrivacySettingsPanel
              repositories={repositories}
              privacy={privacy}
              onPrivacyChange={setPrivacy}
            />
            <MetricCustomizer
              visibleMetrics={visibleMetrics}
              onVisibilityChange={setVisibleMetrics}
            />
          </div>
        )}
      </div>

      {/* Rate Limit Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Rate Limit Exceeded</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters Section (hidden in demo mode) */}
      {!isDemo && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Repositories</label>
                <RepoSelector
                  selectedRepos={selectedRepos}
                  onSelectionChange={setSelectedRepos}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  compareEnabled={compareEnabled}
                  onCompareChange={setCompareEnabled}
                />
              </div>
            </div>
            {selectedRepos.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <p>
                  {selectedRepos.length === 1
                    ? `1 repository selected`
                    : `${selectedRepos.length} repositories selected`}
                  {dateRange.from || dateRange.to
                    ? ` • ${dateRange.from?.toLocaleDateString() || "Any"} - ${dateRange.to?.toLocaleDateString() || "Any"}`
                    : " • All time"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metric Cards Grid */}
      {selectedRepos.length > 0 && (
        <MetricsGrid
          commits={commits}
          commitsLoading={loading}
          commitsError={error}
          selectedRepos={selectedRepos}
          dateRange={dateRange}
          repositories={repositories}
          compareEnabled={compareEnabled}
          previousCommits={previousCommits}
          previousDateRange={previousDateRange ?? undefined}
          visibleMetrics={visibleMetrics}
          demoData={demoMetricData}
        />
      )}

      {/* Timeline Chart Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Commit Timeline</CardTitle>
          {!isDemo && selectedRepos.length > 0 && commits.length > 0 && !loading && (
            <div className="flex items-center gap-2">
              <SharePreview
                commits={commits}
                selectedRepos={selectedRepos}
                dateRange={dateRange}
                repositories={repositories}
                privacy={privacy}
              />
              <ShareButton
                selectedRepos={selectedRepos}
                dateRange={dateRange}
                commits={commits}
                repositories={repositories}
                privacy={privacy}
              />
              <ExportButton targetRef={chartRef} filename="gitstat-chart" />
            </div>
          )}
        </CardHeader>
        <CardContent className="relative">
          {reposLoading ? (
            <div className="flex h-[400px] w-full items-center justify-center rounded-lg border bg-card">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading repositories...
                </p>
              </div>
            </div>
          ) : selectedRepos.length === 0 ? (
            <div className="flex h-[400px] w-full items-center justify-center rounded-lg border bg-card text-muted-foreground">
              Select repositories to view commit timeline
            </div>
          ) : (
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <div ref={chartRef}>
                <TimelineChart
                  commits={commits}
                  previousCommits={compareEnabled ? previousCommits : undefined}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Repo Breakdown Section (hidden in demo mode) */}
      {!isDemo && selectedRepos.length > 0 && (
        <RepoBreakdown
          selectedRepos={selectedRepos}
          dateRange={dateRange}
          repositories={repositories}
        />
      )}
    </div>
  );
}
