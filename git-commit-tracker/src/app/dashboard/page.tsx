"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RepoSelector } from "@/components/repo-selector";
import {
  DateRangePicker,
  DateRangeState,
  toGitHubDateRange,
} from "@/components/date-range-picker";
import { TimelineChart } from "@/components/timeline-chart";
import { VelocityMetrics } from "@/components/velocity-metrics";
import { ExportButton } from "@/components/export-button";
import { ShareButton } from "@/components/share-button";
import { fetchCommits } from "@/app/actions/commits";
import { fetchRepositories } from "@/app/actions/repositories";
import type { Commit, Repository } from "@/lib/github";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DashboardPage() {
  const [selectedRepos, setSelectedRepos] = React.useState<string[]>([]);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [dateRange, setDateRange] = React.useState<DateRangeState>({
    from: undefined,
    to: undefined,
  });
  const [commits, setCommits] = React.useState<Commit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [reposLoading, setReposLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const chartRef = React.useRef<HTMLDivElement>(null);

  // Load repositories on mount
  React.useEffect(() => {
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
  }, []);

  // Fetch commits when repositories or date range changes
  React.useEffect(() => {
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
  }, [selectedRepos, dateRange, repositories]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Rate Limit Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Rate Limit Exceeded</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters Section */}
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

      {/* Velocity Metrics Section */}
      {selectedRepos.length > 0 && (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <VelocityMetrics commits={commits} dateRange={dateRange} />
        </div>
      )}

      {/* Timeline Chart Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Commit Timeline</CardTitle>
          {selectedRepos.length > 0 && commits.length > 0 && !loading && (
            <div className="flex items-center gap-2">
              <ShareButton selectedRepos={selectedRepos} dateRange={dateRange} commits={commits} />
              <ExportButton targetRef={chartRef} filename="commitline-chart" />
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
                <TimelineChart commits={commits} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
