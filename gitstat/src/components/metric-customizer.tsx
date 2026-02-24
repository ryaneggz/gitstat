"use client";

import * as React from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export type MetricKey =
  | "commits"
  | "prs-opened"
  | "prs-merged"
  | "lines-changed"
  | "review-turnaround"
  | "issue-close-rate"
  | "coding-velocity";

export const METRIC_LABELS: Record<MetricKey, string> = {
  commits: "Commits",
  "prs-opened": "PRs Opened",
  "prs-merged": "PRs Merged",
  "lines-changed": "Lines Changed",
  "review-turnaround": "Review Turnaround",
  "issue-close-rate": "Issue Close Rate",
  "coding-velocity": "Coding Velocity",
};

export const ALL_METRIC_KEYS: MetricKey[] = Object.keys(METRIC_LABELS) as MetricKey[];

const STORAGE_KEY = "gitstat-visible-metrics";

/** Load visible metrics from localStorage, defaulting to all visible */
export function loadVisibleMetrics(): Set<MetricKey> {
  if (typeof window === "undefined") return new Set(ALL_METRIC_KEYS);
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      const valid = parsed.filter((k): k is MetricKey =>
        ALL_METRIC_KEYS.includes(k as MetricKey)
      );
      if (valid.length > 0) return new Set(valid);
    }
  } catch {
    // Ignore parse errors
  }
  return new Set(ALL_METRIC_KEYS);
}

/** Save visible metrics to localStorage */
function saveVisibleMetrics(visible: Set<MetricKey>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...visible]));
  } catch {
    // Ignore storage errors
  }
}

interface MetricCustomizerProps {
  visibleMetrics: Set<MetricKey>;
  onVisibilityChange: (metrics: Set<MetricKey>) => void;
}

export function MetricCustomizer({
  visibleMetrics,
  onVisibilityChange,
}: MetricCustomizerProps) {
  const handleToggle = (key: MetricKey, checked: boolean) => {
    const next = new Set(visibleMetrics);
    if (checked) {
      next.add(key);
    } else {
      // Prevent unchecking the last visible metric
      if (next.size <= 1) return;
      next.delete(key);
    }
    saveVisibleMetrics(next);
    onVisibilityChange(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <Settings className="size-4" />
          <span className="sr-only">Customize metrics</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="space-y-3">
          <p className="text-sm font-medium">Visible Metrics</p>
          {ALL_METRIC_KEYS.map((key) => {
            const isChecked = visibleMetrics.has(key);
            const isLastVisible = isChecked && visibleMetrics.size <= 1;
            return (
              <label
                key={key}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleToggle(key, checked === true)
                  }
                  disabled={isLastVisible}
                />
                {METRIC_LABELS[key]}
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
