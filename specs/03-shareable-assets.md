# Spec 03: Shareable Asset Generation

## Goal
Generate downloadable, platform-optimized graphics from dashboard metrics for sharing on LinkedIn and X.

## Current State
- `ExportButton` exists (likely basic chart export)
- `ShareButton` exists (generates share links via `/api/share`)
- Share page at `/share/[id]/page.tsx`

## Requirements

### Template System
Templates define visual layouts for exported graphics:

1. **Stats Card** — Clean card with key metrics, user avatar, date range
2. **Infographic** — Vertical layout with multiple charts and metrics
3. **Chart Snapshot** — Single chart with branding overlay

### Platform Sizing
| Platform | Size | Aspect Ratio |
|----------|------|-------------|
| LinkedIn | 1200×627 | ~1.91:1 |
| X (Twitter) | 1600×900 | ~1.78:1 |

### Generation Approach
- **Option A**: `@vercel/og` (Satori) — React components → SVG → PNG (server-side)
- **Option B**: html2canvas on client — capture DOM as image
- **Recommended**: Option A for quality and consistency

### New Components
- `src/components/share-preview.tsx` — Modal showing preview before download
- `src/components/template-selector.tsx` — Choose template + platform
- Update `ExportButton` to use template system

### Share Preview Modal
1. User clicks "Share" / "Export"
2. Modal opens with:
   - Template selector (card/infographic/chart)
   - Platform selector (LinkedIn/X/Custom)
   - Metric selector (which stats to include)
   - Date range display
   - Live preview of the graphic
3. Actions: Download PNG, Download SVG, Copy to Clipboard

### Branding & Verification
- User avatar + name (from GitHub profile)
- GitStat watermark (small, corner)
- Optional: repo names, date range text
- Link back to shareable URL for verification

### Copy to Clipboard
- Use `navigator.clipboard.write()` with `ClipboardItem` for image data
- Fallback: download button if clipboard API unavailable

### Shareable Links
- Extend existing `/api/share` to store metric snapshot
- `/share/[id]` renders interactive read-only dashboard view
- Consider signed URLs or short-lived tokens for privacy

## Acceptance Criteria
- [ ] At least 2 templates available (card + chart snapshot)
- [ ] LinkedIn and X sizes render correctly
- [ ] Preview modal shows accurate representation
- [ ] PNG download works
- [ ] Copy to clipboard works (with fallback)
- [ ] Verification watermark/link present on all exports
- [ ] Shareable link generates and loads correctly
- [ ] Typecheck passes
