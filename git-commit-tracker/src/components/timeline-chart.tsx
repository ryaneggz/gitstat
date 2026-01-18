"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Commit } from "@/lib/github";
import { format, parseISO, differenceInMonths } from "date-fns";

interface TimelineChartProps {
  commits: Commit[];
  className?: string;
}

interface ChartDataPoint {
  date: string;
  cumulativeCount: number;
  formattedDate: string;
}

/**
 * Transforms raw commits into cumulative chart data points
 * Groups commits by date and calculates running total
 */
function transformCommitsToChartData(commits: Commit[]): ChartDataPoint[] {
  if (commits.length === 0) {
    return [];
  }

  // Sort commits by date (oldest first)
  const sortedCommits = [...commits].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Group commits by date (day granularity)
  const commitsByDate = new Map<string, number>();

  for (const commit of sortedCommits) {
    const dateKey = format(parseISO(commit.date), "yyyy-MM-dd");
    commitsByDate.set(dateKey, (commitsByDate.get(dateKey) || 0) + 1);
  }

  // Convert to array sorted by date
  const dates = Array.from(commitsByDate.keys()).sort();

  // Build cumulative data points
  let cumulativeCount = 0;
  const chartData: ChartDataPoint[] = [];

  for (const date of dates) {
    cumulativeCount += commitsByDate.get(date) || 0;
    chartData.push({
      date,
      cumulativeCount,
      formattedDate: format(parseISO(date), "MMM d, yyyy"),
    });
  }

  return chartData;
}

/**
 * Determines the appropriate date format based on the date range
 */
function getDateFormat(data: ChartDataPoint[]): string {
  if (data.length < 2) {
    return "MMM d";
  }

  const firstDate = parseISO(data[0].date);
  const lastDate = parseISO(data[data.length - 1].date);
  const monthsDiff = differenceInMonths(lastDate, firstDate);

  // For ranges over a year, show month and year
  if (monthsDiff > 12) {
    return "MMM yyyy";
  }
  // For ranges over 2 months, show month and day
  if (monthsDiff > 2) {
    return "MMM d";
  }
  // For shorter ranges, show day
  return "MMM d";
}

/**
 * Custom tooltip component for dark mode styling
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataPoint }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{data.formattedDate}</p>
      <p className="text-muted-foreground">
        {data.cumulativeCount} total commits
      </p>
    </div>
  );
}

export function TimelineChart({ commits, className }: TimelineChartProps) {
  const chartData = React.useMemo(
    () => transformCommitsToChartData(commits),
    [commits]
  );

  const dateFormat = React.useMemo(
    () => getDateFormat(chartData),
    [chartData]
  );

  if (chartData.length === 0) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-lg border bg-card text-muted-foreground">
        No commit data to display
      </div>
    );
  }

  return (
    <div className={`h-[400px] w-full rounded-lg border bg-card p-4 ${className || ""}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => format(parseISO(value), dateFormat)}
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={{ stroke: "var(--border)" }}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={{ stroke: "var(--border)" }}
            axisLine={{ stroke: "var(--border)" }}
            allowDecimals={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="cumulativeCount"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={chartData.length <= 30}
            activeDot={{
              r: 6,
              fill: "var(--chart-1)",
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
