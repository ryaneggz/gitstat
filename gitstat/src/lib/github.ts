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

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  merged: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  author: string;
}

export interface Review {
  id: number;
  pullRequestNumber: number;
  state: string;
  submittedAt: string;
  author: string;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  author: string;
}

export interface CommitStats {
  sha: string;
  additions: number;
  deletions: number;
  total: number;
}

interface GitHubPullRequestResponse {
  id: number;
  number: number;
  title: string;
  state: string;
  merged_at: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: { login: string } | null;
}

interface GitHubReviewResponse {
  id: number;
  state: string;
  submitted_at: string;
  user: { login: string } | null;
}

interface GitHubIssueResponse {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: { login: string } | null;
  pull_request?: unknown;
}

interface GitHubCommitDetailResponse {
  sha: string;
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
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

/**
 * Fetches pull requests from a repository
 * @param accessToken - OAuth access token from the user's session
 * @param repoFullName - Full repository name (e.g., "owner/repo")
 * @param state - Filter by PR state (default: "all")
 * @returns Result with array of pull requests or rate limit error
 */
export async function getPullRequests(
  accessToken: string,
  repoFullName: string,
  state: "open" | "closed" | "all" = "all"
): Promise<GitHubResult<PullRequest[]>> {
  try {
    const pullRequests: PullRequest[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const params = new URLSearchParams({
        state,
        sort: "created",
        direction: "desc",
        per_page: perPage.toString(),
        page: page.toString(),
      });

      const response = await fetch(
        `https://api.github.com/repos/${repoFullName}/pulls?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      const rateLimitError = checkRateLimitError(response);
      if (rateLimitError) {
        return { success: false, error: rateLimitError };
      }

      if (!response.ok) {
        console.error(
          `GitHub API error fetching pull requests: ${response.status} ${response.statusText}`
        );
        return { success: true, data: [] };
      }

      const data: GitHubPullRequestResponse[] = await response.json();

      if (data.length === 0) {
        break;
      }

      pullRequests.push(
        ...data.map((pr) => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          state: (pr.state === "open" ? "open" : "closed") as
            | "open"
            | "closed",
          merged: pr.merged_at !== null,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          closedAt: pr.closed_at,
          mergedAt: pr.merged_at,
          author: pr.user?.login ?? "unknown",
        }))
      );

      if (data.length < perPage) {
        break;
      }

      page++;
    }

    return { success: true, data: pullRequests };
  } catch (error) {
    console.error("Error fetching pull requests:", error);
    return { success: true, data: [] };
  }
}

/**
 * Fetches reviews for a specific pull request
 * @param accessToken - OAuth access token from the user's session
 * @param repoFullName - Full repository name (e.g., "owner/repo")
 * @param pullNumber - Pull request number
 * @returns Result with array of reviews or rate limit error
 */
export async function getReviews(
  accessToken: string,
  repoFullName: string,
  pullNumber: number
): Promise<GitHubResult<Review[]>> {
  try {
    const reviews: Review[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const params = new URLSearchParams({
        per_page: perPage.toString(),
        page: page.toString(),
      });

      const response = await fetch(
        `https://api.github.com/repos/${repoFullName}/pulls/${pullNumber}/reviews?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      const rateLimitError = checkRateLimitError(response);
      if (rateLimitError) {
        return { success: false, error: rateLimitError };
      }

      if (!response.ok) {
        console.error(
          `GitHub API error fetching reviews: ${response.status} ${response.statusText}`
        );
        return { success: true, data: [] };
      }

      const data: GitHubReviewResponse[] = await response.json();

      if (data.length === 0) {
        break;
      }

      reviews.push(
        ...data.map((review) => ({
          id: review.id,
          pullRequestNumber: pullNumber,
          state: review.state,
          submittedAt: review.submitted_at,
          author: review.user?.login ?? "unknown",
        }))
      );

      if (data.length < perPage) {
        break;
      }

      page++;
    }

    return { success: true, data: reviews };
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return { success: true, data: [] };
  }
}

/**
 * Fetches issues from a repository (excluding pull requests)
 * @param accessToken - OAuth access token from the user's session
 * @param repoFullName - Full repository name (e.g., "owner/repo")
 * @param dateRange - Optional date range to filter issues by update time
 * @returns Result with array of issues or rate limit error
 */
export async function getIssues(
  accessToken: string,
  repoFullName: string,
  dateRange?: DateRange
): Promise<GitHubResult<Issue[]>> {
  try {
    const issues: Issue[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const params = new URLSearchParams({
        state: "all",
        sort: "created",
        direction: "desc",
        per_page: perPage.toString(),
        page: page.toString(),
      });

      if (dateRange?.since) {
        params.set("since", dateRange.since);
      }

      const response = await fetch(
        `https://api.github.com/repos/${repoFullName}/issues?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      const rateLimitError = checkRateLimitError(response);
      if (rateLimitError) {
        return { success: false, error: rateLimitError };
      }

      if (!response.ok) {
        console.error(
          `GitHub API error fetching issues: ${response.status} ${response.statusText}`
        );
        return { success: true, data: [] };
      }

      const data: GitHubIssueResponse[] = await response.json();

      if (data.length === 0) {
        break;
      }

      // Filter out pull requests (GitHub issues API includes PRs)
      const issueOnly = data.filter((item) => !item.pull_request);

      issues.push(
        ...issueOnly.map((issue) => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: (issue.state === "open" ? "open" : "closed") as
            | "open"
            | "closed",
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          closedAt: issue.closed_at,
          author: issue.user?.login ?? "unknown",
        }))
      );

      if (data.length < perPage) {
        break;
      }

      page++;
    }

    return { success: true, data: issues };
  } catch (error) {
    console.error("Error fetching issues:", error);
    return { success: true, data: [] };
  }
}

async function fetchSingleCommitStats(
  accessToken: string,
  repoFullName: string,
  sha: string
): Promise<GitHubResult<CommitStats | null>> {
  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/commits/${sha}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  const rateLimitError = checkRateLimitError(response);
  if (rateLimitError) {
    return { success: false, error: rateLimitError };
  }

  if (!response.ok) {
    console.error(
      `GitHub API error fetching commit stats for ${sha}: ${response.status}`
    );
    return { success: true, data: null };
  }

  const data: GitHubCommitDetailResponse = await response.json();
  return {
    success: true,
    data: {
      sha: data.sha,
      additions: data.stats.additions,
      deletions: data.stats.deletions,
      total: data.stats.total,
    },
  };
}

/**
 * Fetches commit statistics (lines added/deleted) for specific commits
 * @param accessToken - OAuth access token from the user's session
 * @param repoFullName - Full repository name (e.g., "owner/repo")
 * @param shas - Array of commit SHAs to fetch stats for
 * @returns Result with array of commit stats or rate limit error
 */
export async function getCommitStats(
  accessToken: string,
  repoFullName: string,
  shas: string[]
): Promise<GitHubResult<CommitStats[]>> {
  try {
    const stats: CommitStats[] = [];
    const batchSize = 10;

    for (let i = 0; i < shas.length; i += batchSize) {
      const batch = shas.slice(i, i + batchSize);

      for (const result of await Promise.all(
        batch.map((sha) =>
          fetchSingleCommitStats(accessToken, repoFullName, sha)
        )
      )) {
        if (!result.success) {
          return result;
        }
        if (result.data) {
          stats.push(result.data);
        }
      }
    }

    return { success: true, data: stats };
  } catch (error) {
    console.error("Error fetching commit stats:", error);
    return { success: true, data: [] };
  }
}
