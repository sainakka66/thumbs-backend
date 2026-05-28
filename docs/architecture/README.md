# ThumbsUpApp — Enterprise Architecture Diagrams

Production-grade Draw.io diagrams for the payment and security stack.

## Files

| File | Pages | Contents |
|------|-------|----------|
| `auth-architecture.drawio` | Enrollment & Auth Flow; JWT & RBAC | Registration, login (`POST /login`), session/JWT lifecycle, middleware, device trust, risk, DB tables |
| `payment-architecture.drawio` | Payment System; Payment Sequence | Create-order → Razorpay UPI → verify → webhook → refund; state machine; API matrix |
| `fraud-engine-architecture.drawio` | Risk Engine Components; Scoring Decision Tree | riskEngineV2, device trust, providers, rules, outputs |
| `admin-review-flow.drawio` | Admin Intervention | Fraud queue, dual-control refund, block-user, audit |

## Open / edit

1. Install [draw.io Desktop](https://github.com/jgraph/drawio-desktop/releases) or use [diagrams.net](https://app.diagrams.net).
2. **File → Open** and select any `.drawio` file in this folder.
3. Use the page tabs at the bottom to switch diagrams (multi-page files).

## Regenerate from code

```bash
python scripts/generate-architecture-drawio.py
```

## Legend (all diagrams)

- **Green** — trusted / allow path  
- **Yellow** — verification, hold, or schema-ready (target)  
- **Red** — blocked / fraud / critical  
- **Dashed borders** — trust boundaries or not-yet-implemented enterprise endpoints  

### Implemented vs target auth APIs

| Endpoint | Status |
|----------|--------|
| `POST /login` | Implemented (`server.js`) |
| `POST /logout` | Implemented |
| `POST /auth/register`, `POST /auth/refresh`, `GET /session/validate` | Target enterprise (tables `user_sessions`, `trusted_devices` migrated) |
| `POST /risk/analyze` | Implemented (`payments/routes/riskRoutes.js`) |

Payment and admin APIs match `payments/routes/*.js` and `payments/index.js`.
