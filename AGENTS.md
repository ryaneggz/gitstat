# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GitStat** is a lightweight visualization app that transforms GitHub commit history into a linear timeline showing momentum and compounding progress. Target users are developers who build in public and want to showcase their productivity growth.

## Tech Stack

- **Frontend**: Next.js (App Router), TypeScript, shadcn/ui, Tailwind CSS, Recharts/Visx
- **Backend**: Next.js API routes, GitHub OAuth, GitHub GraphQL API
- **Caching**: Redis or edge cache

## Development Commands

```bash
# Frontend
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Production build
npm run test         # Run tests
npm run lint         # Lint code

# Full stack
make format          # Format all code
make test            # Run all tests
```

## Architecture

### Core Data Model

```ts
CommitEvent {
  date: Date
  count: number
  cumulative: number
}
```

### Key Components (to be built)

1. **GitHub OAuth flow** - Authentication with GitHub
2. **Commit fetcher** - GitHub GraphQL API integration to fetch commit data
3. **Timeline visualization** - Linear cumulative commit chart (dark-mode first)
4. **Velocity indicators** - Weekly/monthly rates, growth percentages
5. **Export system** - PNG generation optimized for social sharing

### UX Principles

- Opinionated defaults, zero configuration to value
- Dark-mode first, "screenshot-ready" at all times
- No dashboards, no clutter

## Workflow Commands

Use these Claude Code commands for common workflows:

| Command                   | Purpose                          |
| ------------------------- | -------------------------------- |
| `/prime`                  | Understand project structure     |
| `/plan [task]`            | Create implementation plan       |
| `/team query="[feature]"` | Multi-agent code analysis        |
| `/reflection`             | Reflect on development decisions |

## Ralph Agent

This project uses the Ralph autonomous agent system. When working as a Ralph agent:

1. Read `prd.json` for user stories
2. Check `progress.txt` for codebase patterns and previous learnings
3. Work on one user story at a time
4. Run quality checks before committing
5. Update `AGENTS.md` files when discovering reusable patterns
6. For frontend changes, verify in browser using `agent-browser` skill

## Dev Agent Authentication

In development (`NODE_ENV=development`), a CredentialsProvider bypasses GitHub OAuth for headless agent workflows.

**Endpoint:** `POST /api/auth/callback/dev-credentials`

**Credentials:**
- Username: `admin`
- Password: `test1234`

**Requirement:** `GITHUB_TOKEN` must be set in your environment (see `.env.example`). The token is used as the GitHub access token for API calls made during the dev session.

**Programmatic login example (curl):**

```bash
# 1. Fetch the CSRF token
CSRF=$(curl -s http://localhost:3000/api/auth/csrf | jq -r '.csrfToken')

# 2. Authenticate and store session cookie
curl -s -c cookies.txt -L \
  -X POST http://localhost:3000/api/auth/callback/dev-credentials \
  -d "username=admin&password=test1234&csrfToken=$CSRF"

# 3. Use cookies.txt for subsequent authenticated requests
curl -s -b cookies.txt http://localhost:3000/api/some-protected-route
```

## Non-Goals

The following are explicitly out of scope:

- Code quality analysis
- Lines of code metrics
- AI judgment or scoring
- Team analytics (initially)
