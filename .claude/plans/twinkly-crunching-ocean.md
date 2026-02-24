# Fix Netlify Build: Rename directory back to `gitstat`

## Context

The app directory was previously renamed from `gitstat/` to `gitstat-app/`, which broke the Netlify build (`netlify.toml` expects `base = "gitstat"`). Instead of updating Netlify config, the user wants to rename the directory back to `gitstat` and revert all `gitstat-app` references.

## Changes

### 1. Rename directory
```
mv gitstat-app/ gitstat/
```

### 2. Update `Makefile` (6 occurrences on lines 15, 18, 21, 24, 27, 30)
Replace all `cd gitstat-app &&` back to `cd gitstat &&`

### 3. Update `.githooks/pre-commit` (line 4)
```
APP_DIR="gitstat-app"  →  APP_DIR="gitstat"
```

### 4. Update `.github/workflows/ci.yml` (lines 12, 21)
```
working-directory: gitstat-app         →  working-directory: gitstat
cache-dependency-path: gitstat-app/... →  cache-dependency-path: gitstat/...
```

### 5. Update `gitstat/src/lib/auth.ts` (line 9)
```
"See gitstat-app/.example.env ..."  →  "See gitstat/.example.env ..."
```

### 6. No changes needed
- `netlify.toml` — already has `base = "gitstat"` (correct)

## Verification

1. Run `make lint` and `make test` to confirm Makefile targets work
2. Run `bash .githooks/pre-commit` to confirm hook works
3. Push and confirm Netlify build succeeds
