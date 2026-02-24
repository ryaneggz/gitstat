/**
 * Demo data for unauthenticated users or ?demo=true mode.
 * Generates 90 days of realistic synthetic data covering all metric types.
 */

import type { Commit, Repository, PullRequest } from "./github";
import type { ReviewTurnaround } from "@/app/actions/reviews";
import type { IssueCloseRate } from "@/app/actions/issues";
import type { LinesChanged } from "@/app/actions/lines-changed";

/** Seeded pseudo-random number generator for deterministic demo data */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateDemoCommits(): Commit[] {
  const rand = seededRandom(42);
  const commits: Commit[] = [];
  const now = new Date();
  let id = 1;

  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(0, 0, 0, 0);

    // Base rate increases over time (simulating growth)
    const growthFactor = 1 + (90 - daysAgo) / 120;
    // Weekend dip
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const weekendMultiplier = isWeekend ? 0.3 : 1;
    // Random variation
    const baseCommits = 3 * growthFactor * weekendMultiplier;
    const count = Math.max(0, Math.round(baseCommits + (rand() - 0.4) * 4));

    for (let i = 0; i < count; i++) {
      const hour = 9 + Math.floor(rand() * 10);
      const minute = Math.floor(rand() * 60);
      const commitDate = new Date(date);
      commitDate.setHours(hour, minute, 0, 0);

      commits.push({
        sha: `demo${String(id).padStart(8, "0")}`,
        message: `Demo commit ${id}`,
        date: commitDate.toISOString(),
        author: "demo-user",
      });
      id++;
    }
  }

  return commits;
}

function generateDemoPullRequests(): PullRequest[] {
  const rand = seededRandom(123);
  const prs: PullRequest[] = [];
  const now = new Date();
  let id = 1;

  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(0, 0, 0, 0);

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (isWeekend && rand() < 0.7) continue;

    // ~0.8 PRs per weekday on average, increasing over time
    const growthFactor = 1 + (90 - daysAgo) / 150;
    if (rand() > 0.8 * growthFactor) continue;

    const createdAt = new Date(date);
    createdAt.setHours(10 + Math.floor(rand() * 8), Math.floor(rand() * 60));

    const isMerged = rand() < 0.75;
    const isClosed = isMerged || rand() < 0.1;

    const closedDate = isClosed
      ? new Date(createdAt.getTime() + (1 + Math.floor(rand() * 48)) * 3600000)
      : null;

    prs.push({
      id,
      number: id,
      title: `Demo PR #${id}`,
      state: isClosed ? "closed" : "open",
      merged: isMerged,
      createdAt: createdAt.toISOString(),
      updatedAt: (closedDate || createdAt).toISOString(),
      closedAt: closedDate?.toISOString() ?? null,
      mergedAt: isMerged && closedDate ? closedDate.toISOString() : null,
      author: "demo-user",
    });
    id++;
  }

  return prs;
}

const _cachedCommits = generateDemoCommits();
const _cachedPRs = generateDemoPullRequests();

export const DEMO_REPOSITORIES: Repository[] = [
  {
    id: 1,
    name: "web-app",
    fullName: "demo-user/web-app",
    private: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "api-server",
    fullName: "demo-user/api-server",
    private: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: "shared-lib",
    fullName: "demo-user/shared-lib",
    private: false,
    updatedAt: new Date().toISOString(),
  },
];

export const DEMO_REPO_NAMES = DEMO_REPOSITORIES.map((r) => r.name);

export function getDemoCommits(): Commit[] {
  return _cachedCommits;
}

export function getDemoPullRequests(): PullRequest[] {
  return _cachedPRs;
}

export function getDemoReviewTurnaround(): ReviewTurnaround {
  return { averageHours: 4.2, totalPRsReviewed: 38 };
}

export function getDemoIssueCloseRate(): IssueCloseRate {
  return { opened: 24, closed: 19, rate: 0.79 };
}

export function getDemoLinesChanged(): LinesChanged {
  return { additions: 8420, deletions: 3150, total: 11570 };
}
