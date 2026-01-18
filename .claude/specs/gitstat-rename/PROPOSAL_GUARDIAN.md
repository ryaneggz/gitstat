# PROPOSAL: Renaming Commitline to GitStat

**Agent:** GUARDIAN (Security, Error Handling, Edge Cases, Testing)
**Date:** 2026-01-18
**Status:** DRAFT

---

## 1. Executive Summary

This rename operation requires careful coordination between application branding changes and external service configurations (GitHub OAuth, Netlify deployment). The security-critical path centers on OAuth callback URL synchronization - if the GitHub OAuth App callback URL is updated before the application is deployed, or vice versa, authentication will completely break. I recommend a staged rollout with explicit verification gates, maintaining the ability to rollback at each stage, and prioritizing backwards compatibility for existing share links.

---

## 2. Architectural Analysis

### 2.1 Security-Sensitive Files and Configurations

| File | Security Concern | Risk Level |
|------|------------------|------------|
| `/git-commit-tracker/src/lib/auth.ts` | OAuth provider configuration. No hardcoded app names, but `authOptions` references environment variables that must remain stable. | LOW |
| `/git-commit-tracker/src/app/api/auth/[...nextauth]/route.ts` | NextAuth route handler. Path-based routing means this continues to work regardless of branding. | NONE |
| `/git-commit-tracker/src/app/api/share/route.ts` | Share link generation uses base64 encoding of data, not app-name-based IDs. | NONE |
| `.env.local` / `.env.example` | Contains `GITHUB_ID`, `GITHUB_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. These must NOT change during rename. | CRITICAL |
| `netlify.toml` | Contains `base = "git-commit-tracker"` which references directory structure, not branding. | MEDIUM |

### 2.2 External Service Dependencies

#### GitHub OAuth App
- **Location:** https://github.com/settings/developers
- **Current callback URL (assumed):** `https://[current-domain]/api/auth/callback/github`
- **Impact:** If domain changes (e.g., from `commitline.netlify.app` to `gitstat.ruska.ai`), the OAuth callback URL MUST be updated BEFORE users attempt to authenticate on the new domain.
- **Critical Window:** Between deploying to new domain and updating OAuth callback URL, authentication is completely broken.

#### Netlify Deployment
- **Configuration:** `netlify.toml` specifies `base = "git-commit-tracker"`
- **Impact:** If directory is renamed to `gitstat`, Netlify config must be updated simultaneously or deployment fails.
- **Domain Consideration:** If using a custom domain (gitstat.app vs commitline.app), DNS and SSL considerations apply.

#### Existing Share Links
- **Mechanism:** Share links encode data as base64 in the URL path: `/share/[base64-encoded-data]`
- **Data Format:** `{ repos: string[], username: string, commits: Commit[], dateFrom?: string, dateTo?: string }`
- **Impact:** Existing share links contain NO branding references - they will continue to work on any domain that hosts this application.
- **Backwards Compatibility:** FULL - share links are domain-agnostic and data-agnostic to branding.

### 2.3 User-Facing Implications

| User Action | Current Behavior | After Rename | Risk |
|-------------|------------------|--------------|------|
| Existing share links | Work on current domain | Will break if domain changes | HIGH if domain changes |
| Exported PNG files | Named `commitline-chart.png` | Named `gitstat-chart.png` | NONE (cosmetic) |
| OAuth re-authentication | Works | May break during transition window | HIGH |
| Bookmarks to dashboard | Work | Break if domain changes | MEDIUM |

---

## 3. Implementation Strategy

### Phase 1: Pre-Rename Preparation (No Downtime Risk)

**Step 1.1: Audit Current Production State**
```bash
# Document current environment
echo "NEXTAUTH_URL=$NEXTAUTH_URL"
echo "GitHub OAuth App callback URL: [check manually]"
```

**Verification Gate:**
- [ ] Current NEXTAUTH_URL documented
- [ ] Current GitHub OAuth callback URL documented
- [ ] Current Netlify site URL documented

