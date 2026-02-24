# Plan: Create Dev Auth Bypass Design Spec

## Context

AI dev agents running `npm run dev:agent` cannot authenticate — GitStat requires GitHub OAuth, which needs a browser. We need a programmatic dev-only bypass. This plan creates `specs/dev-auth-bypass.md` with a proven, justified approach.

## Deliverable

Write `specs/dev-auth-bypass.md` with the full content below.

---

# specs/dev-auth-bypass.md — Content

## Dev Authentication Bypass — Design Specification

### Problem

GitStat requires GitHub OAuth for authentication. This blocks AI dev agents and headless development workflows that cannot complete browser-based OAuth. Agents running via `npm run dev:agent` (port 3080) need a way to authenticate programmatically with zero browser interaction.

### Requirements

- Dev-only auth bypass using basic credentials `admin:test1234`
- Must provide a valid GitHub access token to session so API calls work
- Must be completely absent from production builds
- Must integrate with existing NextAuth session system (no parallel auth)
- Documented for `npm run dev:agent` workflow

---

### Approach Comparison

We evaluated 5 approaches. **CredentialsProvider wins** on simplicity, safety, and integration.

| Approach | Files Changed | New Files | Session Compatible | Can Test Unauth | Prod Safe |
|----------|:---:|:---:|:---:|:---:|:---:|
| **A. CredentialsProvider** | **2** | **0** | **Yes** | **Yes** | **Yes** |
| B. Mock getServerSession() | 1 | 0 | Partial | No | Risky |
| C. Middleware + Basic Auth | 1 | 1 | No | Yes | Yes |
| D. Custom /api/dev-auth | 0 | 1 | No | Yes | Yes |
| E. SKIP_AUTH env flag | 1 | 0 | No | No | Risky |

#### A. NextAuth CredentialsProvider (Selected)

Add a `CredentialsProvider` to the existing NextAuth `providers` array, guarded by `NODE_ENV !== "production"`.

**Why simplest:**
- **0 new files** — modifies only `auth.ts` (auth logic) and `login/page.tsx` (UI)
- **0 new patterns** — CredentialsProvider is a first-class NextAuth feature, not a workaround
- **Full session compatibility** — sign-in produces a real NextAuth session with JWT. Dashboard layout (`getServerSession()`), server actions (`session.accessToken`), and client-side `useSession()` all work unchanged with zero modifications
- **Testable** — can still visit `/login` without signing in to test the unauthenticated state

**Auth flow through existing code (unchanged):**
```
CredentialsProvider.authorize()
  → returns { id, name, email, accessToken: env.GITHUB_TOKEN }
    → jwt callback stores token.accessToken
      → session callback exposes session.accessToken
        → server actions use session.accessToken for GitHub API calls
          → github.ts fetches repos/commits with bearer token
```

Every downstream consumer — `dashboard/layout.tsx`, `actions/repositories.ts`, `actions/commits.ts`, `lib/github.ts` — works without any changes.

#### B. Mock getServerSession() — Rejected

Modify `getServerSession()` to return a fake session when `NODE_ENV=development`.

**Why rejected:**
- Always authenticated in dev — cannot test login page or unauthenticated redirects
- Couples environment detection into the session function (violates single responsibility)
- `if (isDev) return mockSession` is a code smell that's easy to accidentally leave in

#### C. Next.js Middleware + Basic Auth Header — Rejected

Create `middleware.ts` that checks `Authorization: Basic ...` header and injects session.

**Why rejected:**
- Middleware cannot create NextAuth sessions — it runs at the edge and doesn't have access to NextAuth's JWT signing
- Would need to manually set session cookies, duplicating NextAuth internals
- Fragile — breaks on any NextAuth cookie format change
- Creates a new file and a parallel auth path

#### D. Custom /api/dev-auth Endpoint — Rejected

Create a new API route that validates basic auth and issues a session cookie.

**Why rejected:**
- Must manually replicate NextAuth's JWT creation and cookie setting
- Parallel auth system that doesn't go through NextAuth providers
- More code, more surface area, more maintenance burden

#### E. SKIP_AUTH=true Flag — Rejected

Skip all auth checks when an env flag is set.

