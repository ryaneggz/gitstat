"use server";

import { getServerSession } from "@/lib/auth";
import { getPullRequests, getReviews, DateRange } from "@/lib/github";
import type { ActionResult } from "./repositories";

export interface ReviewTurnaround {
  averageHours: number;
  totalPRsReviewed: number;
}

/**
 * Server action to calculate average review turnaround time
 * (avg hours from PR open to first review) across multiple repositories
 * @param repoFullNames - Array of repository full names
 * @param dateRange - Optional date range to filter PRs by creation date
 * @returns Result with average review turnaround hours or rate limit error
 */
export async function fetchReviewTurnaround(
  repoFullNames: string[],
  dateRange?: DateRange
): Promise<ActionResult<ReviewTurnaround>> {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return { success: true, data: { averageHours: 0, totalPRsReviewed: 0 } };
  }

  if (repoFullNames.length === 0) {
    return { success: true, data: { averageHours: 0, totalPRsReviewed: 0 } };
  }

  // Fetch all PRs from all repos
  const prPromises = repoFullNames.map((repoFullName) =>
    getPullRequests(session.accessToken!, repoFullName)
  );

  const prResults = await Promise.all(prPromises);

  for (const result of prResults) {
    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
        minutesUntilReset: result.error.minutesUntilReset,
      };
    }
  }

  const turnaroundHours: number[] = [];

  for (let i = 0; i < repoFullNames.length; i++) {
    const result = prResults[i];
    if (!result.success) continue;

    let repoPRs = result.data;

    // Apply date range filter
    if (dateRange?.since) {
      const since = new Date(dateRange.since).getTime();
      repoPRs = repoPRs.filter(
        (pr) => new Date(pr.createdAt).getTime() >= since
      );
    }
    if (dateRange?.until) {
      const until = new Date(dateRange.until).getTime();
      repoPRs = repoPRs.filter(
        (pr) => new Date(pr.createdAt).getTime() <= until
      );
    }

    // Fetch reviews for each PR in this repo
    for (const pr of repoPRs) {
      const reviewResult = await getReviews(
        session.accessToken!,
        repoFullNames[i],
        pr.number
      );

      if (!reviewResult.success) {
        return {
          success: false,
          error: reviewResult.error.message,
          minutesUntilReset: reviewResult.error.minutesUntilReset,
        };
      }

      if (reviewResult.data.length === 0) continue;

      // Find the earliest review
      const firstReview = reviewResult.data.reduce((earliest, review) =>
        new Date(review.submittedAt).getTime() <
        new Date(earliest.submittedAt).getTime()
          ? review
          : earliest
      );

      const prCreated = new Date(pr.createdAt).getTime();
      const reviewSubmitted = new Date(firstReview.submittedAt).getTime();
      const hours = (reviewSubmitted - prCreated) / (1000 * 60 * 60);

      if (hours >= 0) {
        turnaroundHours.push(hours);
      }
    }
  }

  const averageHours =
    turnaroundHours.length > 0
      ? turnaroundHours.reduce((sum, h) => sum + h, 0) /
        turnaroundHours.length
      : 0;

  return {
    success: true,
    data: {
      averageHours: Math.round(averageHours * 10) / 10,
      totalPRsReviewed: turnaroundHours.length,
    },
  };
}