**Step 1.2: Create Backup of Current Configuration**
```bash
# Export current .env.local (excluding secrets)
cat .env.local | sed 's/=.*/=[REDACTED]/' > .env.backup.template
```

**Step 1.3: Update GitHub OAuth App (if domain changes)**
- Add NEW callback URL as ADDITIONAL callback URL (GitHub supports multiple)
- Keep OLD callback URL active
- This allows BOTH domains to work simultaneously during transition

### Phase 2: Code Changes (Low Risk - Cosmetic Only)

**Step 2.1: Update User-Facing Branding**

Priority order (safest first):
1. **Metadata** - `/git-commit-tracker/src/app/layout.tsx`
   - Change `title: "Commitline"` to `title: "GitStat"`
2. **Login Page** - `/git-commit-tracker/src/app/login/page.tsx`
   - Change `"Welcome to Commitline"` to `"Welcome to GitStat"`
3. **Dashboard Header** - `/git-commit-tracker/src/app/dashboard/layout.tsx`
   - Change `<h1>Commitline</h1>` to `<h1>GitStat</h1>`
4. **Share Page Header** - `/git-commit-tracker/src/app/share/[id]/page.tsx`
   - Change `"Commitline"` link text to `"GitStat"`
5. **Export Filename** - `/git-commit-tracker/src/components/export-button.tsx`
   - Change `filename = "commitline-chart"` to `filename = "gitstat-chart"`
6. **Dashboard Export Call** - `/git-commit-tracker/src/app/dashboard/page.tsx`
   - Change `filename="commitline-chart"` to `filename="gitstat-chart"`

**Verification Gate:**
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] Visual inspection of login page
- [ ] Visual inspection of dashboard header
- [ ] PNG export has correct filename

**Step 2.2: Update Package Metadata (Low Risk)**

1. **package.json** - Change `"name": "git-commit-tracker"` to `"name": "gitstat"`

**Note:** Package name is internal only - no external systems depend on this value.

**Step 2.3: Update Documentation**

1. **README.md** - Replace all instances of "Commitline" with "GitStat"
2. **SPEC.md** - Replace all instances of "Commitline" with "GitStat"
3. **AGENTS.md** - Replace "Commitline" with "GitStat"
4. **tasks/prd-commitline.md** - Rename to `tasks/prd-gitstat.md` and update content
5. **Various spec files** - Update as needed

### Phase 3: Directory Rename (Medium Risk)

**IMPORTANT:** This phase affects Netlify deployment and must be coordinated.

**Step 3.1: Rename Application Directory**
```bash
mv git-commit-tracker gitstat
```

**Step 3.2: Update netlify.toml**
```toml
[build]
  base = "gitstat"
  command = "npm run build"
  publish = ".next"
```

**Step 3.3: Update README.md directory references**
- Change all `git-commit-tracker` references to `gitstat`
- Update installation instructions
- Update project structure diagram

**Verification Gate:**
- [ ] `cd gitstat && npm run build` succeeds
- [ ] `netlify deploy --prod` succeeds (or equivalent CI/CD)

### Phase 4: External Service Updates (High Risk)

**Step 4.1: Update Netlify Environment Variables (if domain changes)**
- Update `NEXTAUTH_URL` to new domain

**Step 4.2: Update GitHub OAuth App (if domain changes)**
- Remove OLD callback URL
- Keep only NEW callback URL

**Step 4.3: Update DNS (if using custom domain)**
- Point new domain to Netlify
- Ensure SSL certificate is provisioned

---

## 4. Design Decisions

### 4.1 What NOT to Change

| Item | Reason |
|------|--------|
| `GITHUB_ID` | OAuth credentials are reusable across app names |
| `GITHUB_SECRET` | Must remain unchanged for OAuth to function |
| `NEXTAUTH_SECRET` | Session encryption key - changing invalidates all sessions |
| Share link encoding scheme | Existing links must continue to work |
| API route paths (`/api/auth/*`, `/api/share/*`) | URL structure is functional, not branding-related |
| OAuth provider configuration in `auth.ts` | Provider names (github) are standardized |

