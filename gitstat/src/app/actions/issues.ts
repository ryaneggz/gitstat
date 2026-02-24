"use server";

import { getServerSession } from "@/lib/auth";
import { getIssues, DateRange } from "@/lib/github";
import type { ActionResult } from "./repositories";

export interface IssueCloseRate {
  opened: number;
  closed: number;
  rate: number; // closed / opened ratio (0-1), 0 if no issues opened
}

/**
 * Server action to calculate issue close rate (closed/opened ratio)
 * across multiple repositories
 * @param repoFullNames - Array of repository full names
 * @param dateRange - Optional date range to filter issues
 * @returns Result with issue close rate or rate limit error
 */
export async function fetchIssueCloseRate(
  repoFullNames: string[],
  dateRange?: DateRange
): Promise<ActionResult<IssueCloseRate>> {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return { success: true, data: { opened: 0, closed: 0, rate: 0 } };
  }

  if (repoFullNames.length === 0) {
    return { success: true, data: { opened: 0, closed: 0, rate: 0 } };
  }

  const issuePromises = repoFullNames.map((repoFullName) =>
    getIssues(session.accessToken!, repoFullName, dateRange)
  );

  const results = await Promise.all(issuePromises);

  for (const result of results) {
    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
        minutesUntilReset: result.error.minutesUntilReset,
      };
    }
  }

  let allIssues = results.flatMap((r) => (r.success ? r.data : []));

  // The GitHub issues API `since` param filters by update time, not creation time.
  // Apply creation-time filtering here for consistency with other actions.
  if (dateRange?.since) {
    const since = new Date(dateRange.since).getTime();
    allIssues = allIssues.filter(
      (issue) => new Date(issue.createdAt).getTime() >= since
    );
  }
  if (dateRange?.until) {
    const until = new Date(dateRange.until).getTime();
    allIssues = allIssues.filter(
      (issue) => new Date(issue.createdAt).getTime() <= until
    );
  }

  const opened = allIssues.length;
  const closed = allIssues.filter((issue) => issue.state === "closed").length;
  const rate = opened > 0 ? Math.round((closed / opened) * 100) / 100 : 0;

  return {
    success: true,
    data: { opened, closed, rate },
  };
}
