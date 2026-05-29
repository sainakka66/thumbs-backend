# Security Report

Generated: 2026-05-29T17:30:09.879Z

**Overall:** ❌ FAIL 5/6 (83%)

| Check | Result | Detail |
| --- | --- | --- |
| inputGuard allows safe text | PASS | ok |
| inputGuard blocks UNION | PASS | rejected |
| parseStrictPositiveInt valid | PASS | 42 |
| parseStrictPositiveInt injection | PASS | rejected |
| payment-security.test.mjs | PASS | all tests pass |
| API reachable | FAIL | http://127.0.0.1:3000 |
