## Metadata

> **IMPORTANT**: The very first step should _ALWAYS_ be validating this metadata section to maintain a **CLEAN** development workflow.

```yml
pull_request_title: "FROM feat/[issue#]-[shortdesc] TO master"
branch: "feat/[issue#]-[shortdesc]"
worktree_path: "$WORKSPACE/.worktrees/feat-[issue#]"
```

---

## User Stories

<!-- Define the feature from the user's perspective FIRST. Every story follows the format:
     "As a [role], I want [capability] so that [benefit]."
     These stories drive all downstream decisions — routes, components, API handlers, and acceptance criteria. -->

- As a **[role]**, I want **[capability]** so that **[benefit]**.
- As a **[role]**, I want **[capability]** so that **[benefit]**.

---

## Summary

<!-- Brief context beyond the user stories. Include visual references if applicable. -->



### Visual Reference

<!-- Screenshots, mockups, or links to reference implementations. -->

---

## Key Integration Points

<!-- Server-side files/functions that need changes. Next.js 16 uses the App Router exclusively. -->

| File | Function(s) / Export | Role |
|------|---------------------|------|
| `src/app/api/.../route.ts` | `GET()` / `POST()` | _e.g., Route Handler for feature CRUD_ |
| `src/app/.../page.tsx` | default export (RSC) | _e.g., Server Component page rendering feature data_ |
| `src/app/.../layout.tsx` | default export | _e.g., Layout wrapping feature pages with providers_ |
| `src/actions/...ts` | `featureAction()` | _e.g., Server Action for mutations_ |
| `src/lib/...ts` | `helperFn()` | _e.g., Shared server utility_ |

---

## UI Integration Points

<!-- Which existing frontend components are modified or extended? Specify shadcn/ui components used. -->

| Component / Route | Change Type | Description |
|-------------------|-------------|-------------|
| _e.g., `src/components/nav.tsx`_ | Modify | _e.g., Add nav link for new feature_ |
| _e.g., `src/app/dashboard/page.tsx`_ | New page | _e.g., Authenticated dashboard with data table_ |

### shadcn/ui Components

<!-- List shadcn/ui components needed. Install via `npx shadcn@latest add <component>`. -->

- [ ] _e.g., `button`, `card`, `dialog`, `form`, `input`, `table`, `toast`_

---

## Storage

<!-- Where and how is data persisted? -->

- **Database**: <!-- e.g., PostgreSQL via Prisma / Drizzle ORM -->
- **Schema / table**: <!-- e.g., `users`, `projects` — reference schema file -->
- **ORM pattern**: <!-- e.g., Drizzle with `db.select().from(table)` / Prisma Client -->
- **Migrations**: <!-- e.g., `npx drizzle-kit generate` then `npx drizzle-kit migrate` -->

---

## Authentication & Authorization

<!-- NextAuth.js (Auth.js v5) configuration and session handling. -->

- **Auth config**: `src/auth.ts` (main Auth.js config) + `src/auth.config.ts` (edge-compatible config)
- **Session strategy**: <!-- e.g., JWT / database sessions -->
- **Providers**: <!-- e.g., GitHub, Google, Credentials -->
- **Route protection**:
  - Middleware: `src/middleware.ts` — matcher patterns for protected routes
  - Server Components: `const session = await auth()` from `src/auth.ts`
  - Server Actions: `const session = await auth()` — validate before mutations
  - API Route Handlers: `const session = await auth()` — validate before processing
- **Role / scope requirements**: <!-- e.g., Admin-only, user-scoped via session.user.id -->

---

## Architectural Decisions

<!-- Explicit decisions that prevent misinterpretation. -->

- **Rendering strategy**: <!-- e.g., RSC by default, `"use client"` only for interactive components -->
- **Data fetching**: <!-- e.g., Server Components fetch directly; client uses Server Actions or Route Handlers -->
- **Source of truth**: <!-- e.g., Database via ORM — NOT client-side state -->
- **State management**: <!-- e.g., React `useState`/`useOptimistic` for local UI; no global store needed -->
- **Form handling**: <!-- e.g., `react-hook-form` + `zod` validation + Server Actions via `useActionState` -->
- **Error handling**: <!-- e.g., `error.tsx` boundaries per route segment, toast notifications for mutations -->
- **Caching**: <!-- e.g., `revalidatePath()` / `revalidateTag()` after mutations; `unstable_cache` for expensive queries -->