### 4.2 Backwards Compatibility Considerations

**Existing Share Links:**
- Share links encode data directly in the URL, not in a database
- They contain NO references to "Commitline" or "git-commit-tracker"
- They WILL continue to work on any domain hosting this application
- If domain changes: Consider setting up a redirect from old domain to new domain for 6+ months

**Existing OAuth Sessions:**
- Sessions are encrypted with `NEXTAUTH_SECRET`
- As long as secret remains unchanged, sessions remain valid
- Users may need to re-authenticate if domain changes (cookie domain mismatch)

**Existing Exported PNGs:**
- Already saved files remain named `commitline-chart.png`
- No remediation possible or needed
- New exports will use `gitstat-chart.png`

### 4.3 Migration Strategy for Existing Users

| User Scenario | Migration Path |
|---------------|----------------|
| Returning user with existing session | Session valid if secret unchanged and domain unchanged |
| Returning user after domain change | Must re-authenticate via GitHub OAuth |
| User with bookmarked share link (domain unchanged) | No action needed |
| User with bookmarked share link (domain change) | Link breaks; no automatic remediation |
| User with exported PNG | No impact |

---

## 5. Risk Assessment

### 5.1 Security Risks During Transition

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OAuth callback mismatch | HIGH if not coordinated | CRITICAL - All auth fails | Update GitHub OAuth App BEFORE domain cutover |
| Session invalidation | LOW if secret unchanged | MEDIUM - Users must re-login | Do not change NEXTAUTH_SECRET |
| Credential exposure in commit | LOW | CRITICAL | Never commit .env.local; use gitignore |
| Rate limit during migration testing | MEDIUM | LOW - Temporary | Use separate test account for OAuth testing |

### 5.2 Breaking Changes for Existing Users

| Change Type | User Impact | Affected Users | Severity |
|-------------|-------------|----------------|----------|
| Branding change | Visual only | All | NONE |
| Export filename change | Different filename on download | Users who export | LOW |
| Domain change (if any) | Bookmarks break, re-auth needed | All | HIGH |
| Share link breakage (domain change) | Old links become invalid | Users who shared links | HIGH |

### 5.3 OAuth Reconfiguration Requirements

**If Domain Remains Unchanged:**
- No OAuth changes required
- Callback URL remains: `https://[same-domain]/api/auth/callback/github`

**If Domain Changes (e.g., to gitstat.app):**
1. **Before deployment:** Add new callback URL to GitHub OAuth App
2. **During deployment:** Both old and new callback URLs active
3. **After verification:** Remove old callback URL
4. **Timeline:** Recommend keeping both URLs active for 30 days minimum

### 5.4 Production Deployment Risks

| Risk | Trigger | Impact | Rollback Time |
|------|---------|--------|---------------|
| Build failure | netlify.toml misconfiguration | Deployment blocked | 5 minutes |
| Runtime error | Missing environment variable | App crashes | 15 minutes |
| Auth failure | OAuth callback mismatch | Users cannot login | 30+ minutes (depends on GitHub propagation) |
| Complete outage | DNS misconfiguration (domain change) | Site unreachable | 1-24 hours (DNS propagation) |

---

## 6. Testing and Verification

### 6.1 Pre-Rename Verification Steps

```bash
# 1. Verify current build passes
cd git-commit-tracker && npm run build && npm run lint

# 2. Verify OAuth works (manual test)
# - Open browser to current production URL
# - Click "Sign in with GitHub"
# - Confirm successful authentication

# 3. Document current state
git status
git log -1 --oneline
```

