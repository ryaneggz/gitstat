"use server";

import { getServerSession } from "@/lib/auth";
import { getCommits, getPullRequests, getCommitStats, DateRange } from "@/lib/github";
import type { ActionResult } from "./repositories";

export interface RepoBreakdownItem {
  repoName: string;
  repoFullName: string;
  commits: number;
  prsOpened: number;
  linesChanged: number;
  velocity: number;
}

/**
 * Server action to fetch per-repo breakdown stats
 * @param repoFullNames - Array of repository full names
 * @param dateRange - Optional date range to filter data
 * @returns Result with per-repo breakdown items or error
 */
export async function fetchRepoBreakdown(
  repoFullNames: string[],
  dateRange?: DateRange
): Promise<ActionResult<RepoBreakdownItem[]>> {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return { success: true, data: [] };
  }

  if (repoFullNames.length === 0) {
    return { success: true, data: [] };
  }

  const items: RepoBreakdownItem[] = [];

  // Process repos in parallel
  const repoPromises = repoFullNames.map(async (repoFullName) => {
    const repoName = repoFullName.split("/").pop() ?? repoFullName;

    // Fetch commits and PRs in parallel
    const [commitsResult, prsResult] = await Promise.all([
      getCommits(session.accessToken!, repoFullName, dateRange),
      getPullRequests(session.accessToken!, repoFullName),
    ]);

    if (!commitsResult.success) {
      return {
        success: false as const,
        error: commitsResult.error.message,
        minutesUntilReset: commitsResult.error.minutesUntilReset,
      };
    }
    if (!prsResult.success) {
      return {
        success: false as const,
        error: prsResult.error.message,
        minutesUntilReset: prsResult.error.minutesUntilReset,
      };
    }

    const commits = commitsResult.data;

    // Filter PRs by date range
    let prs = prsResult.data;
    if (dateRange?.since) {
      const since = new Date(dateRange.since).getTime();
      prs = prs.filter((pr) => new Date(pr.createdAt).getTime() >= since);
    }
    if (dateRange?.until) {
      const until = new Date(dateRange.until).getTime();
      prs = prs.filter((pr) => new Date(pr.createdAt).getTime() <= until);
    }

    // Fetch lines changed from commit stats (limit to first 50 commits to avoid rate limits)
    let linesChanged = 0;
    if (commits.length > 0) {
      const shas = commits.slice(0, 50).map((c) => c.sha);
      const statsResult = await getCommitStats(
        session.accessToken!,
        repoFullName,
        shas
      );
      if (statsResult.success) {
        linesChanged = statsResult.data.reduce((sum, s) => sum + s.total, 0);
      }
    }

    // Compute velocity (commits per active day)
    const daySet = new Set(commits.map((c) => c.date.slice(0, 10)));
    const activeDays = daySet.size;
    const velocity = activeDays > 0 ? commits.length / activeDays : 0;

    return {
      success: true as const,
      data: {
        repoName,
        repoFullName,
        commits: commits.length,
        prsOpened: prs.length,
        linesChanged,
        velocity: Math.round(velocity * 10) / 10,
      } satisfies RepoBreakdownItem,
    };
  });

  const results = await Promise.all(repoPromises);

  for (const result of results) {
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        minutesUntilReset: result.minutesUntilReset,
      };
    }
    items.push(result.data);
  }

  // Sort by commits descending by default
  items.sort((a, b) => b.commits - a.commits);

  return { success: true, data: items };
}