**Why rejected:**
- Cannot test any auth-related flows in dev
- One missing env check in a new route = production bypass vulnerability
- Doesn't provide a session object, so server actions that read `session.accessToken` fail or need per-action mock logic

---

### Implementation Detail

#### 1. `gitstat/src/lib/auth.ts` — Add CredentialsProvider

Current file is 33 lines. Changes add ~25 lines.

```typescript
import CredentialsProvider from "next-auth/providers/credentials";

// Build providers dynamically
const providers: NextAuthOptions["providers"] = [
  GitHubProvider({ ... }),  // existing, unchanged
];

// DEV ONLY: credentials bypass for agent workflows
if (process.env.NODE_ENV !== "production") {
  providers.push(
    CredentialsProvider({
      id: "dev-credentials",
      name: "Dev Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === "admin" &&
          credentials?.password === "test1234"
        ) {
          return {
            id: "dev-agent",
            name: "Dev Agent",
            email: "dev@localhost",
            accessToken: process.env.GITHUB_TOKEN ?? "",
          };
        }
        return null;
      },
    })
  );
}
```

JWT callback change (extend existing, don't replace):

```typescript
async jwt({ token, account, user }) {
  // OAuth flow (existing)
  if (account) {
    token.accessToken = account.access_token;
  }
  // Credentials flow (new) — accessToken comes from authorize() return
  if (user && "accessToken" in user) {
    token.accessToken = (user as { accessToken: string }).accessToken;
  }
  return token;
},
```

#### 2. `gitstat/src/app/login/page.tsx` — Add dev login button

Add below the GitHub sign-in button, conditionally rendered:

```typescript
const isDev = process.env.NODE_ENV === "development";
// isDev is replaced with `false` at build time by Next.js → dead-code eliminated in prod
```

Dev login calls `signIn("dev-credentials", { username: "admin", password: "test1234", ... })`.

#### 3. `gitstat/.env.example` — Document GITHUB_TOKEN

```env
# --- DEV ONLY ---
# GitHub Personal Access Token for dev/agent auth bypass
# Only used with dev-credentials provider (NODE_ENV=development)
# Generate at: https://github.com/settings/tokens (classic, repo scope)
# GITHUB_TOKEN=ghp_your_personal_access_token
```

#### 4. `CLAUDE.md` — Agent auth documentation

Add section documenting:
- The endpoint: `POST /api/auth/callback/dev-credentials`
- Credentials: `admin` / `test1234`
- Required: `GITHUB_TOKEN` in `~/.env/gitstat/.env`
- Programmatic curl login:

```bash
CSRF=$(curl -s http://localhost:3080/api/auth/csrf | jq -r '.csrfToken')
curl -X POST http://localhost:3080/api/auth/callback/dev-credentials \
  -d "username=admin&password=test1234&csrfToken=$CSRF" \
  -c cookies.txt -L
```

---

### Production Safety — 4 Layers

| # | Layer | Mechanism | What fails if bypassed |
|---|-------|-----------|----------------------|
| 1 | Server runtime | `if (NODE_ENV !== "production")` guards provider registration | No `/api/auth/callback/dev-credentials` endpoint exists |
| 2 | Client bundle | `isDev` const dead-code-eliminated by Next.js bundler | No "Dev Login" button in UI |
| 3 | Secrets | `GITHUB_TOKEN` read from env, never committed | No token = empty `accessToken` = API calls fail |
| 4 | CSRF | NextAuth built-in CSRF on credentials endpoint | Can't POST without valid CSRF token |

---

### Files Modified

| File | Action | Lines Changed |
|------|--------|:---:|
| `specs/dev-auth-bypass.md` | Create | ~150 |
| `gitstat/src/lib/auth.ts` | Modify | ~25 added |
| `gitstat/src/app/login/page.tsx` | Modify | ~25 added |
| `gitstat/.env.example` | Modify | ~5 added |
| `CLAUDE.md` | Modify | ~15 added |

### Verification

1. `npm run dev:agent` with `GITHUB_TOKEN` in `~/.env/gitstat/.env`
2. Login page shows "Dev Login" button
3. Click "Dev Login" → redirects to `/dashboard` → repos load (proves token flows)
4. Programmatic curl login works from terminal
5. `npm run build` → no credentials provider in bundle
6. Production: `POST /api/auth/callback/dev-credentials` → 404
