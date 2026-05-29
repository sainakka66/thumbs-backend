# Reporting Architecture

## Overview

Reports module provides filtered tabular exports and PDF documents for sales, inventory, customers, and deliveries.

## Backend

| Component | Path |
|-----------|------|
| Report queries | `business/services/reportService.js` |
| PDF generation | `business/services/pdfService.js` (pdfkit) |
| HTTP routes | `business/index.js` |

### Export formats

- **JSON** — default API response for in-app use
- **CSV / Excel** — `GET /reports/:type?format=csv|excel` (CSV mime for Excel)
- **PDF** — dedicated `/pdf/*` routes

### Date filters

`range`: `today` | `week` | `month` | `custom` (+ `from`, `to` dates)

## Frontend

- Page: `frontend/src/pages/ReportsPage.jsx`
- Service: `frontend/src/services/businessService.js`
- Permission: `reports.view` (nav), `reports.export` (PDF inventory)

## Dashboard vs reports

Executive dashboard (`GET /dashboard/executive`) aggregates KPIs and chart series for real-time UI.

Reports module returns full row sets for export/archival.

## Security

- `requirePermission('reports.view')` on report endpoints
- `reports.export` on PDF inventory report
- JWT + `loadBusinessUser` on all routes

## Data flow

```
ReportsPage → fetchReport(type, { range, format })
           → download blob (CSV) or downloadPdf(path)
```

PDF downloads use authenticated `fetch` + blob save (not query-string tokens).
