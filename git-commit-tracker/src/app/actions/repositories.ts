"use server";

import { getServerSession } from "@/lib/auth";
import { getRepositories, Repository } from "@/lib/github";

/**
 * Server action to fetch the current user's repositories
 * @returns Array of repositories or empty array if not authenticated
 */
export async function fetchRepositories(): Promise<Repository[]> {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return [];
  }

  return getRepositories(session.accessToken);
}
