/**
 * GitHub API client for fetching user data
 */

/**
 * Custom error type for GitHub API rate limit errors
 */
export class GitHubRateLimitError extends Error {
  public resetTime: Date;
  public minutesUntilReset: number;

  constructor(resetTimestamp: number) {
    const resetTime = new Date(resetTimestamp * 1000);
    const now = new Date();
    const minutesUntilReset = Math.max(
      1,
      Math.ceil((resetTime.getTime() - now.getTime()) / (1000 * 60))
    );

    super(
      `GitHub API rate limit exceeded. Try again in ${minutesUntilReset} minute${minutesUntilReset === 1 ? "" : "s"}.`
    );

    this.name = "GitHubRateLimitError";
    this.resetTime = resetTime;
    this.minutesUntilReset = minutesUntilReset;
  }
}

/**
 * Result type for GitHub API calls that can return data or a rate limit error
 */
export type GitHubResult<T> =
  | { success: true; data: T }
  | { success: false; error: GitHubRateLimitError };

/**
 * Helper to check if a response is a rate limit error
 */
function checkRateLimitError(response: Response): GitHubRateLimitError | null {
  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
    const rateLimitReset = response.headers.get("x-ratelimit-reset");

    // GitHub returns 403 with x-ratelimit-remaining: 0 when rate limited
    if (rateLimitRemaining === "0" && rateLimitReset) {
      const resetTimestamp = parseInt(rateLimitReset, 10);
      return new GitHubRateLimitError(resetTimestamp);
    }
  }
  return null;
}

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  updatedAt: string;
}

export interface Commit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

export interface DateRange {
  since?: string; // ISO 8601 date string
  until?: string; // ISO 8601 date string
}

interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  updated_at: string;
}

interface GitHubCommitResponse {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

/**
 * Fetches user's repositories from the GitHub API
 * @param accessToken - OAuth access token from the user's session
 * @returns Result with array of repositories or rate limit error
 */
export async function getRepositories(
  accessToken: string
): Promise<GitHubResult<Repository[]>> {
  try {
    const repos: Repository[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await fetch(
        `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      // Check for rate limit error
      const rateLimitError = checkRateLimitError(response);
      if (rateLimitError) {
        return { success: false, error: rateLimitError };
      }

      if (!response.ok) {
        console.error(
          `GitHub API error: ${response.status} ${response.statusText}`
        );
        return { success: true, data: [] };
      }

      const data: GitHubRepoResponse[] = await response.json();

      if (data.length === 0) {
        break;
      }

      repos.push(
        ...data.map((repo) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
          updatedAt: repo.updated_at,
        }))
      );

      // If we got fewer than perPage, we've reached the last page
      if (data.length < perPage) {
        break;
      }

      page++;
    }

    return { success: true, data: repos };
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return { success: true, data: [] };
  }
}

/**
 * Fetches commits from a repository
 * @param accessToken - OAuth access token from the user's session
 * @param repoFullName - Full repository name (e.g., "owner/repo")
 * @param dateRange - Optional date range to filter commits
 * @returns Result with array of commits or rate limit error
 */
export async function getCommits(
  accessToken: string,
  repoFullName: string,
  dateRange?: DateRange
): Promise<GitHubResult<Commit[]>> {
  try {
    const commits: Commit[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      // Build URL with query parameters
      const params = new URLSearchParams({
        per_page: perPage.toString(),
        page: page.toString(),
      });

      if (dateRange?.since) {
        params.set("since", dateRange.since);
      }
      if (dateRange?.until) {
        params.set("until", dateRange.until);
      }

      const response = await fetch(
        `https://api.github.com/repos/${repoFullName}/commits?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      // Check for rate limit error
      const rateLimitError = checkRateLimitError(response);
      if (rateLimitError) {
        return { success: false, error: rateLimitError };
      }

      if (!response.ok) {
        console.error(
          `GitHub API error fetching commits: ${response.status} ${response.statusText}`
        );
        return { success: true, data: [] };
      }

      const data: GitHubCommitResponse[] = await response.json();

      if (data.length === 0) {
        break;
      }

      commits.push(
        ...data.map((commit) => ({
          sha: commit.sha,
          message: commit.commit.message,
          date: commit.commit.author.date,
          author: commit.commit.author.name,
        }))
      );

      // If we got fewer than perPage, we've reached the last page
      if (data.length < perPage) {
        break;
      }

      page++;
    }

    return { success: true, data: commits };
  } catch (error) {
    console.error("Error fetching commits:", error);
    return { success: true, data: [] };
  }
}
