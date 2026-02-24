# Spec 04: Privacy Controls & Onboarding

## Goal
Add repository/metric privacy controls for sharing and improve new user onboarding.

## Requirements

### Privacy Controls
- Per-repo toggle: "eligible for sharing" (default: public repos yes, private repos no)
- Per-metric toggle: include/exclude from exports
- Settings stored in localStorage (MVP) or user preferences API
- Share preview respects privacy settings — excluded repos/metrics never appear in exports

### Onboarding
- **Demo dashboard**: Show sample data for unauthenticated users at `/dashboard?demo=true`
- **Repo selection**: After first GitHub auth, prompt user to select which repos to track
- **Guided tour**: Tooltip-based walkthrough of dashboard features (stretch goal)

### Demo Data
- Hardcoded realistic sample data in `src/lib/demo-data.ts`
- Covers all metric types (commits, PRs, reviews, issues, lines changed)
- 90 days of synthetic activity

## Acceptance Criteria
- [ ] Privacy toggles appear in dashboard settings
- [ ] Excluded repos/metrics don't appear in exports
- [ ] Demo dashboard loads without authentication
- [ ] Repo selection prompt appears on first login
- [ ] Typecheck passes
