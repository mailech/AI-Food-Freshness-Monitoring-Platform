# UI/UX Requirements Document
## AI-Powered Food Freshness Monitoring Platform

Version 1.0

---

## 1. Design Principles
1. **Role-first navigation** — each user sees only their relevant dashboard and actions.
2. **Freshness at a glance** — color-coded freshness status visible everywhere items appear.
3. **Actionable insights** — every score/insight pairs with a recommended action.
4. **Responsive by default** — desktop, tablet, mobile layouts (Tailwind CSS breakpoints).
5. **Accessible** — WCAG 2.1 AA contrast; keyboard navigable; ARIA labels on charts and alerts.

## 2. Visual Design System (Tailwind CSS)

### 2.1 Freshness Color Palette (semantic)
| Status | Color | Usage |
|---|---|---|
| Fresh | Green `#16A34A` | Scores 80–100 |
| Good | Lime `#84CC16` | Scores 60–79 |
| Acceptable | Amber `#F59E0B` | Scores 40–59 |
| Near Spoilage | Orange `#EA580C` | Scores 20–39 |
| Spoiled | Red `#DC2626` | Scores 0–19 |

### 2.2 Core Tokens
- Primary: Blue `#2563EB`; Neutral grays for surfaces/text.
- Typography: Inter or system font stack; clear hierarchy (H1–H4).
- Spacing: Tailwind 4/8/12/16 scale.
- Components: rounded-xl cards, subtle shadows, pill-shaped status badges.

## 3. Screen Inventory & Requirements

### 3.1 Global Screens
| # | Screen | Requirements |
|---|---|---|
| S-01 | Login | Email/password, OAuth2 buttons, error states, forgot password link |
| S-02 | Registration | Role selection dropdown, validation feedback inline |
| S-03 | App Shell | Sidebar nav (role-aware), topbar with notifications bell + profile menu, breadcrumb |

### 3.2 Consumer Dashboard (default landing)
- **Inventory overview:** grid/list of food items with image thumbnail, freshness badge, predicted days remaining.
- **Freshness report card:** per-item detail — score gauge, trend sparkline, spoilage probability.
- **Shelf-life estimates:** sorted "use first" list.
- **Storage recommendations panel:** contextual tips per item.

### 3.3 Retail Dashboard
- Product freshness analytics: category-wise freshness distribution (Chart.js bar/donut).
- Inventory quality monitoring table: sortable/filterable (category, status, expiry window).
- Shelf-life alerts feed: expiring-soon and near-spoilage items with quick actions.
- Waste reduction insights: waste trend chart (Plotly time series), savings estimate cards.

### 3.4 Warehouse Dashboard
- Storage compliance monitor: zone cards showing temperature/humidity vs. allowed range (green/red), violation log.
- Inventory health tracking: batch-level freshness heatmap.
- Batch freshness reports: filterable report list with export buttons.
- Environmental analytics: temp/humidity line charts over time.

### 3.5 Admin Dashboard
- User management: table with search, role edit, activate/deactivate.
- Platform analytics: active users, assessments/day, alert volume charts.
- System monitoring: service health indicators, API latency stats.
- Reporting management: scheduled/available reports, export controls.

### 3.6 Key Feature Flows (UI requirements)

**Flow F-1: Register food item**
Form fields: name, category (select of 8), packaging type, quantity, batch code, received date, expiry date, storage location. Inline validation; success toast; redirect to item detail.

**Flow F-2: Upload image & assess**
Drag-and-drop uploader → progress indicator during analysis → results view: detected issues list (mold/bruising/color degradation), confidence %, freshness score dial, category badge.

**Flow F-3: Record storage reading**
Quick form (temperature °C, humidity %, air circulation, light exposure) or sensor auto-feed indicator → compliance verdict banner immediately shown.

**Flow F-4: Generate report**
Report type select → date-range picker → preview → Export PDF / Export Excel buttons.

## 4. Interaction & Feedback Requirements
- All async actions show loading spinners/skeletons; never block UI thread.
- Toast notifications for success/error; persistent alert center for system alerts (freshness, shelf-life, spoilage, storage, inventory).
- Destructive actions require confirmation modals.
- Empty states with guidance ("Add your first food item").
- Optimistic updates for read/unread notification toggles.

## 5. Navigation Map
```
App Shell
├── Dashboard (role-specific)
├── My Inventory / Inventory (items, batches)
├── Assess (upload image, view assessments)
├── Predictions (shelf-life)
├── Storage Monitoring (readings, compliance)   [warehouse/admin emphasis]
├── Recommendations
├── Alerts
├── Reports & Exports
└── Admin ▸ Users · Analytics · System · Report Mgmt  [admin only]
```

## 6. Responsiveness Breakpoints
| Device | Layout behavior |
|---|---|
| ≥1280px | Full sidebar + multi-column dashboards |
| 768–1279px | Collapsible sidebar; 2-column grids |
| <768px | Bottom/hamburger nav; single-column stacked cards; tables become expandable rows |

## 7. Accessibility Checklist
- [ ] Color is never the sole indicator — pair colors with icons/labels (e.g., ⚠ Near Spoilage).
- [ ] Charts include data tables or aria-labels.
- [ ] Focus states visible; logical tab order.
- [ ] Form errors announced via `aria-live`.
- [ ] Minimum touch target 44×44px.

## 8. Wireframe Planning Note
Per Milestone 1 tasks, low-fidelity wireframes must be created for: login/register, app shell, consumer dashboard, item detail + assessment flow, retail/warehouse/admin dashboards, storage monitoring screen, and report generation modal — before implementation begins.

## 9. Visualization Library Mapping
| Need | Library |
|---|---|
| Simple bars/donuts/sparklines | Chart.js |
| Advanced time-series/environmental analytics | Plotly |
| Score gauges/dials | Chart.js doughnut custom or SVG gauge |