**Checklist:**
- [ ] Build passes without errors
- [ ] Lint passes without warnings
- [ ] TypeScript compilation succeeds (`npx tsc --noEmit`)
- [ ] OAuth authentication works in production
- [ ] Share link generation works
- [ ] PNG export works

### 6.2 Post-Rename Testing Checklist

**Automated Tests:**
```bash
cd gitstat && npm run build && npm run lint && npx tsc --noEmit
```

**Manual Tests (Development):**
- [ ] Landing page displays "GitStat" or new branding
- [ ] Login page shows "Welcome to GitStat"
- [ ] Dashboard header shows "GitStat"
- [ ] OAuth flow completes successfully
- [ ] Repository list loads
- [ ] Commit data fetches correctly
- [ ] Timeline chart renders
- [ ] Velocity metrics display
- [ ] PNG export downloads with `gitstat-chart.png` filename
- [ ] Share link generates successfully
- [ ] Share page displays correctly
- [ ] Share page header shows "GitStat"

**Manual Tests (Production - Post Deployment):**
- [ ] OAuth authentication works on production domain
- [ ] Existing share links work (if domain unchanged)
- [ ] New share links work
- [ ] PNG export works
- [ ] No console errors in browser

### 6.3 Rollback Plan

**Scenario 1: Code Changes Cause Build Failure**
```bash
git reset --hard HEAD~1  # Revert last commit
# Or restore from specific commit
git checkout [last-known-good-commit]
```

**Scenario 2: OAuth Broken After Domain Change**
1. Immediately add old callback URL back to GitHub OAuth App
2. Update `NEXTAUTH_URL` back to old domain
3. Redeploy to old domain
4. Investigate root cause before retrying

**Scenario 3: Production Outage**
1. Access Netlify dashboard
2. Select "Rollbacks" or "Deploys"
3. Deploy previous successful build
4. Verify site is accessible
5. Do NOT update GitHub OAuth App until investigation complete

**Rollback Timeline Estimates:**
| Scenario | Detection Time | Rollback Time | Total Recovery |
|----------|----------------|---------------|----------------|
| Build failure | Immediate | 5 minutes | 5 minutes |
| Runtime crash | 1-5 minutes | 10 minutes | 15 minutes |
| OAuth failure | 5-30 minutes | 30 minutes (GitHub propagation) | 60 minutes |
| DNS failure | 5-60 minutes | 1-24 hours | 1-24 hours |

---

## 7. Estimated Complexity

### 7.1 Scope Assessment

| Component | Effort | Files Changed |
|-----------|--------|---------------|
| User-facing branding | Low | 5 files |
| Documentation updates | Low | 5+ files |
| Package metadata | Trivial | 1 file |
| Directory rename | Medium | 2 files (netlify.toml, README.md paths) |
| External service config | Medium-High | GitHub OAuth App, Netlify env vars |

**Overall Scope:** MEDIUM

### 7.2 Risk Level Assessment

| Factor | Assessment |
|--------|------------|
| Code complexity | LOW - Mostly string replacements |
| External dependencies | MEDIUM - OAuth and deployment platform |
| Data migration | NONE - Share links are self-contained |
| Rollback complexity | LOW - Git revert or Netlify rollback |
| User impact | LOW if domain unchanged, HIGH if domain changes |

**Overall Risk Level:** MEDIUM (LOW if domain unchanged)

### 7.3 Suggested Priority Order

**Priority 1 (Safe, No External Dependencies):**
1. Update package.json name
2. Update user-facing branding in UI components
3. Update export filename default
4. Update README.md and documentation (branding only)

**Priority 2 (Requires Coordination):**
5. Rename directory from `git-commit-tracker` to `gitstat`
6. Update netlify.toml base directory
7. Update README.md directory references

**Priority 3 (External Service Changes - Do Last):**
8. Update GitHub OAuth App callback URL (if domain changes)
9. Update Netlify environment variables (if domain changes)
10. Update DNS records (if using new custom domain)

---

## 8. Security Hardening Recommendations

### 8.1 During Transition

