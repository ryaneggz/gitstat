# Spec 01: GitHub API Expansion

## Goal
Extend `src/lib/github.ts` and server actions to fetch PRs, reviews, issues, and lines changed — not just commits.

## Current State
- `github.ts` fetches commits and repositories only
- Server actions: `fetchCommits()`, `fetchRepositories()`

## Requirements

### New GitHub API Endpoints
1. **Pull Requests**: `GET /repos/{owner}/{repo}/pulls` (state=all, per_page=100)
2. **PR Reviews**: `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews`
3. **Issues**: `GET /repos/{owner}/{repo}/issues` (filter=all, state=all)
4. **Commit Stats**: `GET /repos/{owner}/{repo}/commits/{sha}` (for additions/deletions)

### New Types (`src/types/github.ts` or extend existing)
```typescript
interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged_at: string | null;
  created_at: string;
  closed_at: string | null;
  user: { login: string; avatar_url: string };
  additions: number;
  deletions: number;
}

interface Review {
  id: number;
  user: { login: string };
  state: string;
  submitted_at: string;
  pull_request_url: string;
}

interface Issue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
  pull_request?: object; // present if issue is a PR
}
```

### New Server Actions
- `fetchPullRequests(repos: string[], dateRange)` → PR data with merge info
- `fetchReviewTurnaround(repos: string[], dateRange)` → avg time from PR open to first review
- `fetchIssueCloseRate(repos: string[], dateRange)` → issues closed / issues opened
- `fetchLinesChanged(repos: string[], dateRange)` → additions + deletions aggregated

### Rate Limiting
- GitHub API rate limit: 5000/hr with OAuth token
- Implement pagination with `Link` header
- Consider caching with `unstable_cache` (revalidate every 5 min)

## Acceptance Criteria
- [ ] All new fetch functions return typed data
- [ ] Pagination handles repos with >100 items
- [ ] Rate limit errors handled gracefully (show user-friendly message)
- [ ] Typecheck passes
