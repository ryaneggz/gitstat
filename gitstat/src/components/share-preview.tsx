"use client";

import * as React from "react";
import html2canvas from "html2canvas";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  ImageIcon,
  Loader2,
  Download,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { Commit, Repository } from "@/lib/github";
import type { DateRangeState } from "@/components/date-range-picker";
import { toGitHubDateRange } from "@/components/date-range-picker";
import { fetchPullRequests } from "@/app/actions/pull-requests";
import { fetchReviewTurnaround } from "@/app/actions/reviews";
import { fetchIssueCloseRate } from "@/app/actions/issues";
import { fetchLinesChanged } from "@/app/actions/lines-changed";

export type ShareTemplate = "stats-card" | "chart-snapshot";
export type SharePlatform = "linkedin" | "x";

const PLATFORM_CONFIGS: Record<
  SharePlatform,
  { label: string; width: number; height: number }
> = {
  linkedin: { label: "LinkedIn", width: 1200, height: 627 },
  x: { label: "X", width: 1600, height: 900 },
};

export interface ShareMetric {
  key: string;
  label: string;
  value: string;
  unit: string;
}

interface ChartDataPoint {
  date: string;
  cumulativeCount: number;
}

interface SharePreviewProps {
  commits: Commit[];
  selectedRepos: string[];
  dateRange: DateRangeState;
  repositories: Repository[];
}

/** Format date range as a short string for overlay */
function formatDateOverlay(dateRange: DateRangeState): string | null {
  if (!dateRange.from && !dateRange.to) return null;
  const from = dateRange.from?.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const to = dateRange.to?.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (from && to) return `${from} - ${to}`;
  if (from) return `From ${from}`;
  return `Until ${to}`;
}

