"use server";

import { getServerSession } from "@/lib/auth";
import { getCommits, Commit, DateRange } from "@/lib/github";

/**
 * Server action to fetch commits from multiple repositories
 * @param repoFullNames - Array of repository full names (e.g., ["owner/repo1", "owner/repo2"])
 * @param dateRange - Optional date range to filter commits
 * @returns Array of commits from all repositories or empty array if not authenticated
 */
export async function fetchCommits(
  repoFullNames: string[],
  dateRange?: DateRange
): Promise<Commit[]> {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return [];
  }

  if (repoFullNames.length === 0) {
    return [];
  }

  // Fetch commits from all repositories in parallel
  const commitPromises = repoFullNames.map((repoFullName) =>
    getCommits(session.accessToken!, repoFullName, dateRange)
  );

  const commitsArrays = await Promise.all(commitPromises);

  // Flatten and sort all commits by date (newest first)
  const allCommits = commitsArrays.flat();
  allCommits.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return allCommits;
}
