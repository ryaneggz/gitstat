"use server";

import { getServerSession } from "@/lib/auth";
import { getCommits, getCommitStats, DateRange } from "@/lib/github";
import type { ActionResult } from "./repositories";

export interface LinesChanged {
  additions: number;
  deletions: number;
  total: number;
}

/**
 * Server action to fetch aggregated lines changed (additions + deletions)
 * across multiple repositories
 * @param repoFullNames - Array of repository full names
 * @param dateRange - Optional date range to filter commits
 * @returns Result with aggregated line change stats or rate limit error
 */
export async function fetchLinesChanged(
  repoFullNames: string[],
  dateRange?: DateRange
): Promise<ActionResult<LinesChanged>> {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return { success: true, data: { additions: 0, deletions: 0, total: 0 } };
  }

  if (repoFullNames.length === 0) {
    return { success: true, data: { additions: 0, deletions: 0, total: 0 } };
  }

  // Fetch commits from all repos to get SHAs
  const commitPromises = repoFullNames.map((repoFullName) =>
    getCommits(session.accessToken!, repoFullName, dateRange)
  );

  const commitResults = await Promise.all(commitPromises);

  for (const result of commitResults) {
    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
        minutesUntilReset: result.error.minutesUntilReset,
      };
    }
  }

  // Fetch commit stats per repo (need repo name for the API call)
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (let i = 0; i < repoFullNames.length; i++) {
    const result = commitResults[i];
    if (!result.success || result.data.length === 0) continue;

    const shas = result.data.map((c) => c.sha);
    const statsResult = await getCommitStats(
      session.accessToken!,
      repoFullNames[i],
      shas
    );

    if (!statsResult.success) {
      return {
        success: false,
        error: statsResult.error.message,
        minutesUntilReset: statsResult.error.minutesUntilReset,
      };
    }

    for (const stat of statsResult.data) {
      totalAdditions += stat.additions;
      totalDeletions += stat.deletions;
    }
  }

  return {
    success: true,
    data: {
      additions: totalAdditions,
      deletions: totalDeletions,
      total: totalAdditions + totalDeletions,
    },
  };
}
