# Spec 02: Dashboard Redesign

## Goal
Redesign `src/app/dashboard/page.tsx` with metric cards, trend charts, period comparison, and customizable layout.

## Current State
- Single page with repo selector, date picker, timeline chart, velocity metrics
- All client-side state management
- Commits-only data

## Requirements

### Metric Cards (new component: `src/components/metric-card.tsx`)
Each card shows:
- Metric name + current value
- Trend indicator (↑/↓/→) vs previous period
- Sparkline mini-chart (last 30 days)

**Default metrics:**
1. Total Commits
2. PRs Opened
3. PRs Merged
4. Lines Changed (additions + deletions)
5. Review Turnaround (avg hours)
6. Issue Close Rate (%)
7. Coding Velocity (commits/day)

### Time Aggregation Toggle
- Daily / Weekly / Monthly views on timeline chart
- Extend `DateRangePicker` with aggregation selector

### Period Comparison
- "Compare to previous period" toggle
- Shows overlay on charts + delta on metric cards
- Previous period = same duration, immediately before selected range

### Customizable Dashboard
- Users can show/hide individual metric cards
- Drag-to-reorder (stretch goal — localStorage persistence)
- Store preferences in localStorage for MVP

### Layout
- Top row: Metric cards (responsive grid, 2-4 columns)
- Middle: Timeline chart with aggregation toggle
- Bottom: Detailed breakdown by repo (table or cards)

## shadcn/ui Components Needed
- `tabs` (aggregation toggle)
- `select` (metric customization)
- `badge` (trend indicators)
- `tooltip` (metric explanations)
- `separator` (layout sections)

## Acceptance Criteria
- [ ] All 7 metric cards render with real data
- [ ] Trend indicators show correct direction
- [ ] Time aggregation (daily/weekly/monthly) works
- [ ] Period comparison overlay displays correctly
- [ ] Metric visibility customizable and persisted to localStorage
- [ ] Responsive layout works on mobile/tablet/desktop
- [ ] Typecheck passes
