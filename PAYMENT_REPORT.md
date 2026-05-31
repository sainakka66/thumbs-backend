# Payment & Collections Report — Phase 2

**Date:** 2026-05-31

## Implemented

| Feature | Status |
|---------|--------|
| Due dashboard | `GET /collections/dues/dashboard` — total outstanding, aging buckets |
| Collection tracking | `collections` table — cash, UPI, bank_transfer, cheque |
| UPI QR (static/dynamic) | `lib/payments/upiQr.js`, `GET /collections/upi-qr/:customerId` |
| Payment reconciliation schema | `payment_reconciliations` table |
| Due notifications architecture | `feature_flags` — `notify_whatsapp`, `notify_sms`, `notify_email` (disabled) |

## Migration

`npm run migrate:roadmap-collections`

## Frontend

`/collections` — dues KPIs and aging panel

## Follow-up

- Full reconciliation UI and invoice matching workflows
- Razorpay settlement tie-in for UPI collections
- Enable notification providers when credentials are supplied
