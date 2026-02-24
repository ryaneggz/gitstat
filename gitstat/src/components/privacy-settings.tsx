"use client";

import * as React from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import type { Repository } from "@/lib/github";
import {
  ALL_METRIC_KEYS,
  METRIC_LABELS,
  type MetricKey,
} from "@/components/metric-customizer";

export interface PrivacySettings {
  /** Repo full names that are eligible for sharing */
  shareableRepos: Set<string>;
  /** Metric keys eligible for export/sharing */
  shareableMetrics: Set<MetricKey>;
}

const STORAGE_KEY = "gitstat-privacy-settings";

interface StoredPrivacy {
  shareableRepos: Record<string, boolean>;
  shareableMetrics: string[];
}

/** Load privacy settings from localStorage, applying defaults based on repo visibility */
export function loadPrivacySettings(repositories: Repository[]): PrivacySettings {
  const defaults: PrivacySettings = {
    shareableRepos: new Set(
      repositories.filter((r) => !r.private).map((r) => r.name)
    ),
    shareableMetrics: new Set(ALL_METRIC_KEYS),
  };

  if (typeof window === "undefined") return defaults;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredPrivacy;

      // Repos: apply stored overrides, default new repos by public/private
      const repoSet = new Set<string>();
      for (const repo of repositories) {
        if (repo.name in parsed.shareableRepos) {
          if (parsed.shareableRepos[repo.name]) repoSet.add(repo.name);
        } else {
          // New repo not in stored settings — default by visibility
          if (!repo.private) repoSet.add(repo.name);
        }
      }

      // Metrics: restore stored, validate against known keys
      const metricSet = new Set<MetricKey>();
      for (const key of parsed.shareableMetrics) {
        if (ALL_METRIC_KEYS.includes(key as MetricKey)) {
          metricSet.add(key as MetricKey);
        }
      }

      return {
        shareableRepos: repoSet,
        shareableMetrics: metricSet.size > 0 ? metricSet : defaults.shareableMetrics,
      };
    }
  } catch {
    // Ignore parse errors
  }

  return defaults;
}

/** Save privacy settings to localStorage */
function savePrivacySettings(
  settings: PrivacySettings,
  repositories: Repository[]
) {
  try {
    const stored: StoredPrivacy = {
      shareableRepos: Object.fromEntries(
        repositories.map((r) => [r.name, settings.shareableRepos.has(r.name)])
      ),
      shareableMetrics: [...settings.shareableMetrics],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Ignore storage errors
  }
}

interface PrivacySettingsProps {
  repositories: Repository[];
  privacy: PrivacySettings;
  onPrivacyChange: (settings: PrivacySettings) => void;
}

export function PrivacySettingsPanel({
  repositories,
  privacy,
  onPrivacyChange,
}: PrivacySettingsProps) {
  const handleRepoToggle = (repoName: string, checked: boolean) => {
    const next: PrivacySettings = {
      shareableRepos: new Set(privacy.shareableRepos),
      shareableMetrics: privacy.shareableMetrics,
    };
    if (checked) {
      next.shareableRepos.add(repoName);
    } else {
      next.shareableRepos.delete(repoName);
    }
    savePrivacySettings(next, repositories);
    onPrivacyChange(next);
  };

  const handleMetricToggle = (key: MetricKey, checked: boolean) => {
    const next: PrivacySettings = {
      shareableRepos: privacy.shareableRepos,
      shareableMetrics: new Set(privacy.shareableMetrics),
    };
    if (checked) {
      next.shareableMetrics.add(key);
    } else {
      // At least 1 metric must remain
      if (next.shareableMetrics.size <= 1) return;
      next.shareableMetrics.delete(key);
    }
    savePrivacySettings(next, repositories);
    onPrivacyChange(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <Shield className="size-4" />
          <span className="sr-only">Privacy settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-medium">Repos eligible for sharing</p>
            <p className="text-xs text-muted-foreground">
              Private repos are excluded by default
            </p>
            {repositories.length === 0 ? (
              <p className="text-xs text-muted-foreground">No repos loaded</p>
            ) : (
              repositories.map((repo) => {
                const isChecked = privacy.shareableRepos.has(repo.name);
                return (
                  <label
                    key={repo.name}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleRepoToggle(repo.name, checked === true)
                      }
                    />
                    <span className="truncate">{repo.name}</span>
                    {repo.private && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        private
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Metrics eligible for export</p>
            {ALL_METRIC_KEYS.map((key) => {
              const isChecked = privacy.shareableMetrics.has(key);
              const isLastVisible =
                isChecked && privacy.shareableMetrics.size <= 1;
              return (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleMetricToggle(key, checked === true)
                    }
                    disabled={isLastVisible}
                  />
                  {METRIC_LABELS[key]}
                </label>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
