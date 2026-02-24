"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { fetchRepoBreakdown, type RepoBreakdownItem } from "@/app/actions/repo-breakdown";
import {
  DateRangeState,
  toGitHubDateRange,
} from "@/components/date-range-picker";
import type { Repository } from "@/lib/github";
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, Loader2, AlertCircle } from "lucide-react";

type SortColumn = "repoName" | "commits" | "prsOpened" | "linesChanged" | "velocity";
type SortDirection = "asc" | "desc";

interface RepoBreakdownProps {
  selectedRepos: string[];
  dateRange: DateRangeState;
  repositories: Repository[];
}

export function RepoBreakdown({
  selectedRepos,
  dateRange,
  repositories,
}: RepoBreakdownProps) {
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState<RepoBreakdownItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sortCol, setSortCol] = React.useState<SortColumn>("commits");
  const [sortDir, setSortDir] = React.useState<SortDirection>("desc");
  const [hasFetched, setHasFetched] = React.useState(false);

  // Track deps to know when to refetch
  const depsKey = `${selectedRepos.join(",")}-${dateRange.from?.toISOString()}-${dateRange.to?.toISOString()}`;
  const lastDepsRef = React.useRef(depsKey);

  // Fetch data when expanded (lazy load)
  React.useEffect(() => {
    if (!open || selectedRepos.length === 0) return;

    // Skip if we already fetched for these deps
    if (hasFetched && lastDepsRef.current === depsKey) return;

    lastDepsRef.current = depsKey;
    setLoading(true);
    setError(null);

    const selectedFullNames = repositories
      .filter((repo) => selectedRepos.includes(repo.name))
      .map((repo) => repo.fullName);

    const githubDateRange = toGitHubDateRange(dateRange);
    const range =
      githubDateRange.since || githubDateRange.until
        ? githubDateRange
        : undefined;

    fetchRepoBreakdown(selectedFullNames, range).then((result) => {
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
        setData([]);
      }
      setLoading(false);
      setHasFetched(true);
    });
  }, [open, selectedRepos, dateRange, repositories, depsKey, hasFetched]);

  // Reset hasFetched when deps change
  React.useEffect(() => {
    setHasFetched(false);
  }, [depsKey]);

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "repoName" ? "asc" : "desc");
    }
  };

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];
      const cmp = typeof valA === "string"
        ? valA.localeCompare(valB as string)
        : (valA as number) - (valB as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <CardTitle>Repository Breakdown</CardTitle>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Loading per-repo stats...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-32 items-center justify-center">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
              </div>
            ) : sortedData.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <HeaderCell col="repoName" label="Repository" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="left" />
                      <HeaderCell col="commits" label="Commits" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <HeaderCell col="prsOpened" label="PRs" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <HeaderCell col="linesChanged" label="Lines Changed" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <HeaderCell col="velocity" label="Velocity" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((item) => (
                      <tr
                        key={item.repoFullName}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 pr-4 font-medium">{item.repoName}</td>
                        <td className="py-3 px-4 text-right tabular-nums">{item.commits}</td>
                        <td className="py-3 px-4 text-right tabular-nums">{item.prsOpened}</td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {item.linesChanged.toLocaleString()}
                        </td>
                        <td className="py-3 pl-4 text-right tabular-nums">
                          {item.velocity}
                          <span className="text-muted-foreground ml-1 text-xs">/day</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function HeaderCell({
  col,
  label,
  sortCol,
  sortDir,
  onSort,
  align = "right",
}: {
  col: SortColumn;
  label: string;
  sortCol: SortColumn;
  sortDir: SortDirection;
  onSort: (col: SortColumn) => void;
  align?: "left" | "right";
}) {
  const isActive = sortCol === col;
  return (
    <th
      className={`py-3 ${align === "left" ? "pr-4 text-left" : "px-4 text-right"} font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${isActive ? "text-foreground" : ""}`}
      onClick={() => onSort(col)}
    >
      {label}
      {isActive &&
        (sortDir === "asc" ? (
          <ArrowUp className="ml-1 inline h-3 w-3" />
        ) : (
          <ArrowDown className="ml-1 inline h-3 w-3" />
        ))}
    </th>
  );
}
