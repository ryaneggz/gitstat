"use server";

import { getServerSession } from "@/lib/auth";
import { getPullRequests, PullRequest, DateRange } from "@/lib/github";
import type { ActionResult } from "./repositories";

/**
 * Server action to fetch pull requests from multiple repositories
 * @param repoFullNames - Array of repository full names (e.g., ["owner/repo1", "owner/repo2"])
 * @param dateRange - Optional date range to filter PRs by creation date
 * @returns Result with array of pull requests or rate limit error message
 */
export async function fetchPullRequests(
  repoFullNames: string[],
  dateRange?: DateRange
): Promise<ActionResult<PullRequest[]>> {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return { success: true, data: [] };
  }

  if (repoFullNames.length === 0) {
    return { success: true, data: [] };
  }

  const prPromises = repoFullNames.map((repoFullName) =>
    getPullRequests(session.accessToken!, repoFullName)
  );

  const results = await Promise.all(prPromises);

  for (const result of results) {
    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
        minutesUntilReset: result.error.minutesUntilReset,
      };
    }
  }

  let allPRs = results.flatMap((r) => (r.success ? r.data : []));

  // Filter by date range if provided
  if (dateRange?.since) {
    const since = new Date(dateRange.since).getTime();
    allPRs = allPRs.filter((pr) => new Date(pr.createdAt).getTime() >= since);
  }
  if (dateRange?.until) {
    const until = new Date(dateRange.until).getTime();
    allPRs = allPRs.filter((pr) => new Date(pr.createdAt).getTime() <= until);
  }

  allPRs.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return { success: true, data: allPRs };
}