- **Never commit secrets:** Ensure `.env.local` remains in `.gitignore`
- **Audit access:** Verify who has access to GitHub OAuth App settings
- **Document current state:** Screenshot current OAuth App configuration before changes
- **Use staging first:** If possible, test rename on a staging environment with separate OAuth App

### 8.2 Post-Transition

- **Rotate NEXTAUTH_SECRET:** Consider rotating after successful migration (invalidates all sessions)
- **Audit OAuth scopes:** Current scope is `read:user repo` - verify this is still appropriate
- **Review callback URLs:** Remove any orphaned callback URLs from GitHub OAuth App
- **Enable GitHub OAuth App audit logging:** If available, enable logging to track authentication events

### 8.3 Monitoring Recommendations

- **Set up alerting** for 4xx/5xx errors on `/api/auth/*` endpoints
- **Monitor OAuth callback success rate** for first 24 hours post-migration
- **Track error rates** on share link page for first week

---

## Appendix A: Complete File Change List

### Files Requiring Branding Updates

| File Path | Change Type | Current Value | New Value |
|-----------|-------------|---------------|-----------|
| `git-commit-tracker/src/app/layout.tsx:18` | String | `"Commitline"` | `"GitStat"` |
| `git-commit-tracker/src/app/login/page.tsx:39` | String | `"Welcome to Commitline"` | `"Welcome to GitStat"` |
| `git-commit-tracker/src/app/dashboard/layout.tsx:20` | String | `"Commitline"` | `"GitStat"` |
| `git-commit-tracker/src/app/share/[id]/page.tsx:111` | String | `"Commitline"` | `"GitStat"` |
| `git-commit-tracker/src/components/export-button.tsx:20` | String | `"commitline-chart"` | `"gitstat-chart"` |
| `git-commit-tracker/src/app/dashboard/page.tsx:154` | String | `"commitline-chart"` | `"gitstat-chart"` |
| `git-commit-tracker/package.json:2` | String | `"git-commit-tracker"` | `"gitstat"` |

### Files Requiring Directory Path Updates

| File Path | Change Type | Current Value | New Value |
|-----------|-------------|---------------|-----------|
| `netlify.toml:2` | String | `"git-commit-tracker"` | `"gitstat"` |
| `README.md` (multiple lines) | String | `git-commit-tracker` | `gitstat` |

### Documentation Files Requiring Updates

| File Path | Changes |
|-----------|---------|
| `README.md` | Replace "Commitline" with "GitStat", update directory paths |
| `SPEC.md` | Replace "Commitline" with "GitStat" |
| `AGENTS.md` | Replace "Commitline" with "GitStat" |
| `tasks/prd-commitline.md` | Rename to `prd-gitstat.md`, update content |

---

## Appendix B: Environment Variable Reference

| Variable | Purpose | Change Required |
|----------|---------|-----------------|
| `GITHUB_ID` | GitHub OAuth Client ID | NO |
| `GITHUB_SECRET` | GitHub OAuth Client Secret | NO |
| `NEXTAUTH_SECRET` | Session encryption key | NO (changing invalidates sessions) |
| `NEXTAUTH_URL` | Application base URL | ONLY if domain changes |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | NO (unless creating new GA property) |

---

## Appendix C: Verification Commands

```bash
# Pre-rename build verification
cd git-commit-tracker && npm run build && npm run lint && npx tsc --noEmit

# Post-rename build verification
cd gitstat && npm run build && npm run lint && npx tsc --noEmit

# Search for remaining "commitline" references (case-insensitive)
grep -ri "commitline" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" --include="*.toml" .

# Search for remaining "git-commit-tracker" references
grep -ri "git-commit-tracker" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" --include="*.toml" .

# Verify OAuth callback (manual in browser)
# Open: [production-url]/api/auth/callback/github
# Should show NextAuth error page (no code parameter) - confirms route exists
```

---

*End of GUARDIAN Proposal*