export function SharePreview({
  commits,
  selectedRepos,
  dateRange,
  repositories,
}: SharePreviewProps) {
  const { data: session } = useSession();
  const [open, setOpen] = React.useState(false);
  const [template, setTemplate] = React.useState<ShareTemplate>("stats-card");
  const [platform, setPlatform] = React.useState<SharePlatform>("linkedin");
  const [extraMetrics, setExtraMetrics] = React.useState<ShareMetric[]>([]);
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(
    new Set()
  );
  const [fetchingExtra, setFetchingExtra] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const fetchedDepsRef = React.useRef<string>("");
  const previewRef = React.useRef<HTMLDivElement>(null);

  const userName = session?.user?.name ?? undefined;
  const userImage = session?.user?.image ?? undefined;

  // Commit-based metrics (always available from parent)
  const commitMetrics = React.useMemo((): ShareMetric[] => {
    const total = commits.length;
    const days = new Set(commits.map((c) => c.date.slice(0, 10))).size;
    const velocity = days > 0 ? (total / days).toFixed(1) : "0";
    return [
      {
        key: "commits",
        label: "Commits",
        value: String(total),
        unit: "commits",
      },
      {
        key: "velocity",
        label: "Coding Velocity",
        value: velocity,
        unit: "/day",
      },
    ];
  }, [commits]);

  const allMetrics = React.useMemo(
    () => [...commitMetrics, ...extraMetrics],
    [commitMetrics, extraMetrics]
  );

  // Initialize selected keys when metrics change
  React.useEffect(() => {
    setSelectedKeys(new Set(allMetrics.map((m) => m.key)));
  }, [allMetrics]);

  // Lazy-fetch extra metrics when dialog opens (same pattern as RepoBreakdown)
  React.useEffect(() => {
    if (!open) return;

    const depsKey = `${selectedRepos.join(",")}|${dateRange.from?.toISOString()}|${dateRange.to?.toISOString()}`;
    if (fetchedDepsRef.current === depsKey) return;
    fetchedDepsRef.current = depsKey;

    const selectedFullNames = repositories
      .filter((repo) => selectedRepos.includes(repo.name))
      .map((repo) => repo.fullName);

    if (selectedFullNames.length === 0) {
      setExtraMetrics([]);
      return;
    }

    setFetchingExtra(true);
    const githubDateRange = toGitHubDateRange(dateRange);
    const range =
      githubDateRange.since || githubDateRange.until
        ? githubDateRange
        : undefined;

    Promise.allSettled([
      fetchPullRequests(selectedFullNames, range),
      fetchReviewTurnaround(selectedFullNames, range),
      fetchIssueCloseRate(selectedFullNames, range),
      fetchLinesChanged(selectedFullNames, range),
    ]).then(([prResult, reviewResult, issueResult, linesResult]) => {
      const extra: ShareMetric[] = [];

      if (prResult.status === "fulfilled" && prResult.value.success) {
        const prs = prResult.value.data;
        extra.push({
          key: "prs-opened",
          label: "PRs Opened",
          value: String(prs.length),
          unit: "PRs",
        });
        extra.push({
          key: "prs-merged",
          label: "PRs Merged",
          value: String(prs.filter((pr) => pr.merged).length),
          unit: "merged",
        });
      }
      if (reviewResult.status === "fulfilled" && reviewResult.value.success) {
        extra.push({
          key: "review-turnaround",
          label: "Review Turnaround",
          value: String(reviewResult.value.data.averageHours),
          unit: "avg hrs",
        });
      }
      if (issueResult.status === "fulfilled" && issueResult.value.success) {
        extra.push({
          key: "issue-close-rate",
          label: "Issue Close Rate",
          value: `${Math.round(issueResult.value.data.rate * 100)}%`,
          unit: "close rate",
        });
      }
      if (linesResult.status === "fulfilled" && linesResult.value.success) {
        extra.push({
          key: "lines-changed",
          label: "Lines Changed",
          value: linesResult.value.data.total.toLocaleString(),
          unit: "lines",
        });
      }

      setExtraMetrics(extra);
      setFetchingExtra(false);
    });
  }, [open, selectedRepos, dateRange, repositories]);

  // Build cumulative chart data for Chart Snapshot template
  const chartData = React.useMemo((): ChartDataPoint[] => {
    if (commits.length === 0) return [];
    const sorted = [...commits].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const byDay = new Map<string, number>();
    for (const c of sorted) {
      const day = c.date.slice(0, 10);
      byDay.set(day, (byDay.get(day) || 0) + 1);
    }
    const days = [...byDay.keys()].sort();
    let cum = 0;
    return days.map((day) => {
      cum += byDay.get(day) || 0;
      return { date: day, cumulativeCount: cum };
    });
  }, [commits]);

  const platformConfig = PLATFORM_CONFIGS[platform];
  const visibleMetrics = allMetrics.filter((m) => selectedKeys.has(m.key));

  const toggleMetric = (key: string, checked: boolean) => {
    const next = new Set(selectedKeys);
    if (checked) {
      next.add(key);
    } else {
      if (next.size <= 1) return;
      next.delete(key);
    }
    setSelectedKeys(next);
  };

  /** Capture the preview element as a canvas at the target platform dimensions */
  const captureImage = async (): Promise<HTMLCanvasElement> => {
    if (!previewRef.current) {
      throw new Error("Preview element not found");
    }

    const canvas = await html2canvas(previewRef.current, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
    });

    // Create a final canvas at exact platform dimensions
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = platformConfig.width;
    exportCanvas.height = platformConfig.height;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Draw captured content scaled to fill the platform dimensions
    ctx.drawImage(canvas, 0, 0, platformConfig.width, platformConfig.height);

    return exportCanvas;
  };

  const handleDownload = async () => {
    setExporting(true);
    try {
      const canvas = await captureImage();
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `gitstat-${template}-${platform}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Image downloaded", {
        description: `${platformConfig.width}x${platformConfig.height} PNG saved`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download failed", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    setExporting(true);
    try {
      const canvas = await captureImage();

      // Try modern clipboard API first
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof ClipboardItem !== "undefined"
      ) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to create image blob"));
          }, "image/png");
        });

        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copied to clipboard", {
          description: "Image ready to paste",
        });
      } else {
        // Fallback: download the file instead
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `gitstat-${template}-${platform}.png`;
        link.href = dataUrl;
        link.click();

        toast.info("Clipboard not supported", {
          description: "Image downloaded instead",
        });
      }
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Copy failed", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ImageIcon className="mr-2 h-4 w-4" />
          Create Graphic
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Share Preview</DialogTitle>
          <DialogDescription>
            Customize your shareable graphic before downloading
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[1fr_240px]">
          {/* Live Preview */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Preview</p>
            <div
              ref={previewRef}
              className="overflow-hidden rounded-lg border"
              style={{
                aspectRatio: `${platformConfig.width} / ${platformConfig.height}`,
              }}
            >
              {template === "stats-card" ? (
                <StatsCardPreview
                  metrics={visibleMetrics}
                  userName={userName}
                  userImage={userImage}
                  dateOverlay={formatDateOverlay(dateRange)}
                  repoNames={selectedRepos}
                />
              ) : (
                <ChartSnapshotPreview
                  metrics={visibleMetrics}
                  chartData={chartData}
                  userName={userName}
                  userImage={userImage}
                  dateOverlay={formatDateOverlay(dateRange)}
                  repoNames={selectedRepos}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {platformConfig.width} &times; {platformConfig.height}px &bull;{" "}
              {platformConfig.label}
            </p>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template</label>
              <Select
                value={template}
                onValueChange={(v) => setTemplate(v as ShareTemplate)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stats-card">Stats Card</SelectItem>
                  <SelectItem value="chart-snapshot">
                    Chart Snapshot
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Platform</label>
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as SharePlatform)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">
                    LinkedIn (1200&times;627)
                  </SelectItem>
                  <SelectItem value="x">X (1600&times;900)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Metrics to include</p>
              {fetchingExtra ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading metrics...
                </div>
              ) : (
                <div className="space-y-2">
                  {allMetrics.map((metric) => {
                    const isChecked = selectedKeys.has(metric.key);
                    const isLastVisible =
                      isChecked && selectedKeys.size <= 1;
                    return (
                      <label
                        key={metric.key}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            toggleMetric(metric.key, checked === true)
                          }
                          disabled={isLastVisible}
                        />
                        {metric.label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Export Actions */}
            <div className="space-y-2 pt-2 border-t">
              <Button
                className="w-full"
                onClick={handleDownload}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download PNG
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={exporting}
              >
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : exporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Stats Card template — dark card with metric grid */
function StatsCardPreview({
  metrics,
  userName,
  userImage,
  dateOverlay,
  repoNames,
}: {
  metrics: ShareMetric[];
  userName?: string;
  userImage?: string;
  dateOverlay?: string | null;
  repoNames?: string[];
}) {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-zinc-950 p-[6%] text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[3%]">
          {userImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt=""
              className="h-[10%] aspect-square rounded-full"
              style={{ height: "2em" }}
              crossOrigin="anonymous"
            />
          )}
          <div>
            {userName && (
              <p className="text-sm font-semibold leading-tight">{userName}</p>
            )}
            <p className="text-xs text-zinc-500">Developer Productivity</p>
          </div>
        </div>
        <p className="text-lg font-bold tracking-tight">GitStat</p>
      </div>

      {/* Date range and repo overlay */}
      {(dateOverlay || (repoNames && repoNames.length > 0)) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
          {dateOverlay && <span>{dateOverlay}</span>}
          {repoNames && repoNames.length > 0 && (
            <span>{repoNames.join(", ")}</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-[6%] gap-y-[4%] sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.key}>
            <p className="text-2xl font-bold tabular-nums leading-tight">
              {m.value}
            </p>
            <p className="text-[11px] text-zinc-400">{m.label}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-zinc-600">
        gitstat.dev{userName ? ` · @${userName}` : ""}
      </p>
    </div>
  );
}

/** Chart Snapshot template — mini SVG chart with stat badges */
function ChartSnapshotPreview({
  metrics,
  chartData,
  userName,
  userImage,
  dateOverlay,
  repoNames,
}: {
  metrics: ShareMetric[];
  chartData: ChartDataPoint[];
  userName?: string;
  userImage?: string;
  dateOverlay?: string | null;
  repoNames?: string[];
}) {
  const svgPoints = React.useMemo(() => {
    if (chartData.length === 0) return "";
    const max = Math.max(...chartData.map((d) => d.cumulativeCount));
    if (max === 0) return "";
    return chartData
      .map((d, i) => {
        const x = (i / Math.max(chartData.length - 1, 1)) * 100;
        const y = 100 - (d.cumulativeCount / max) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  }, [chartData]);

  // Build filled polygon points (polyline + baseline)
  const fillPoints = svgPoints
    ? `0,100 ${svgPoints} 100,100`
    : "";

  return (
    <div className="flex h-full w-full flex-col justify-between bg-zinc-950 p-[6%] text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[3%]">
          {userImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt=""
              className="aspect-square rounded-full"
              style={{ height: "2em" }}
              crossOrigin="anonymous"
            />
          )}
          <div>
            {userName && (
              <p className="text-sm font-semibold leading-tight">{userName}</p>
            )}
            <p className="text-xs text-zinc-500">Commit Timeline</p>
          </div>
        </div>
        <p className="text-lg font-bold tracking-tight">GitStat</p>
      </div>

      {/* Date range and repo overlay */}
      {(dateOverlay || (repoNames && repoNames.length > 0)) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
          {dateOverlay && <span>{dateOverlay}</span>}
          {repoNames && repoNames.length > 0 && (
            <span>{repoNames.join(", ")}</span>
          )}
        </div>
      )}

      <div className="flex-1 py-[3%]">
        {svgPoints ? (
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full"
            preserveAspectRatio="none"
          >
            <polygon
              points={fillPoints}
              fill="hsl(142 71% 45% / 0.15)"
            />
            <polyline
              points={svgPoints}
              fill="none"
              stroke="hsl(142 71% 45%)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500">
            No chart data
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {metrics.map((m) => (
          <span key={m.key} className="text-xs">
            <span className="font-bold">{m.value}</span>{" "}
            <span className="text-zinc-400">{m.label}</span>
          </span>
        ))}
      </div>

      <p className="mt-[2%] text-[10px] text-zinc-600">
        gitstat.dev{userName ? ` · @${userName}` : ""}
      </p>
    </div>
  );
}
