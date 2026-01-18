"use server";

import { getServerSession } from "@/lib/auth";
import { getCommits, Commit, DateRange } from "@/lib/github";
import type { ActionResult } from "./repositories";

/**
 * Server action to fetch commits from multiple repositories
 * @param repoFullNames - Array of repository full names (e.g., ["owner/repo1", "owner/repo2"])
 * @param dateRange - Optional date range to filter commits
 * @returns Result with array of commits or rate limit error message
 */
export async function fetchCommits(
  repoFullNames: string[],
  dateRange?: DateRange
): Promise<ActionResult<Commit[]>> {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return { success: true, data: [] };
  }

  if (repoFullNames.length === 0) {
    return { success: true, data: [] };
  }

  // Fetch commits from all repositories in parallel
  const commitPromises = repoFullNames.map((repoFullName) =>
    getCommits(session.accessToken!, repoFullName, dateRange)
  );

  const results = await Promise.all(commitPromises);

  // Check if any result is a rate limit error
  for (const result of results) {
    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
        minutesUntilReset: result.error.minutesUntilReset,
      };
    }
  }

  // Flatten and sort all commits by date (newest first)
  const allCommits = results.flatMap((r) => (r.success ? r.data : []));
  allCommits.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return { success: true, data: allCommits };
}
