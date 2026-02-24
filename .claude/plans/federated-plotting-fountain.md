# Fix: Dev Agent Login Redirects to Port 3000 Instead of Actual Port

## Context

When running `npm run dev:agent` (which starts Next.js on port **3080**), clicking the "Dev Agent Login" button redirects the user to `http://localhost:3000/dashboard` instead of `http://localhost:3080/dashboard`.

**Root cause:** NextAuth v4 uses `NEXTAUTH_URL` to construct redirect URLs. The `.example.env` hardcodes `NEXTAUTH_URL=http://localhost:3000`. When a user copies this to `.env.local` and runs on port 3080 via `dev:agent`, NextAuth still redirects to port 3000.

## Fix

### 1. Update `dev:agent` script to override `NEXTAUTH_URL`

**File:** `gitstat-app/package.json` (line 7)

```diff
- "dev:agent": "next dev -p 3080",
+ "dev:agent": "NEXTAUTH_URL=http://localhost:3080 next dev -p 3080",
```

This ensures that when running the agent dev server, NextAuth knows the correct base URL.

### 2. Update `.example.env` with a comment about port alignment

**File:** `gitstat-app/.example.env` (line 10)

```diff
- NEXTAUTH_URL=http://localhost:3000
+ # Must match the port your dev server runs on (3000 for `npm run dev`, 3080 for `npm run dev:agent`)
+ NEXTAUTH_URL=http://localhost:3000
```

### 3. Update README references

**File:** `README.md` — update the setup instructions to note the port/NEXTAUTH_URL relationship, specifically around lines 53-54 and 75 where `localhost:3000` is hardcoded in OAuth callback URL and NEXTAUTH_URL examples.

## Verification

1. Run `npm run dev:agent` from `gitstat-app/`
2. Open `http://localhost:3080/login`
3. Click "Dev Agent Login"
4. Confirm redirect lands on `http://localhost:3080/dashboard` (not port 3000)
