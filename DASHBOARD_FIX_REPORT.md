# Dashboard `weeklySales.map` fix report

**Date:** 2026-05-30  
**Production URL:** https://thumbs-up-app-two.vercel.app/dashboard  
**Backend:** https://thumbs-backend.onrender.com  
**Commits:** `7f4747f` (fix), frontend deployed via Vercel `dpl_8pBdMXmaFP69jDLJuTmZt6afxMCW`

---

## Root cause

In `business/services/dashboardService.js`, `getExecutiveDashboard()` used **incorrect destructuring** on `Promise.all` results:

```javascript
// Bug: queryRows() already returns a row array; [weeklySales] takes the FIRST ROW object
const [[todaySales], [weeklySales], ...] = await Promise.all([queryRows(...), ...]);
weeklySales.map(...) // TypeError: weeklySales is { day, total }, not an array
```

`queryRows()` returns `rows` (an array). Wrapping each result in `[weeklySales]` assigned the **first row object** to `weeklySales`, so `.map` threw. The executive API returned **500**, and the React app showed the error string as the dashboard subtitle (`weeklySales.map is not a function`).

The same double-destructure pattern existed in `adminDashboardService.js`, breaking admin stats (`users[0]` on an object).

---

## Files changed

| File | Change |
|------|--------|
| `business/services/dashboardService.js` | Single-level destructuring; `asRows()` helper; safe `.map` on arrays |
| `business/services/adminDashboardService.js` | Same destructuring fix |
| `frontend/src/services/businessService.js` | `normalizeExecutiveDashboard()` + `Array.isArray(weeklySales)`; empty fallback on API failure |
| `frontend/src/pages/DashboardPage.jsx` | Defensive array locals; **Weekly sales (7 days)** chart card |
| `frontend/src/components/charts/SimpleBarChart.jsx` | `Array.isArray(data)` guard; empty-state message |

---

## Fix applied

1. **Backend (root cause):** `const [todaySales, weeklySales, ...] = await Promise.all([...])` and `asRows()` before every `.map`.
2. **Frontend (defense):** Normalize API payload; never call `.map` on non-arrays; chart component shows “No data for this period” instead of crashing.

---

## Verification results

| Check | Result |
|-------|--------|
| `origin/main` includes fix | Yes — `7f4747f` |
| Local `getExecutiveDashboard()` | `weeklySales` is array (length 2) |
| `npm run build` (frontend) | Passed |
| Vercel production deploy | Ready — https://thumbs-up-app-two.vercel.app |
| Render `/dashboard/executive` | **200**, `weeklySales` array length 2 |
| Dashboard loads (Playwright) | Yes — no `weeklySales.map` crash |
| Weekly sales chart visible | Yes |
| Console errors | None after Render redeploy |
| Runtime exceptions | None |

### Screenshots

- `deployment-verification/04-dashboard-fixed.png` — Executive dashboard with weekly sales chart and stat cards

---

## API structure (after fix)

```json
{
  "success": true,
  "todaySales": { "count": 1, "total": 2000 },
  "weeklySales": [
    { "day": "2026-05-27T18:30:00.000Z", "total": 45576 },
    { "day": "2026-05-28T18:30:00.000Z", "total": 12345 }
  ],
  "charts": { "salesTrend": [...], "revenueTrend": [...], ... }
}
```

`weeklySales` is always an array (possibly empty).