---

## Documentation

<!-- Links to relevant docs. -->

- [Next.js App Router](https://nextjs.org/docs/app)
- [Auth.js v5 (NextAuth)](https://authjs.dev/getting-started)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview) / [Prisma](https://www.prisma.io/docs)

---

## Development Setup

### Dependencies

| Service | Address | Notes |
|---------|---------|-------|
| PostgreSQL | `localhost:5432` | Docker container or local install |
| Redis | `localhost:6379` | _Optional — only if using rate limiting / caching_ |

### Environment Variables

```bash
# .env.local
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
AUTH_SECRET="generated-via-npx-auth-secret"
AUTH_URL="http://localhost:3000"
# Provider secrets
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""
```

### Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run db:generate  # Generate ORM migrations
npm run db:migrate   # Apply migrations
npm run db:studio    # Open database GUI
npm run lint         # ESLint
npm run test         # Run tests
npx shadcn@latest add <component>  # Add shadcn/ui component
```

### Wiki

> **⚠️ IMPORTANT:** Wiki lives in a **separate repo**. Changes to `@wiki` must be committed directly to the wiki repo, **not** the main project repo.

---

## Project Structure Reference

```
src/
├── app/
│   ├── (auth)/           # Auth route group (login, register)
│   ├── (protected)/      # Authenticated route group
│   │   ├── layout.tsx    # Session-guarded layout
│   │   └── dashboard/
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts  # Auth.js catch-all
│   ├── layout.tsx        # Root layout (providers, fonts)
│   ├── page.tsx          # Landing page
│   └── error.tsx         # Global error boundary
├── actions/              # Server Actions
├── auth.ts               # Auth.js main config
├── auth.config.ts        # Edge-compatible auth config
├── components/
│   ├── ui/               # shadcn/ui primitives (DO NOT edit directly)
│   └── ...               # App-specific components
├── hooks/                # Custom React hooks
├── lib/
│   ├── db.ts             # Database client instance
│   ├── utils.ts          # cn() helper + shared utilities
│   └── validators.ts     # Zod schemas
├── middleware.ts          # NextAuth middleware + route matchers
└── types/                # TypeScript type definitions
```

---

## Design Principles

- Simplicity is beauty, complexity is pain.
- _ALWAYS_ look at the current codebase first — achieve the goal in the **least amount of changes**.
- TDD-first: write tests before implementation.
- Server Components by default; `"use client"` only when interactivity requires it.
- Colocate related files: keep components, actions, and types near the routes that use them.
- Use shadcn/ui primitives — don't reinvent existing components.
- Validate all inputs with Zod on the server, regardless of client-side validation.

---

## Validation Tools

<!-- Explicit tool callouts for E2E or integration validation. -->

- [ ] Load `agent-browser` skill with screenshots to validate E2E. This validates test assumptions for completion promise.
- [ ] Verify auth flow: sign-in → protected route → sign-out → redirect
- [ ] Verify middleware blocks unauthenticated access to protected routes

---

## Acceptance Criteria

<!-- Every criterion must be binary — testable by an agent with a pass/fail outcome. -->

- [ ] Implementation plan is thoroughly documented
- [ ] All previous & new tests pass, validated using `agent-browser` CLI
- [ ] Auth: protected routes return 401/redirect when unauthenticated
- [ ] Auth: session is available in Server Components and Server Actions
- [ ] New code follows existing project patterns (file structure, naming, ORM usage)
- [ ] shadcn/ui components used where applicable — no custom components duplicating existing primitives
- [ ] Server Actions validate input with Zod schemas
- [ ] No `"use client"` on components that don't require client-side interactivity
- [ ] No new dependencies added beyond what's already in the project (or justified in PR description)
- [ ] Related API and user documentation updated in the **wiki repo** (committed directly to wiki repo)
- [ ] <!-- Add feature-specific criteria -->