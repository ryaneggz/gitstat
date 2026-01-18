"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Commit } from "@/lib/github";
import {
  differenceInWeeks,
  differenceInMonths,
  parseISO,
  subDays,
} from "date-fns";

interface VelocityMetricsProps {
  commits: Commit[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
}

function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function VelocityMetrics({ commits, dateRange }: VelocityMetricsProps) {
  const metrics = useMemo(() => {
    // Determine the date range for calculations
    const now = new Date();
    const endDate = dateRange?.to || now;
    const startDate = dateRange?.from || (commits.length > 0
      ? parseISO(commits[commits.length - 1].date)
      : subDays(now, 30));

    // Calculate the span of the selected range
    const totalWeeks = Math.max(1, differenceInWeeks(endDate, startDate)) || 1;
    const totalMonths = Math.max(1, differenceInMonths(endDate, startDate)) || 1;

    // Current period commits
    const currentCommitCount = commits.length;

    // Weekly rate: commits per week in the selected range
    const weeklyRate = currentCommitCount / totalWeeks;

    // Monthly rate: commits per month in the selected range
    const monthlyRate = currentCommitCount / totalMonths;

    // Calculate growth by comparing first half vs second half of the selected range
    const midPoint = new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2);

    const firstHalfCommits = commits.filter((commit) => {
      const commitDate = parseISO(commit.date);
      return commitDate >= startDate && commitDate < midPoint;
    }).length;

    const secondHalfCommits = commits.filter((commit) => {
      const commitDate = parseISO(commit.date);
      return commitDate >= midPoint && commitDate <= endDate;
    }).length;

    let growthPercentage: number | null = null;
    if (firstHalfCommits > 0) {
      growthPercentage = ((secondHalfCommits - firstHalfCommits) / firstHalfCommits) * 100;
    } else if (secondHalfCommits > 0) {
      // If first half had 0 commits but second half has commits, show as positive growth
      growthPercentage = 100;
    }

    return {
      weeklyRate: weeklyRate.toFixed(1),
      monthlyRate: monthlyRate.toFixed(1),
      growthPercentage,
      totalCommits: currentCommitCount,
    };
  }, [commits, dateRange]);

  const formatGrowth = (growth: number | null): string => {
    if (growth === null) return "N/A";
    const sign = growth >= 0 ? "+" : "";
    return `${sign}${growth.toFixed(1)}%`;
  };

  const getGrowthDescription = (growth: number | null): string => {
    if (growth === null) return "No previous data";
    if (growth > 0) return "vs previous period";
    if (growth < 0) return "vs previous period";
    return "Same as previous period";
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard
        title="Weekly Rate"
        value={`${metrics.weeklyRate} commits/week`}
        description={`${metrics.totalCommits} total commits`}
      />
      <MetricCard
        title="Monthly Rate"
        value={`${metrics.monthlyRate} commits/month`}
        description="Average over selected period"
      />
      <MetricCard
        title="Growth"
        value={formatGrowth(metrics.growthPercentage)}
        description={getGrowthDescription(metrics.growthPercentage)}
      />
    </div>
  );
}
