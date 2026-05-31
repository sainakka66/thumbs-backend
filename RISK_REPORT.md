# Risk Report — Phase 5 Advanced Risk Engine

**Date:** 2026-05-31

## Socure / Sardine audit

| Component | Status |
|-----------|--------|
| `payments/risk/providers/socureProvider.js` | **Partially implemented** — calls Socure EmailAuthScore when `SOCURE_ENABLED=true` and API key set; otherwise no-op |
| `payments/risk/providers/sardineProvider.js` | **Partially implemented** — optional adapter; disabled without `SARDINE_ENABLED` |
| `payments/risk/riskOrchestrator.js` | **Implemented** — blends provider scores with internal engine |
| `payments/fraud/riskEngineV2.js` | **Implemented** — payment risk rules |
| `payments/services/deviceTrustService.js` | **Implemented** — emulator, headless, impossible travel, blocked devices |

## Roadmap capabilities (login + platform)

| Capability | Status |
|------------|--------|
| Device fingerprinting | **Implemented** |
| IP reputation | **Partial** — proxy chain / header heuristics only |
| VPN detection | **Partial** — header-based |
| TOR detection | **Missing** — no exit-node list wired |
| Velocity checks | **Implemented** — rate limits + login failure velocity |
| Impossible travel | **Implemented** — `device_sessions` geo + `security_incidents` |
| High-risk login scoring | **Implemented** — `lib/security/riskLoginService.js` |
| Risk dashboard | **Implemented** — `GET /risk/dashboard` + `/admin/risk` UI |

## Recommendations

1. Enable Socure/Sardine in production via env vars when keys are available.
2. Add TOR exit-node feed or commercial IP intelligence API for full IP reputation.
3. Wire payment risk score into login when same device is used for high-value orders.
