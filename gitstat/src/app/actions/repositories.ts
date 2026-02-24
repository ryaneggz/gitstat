"use server";

import { getServerSession } from "@/lib/auth";
import { getRepositories, Repository } from "@/lib/github";

/**
 * Result type for server actions that can return rate limit errors
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; minutesUntilReset?: number };

/**
 * Server action to fetch the current user's repositories
 * @returns Result with array of repositories or error message
 */
export async function fetchRepositories(): Promise<ActionResult<Repository[]>> {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return { success: true, data: [] };
  }

  const result = await getRepositories(session.accessToken);

  if (!result.success) {
    return {
      success: false,
      error: result.error.message,
      minutesUntilReset: result.error.minutesUntilReset,
    };
  }

  return { success: true, data: result.data };
}
