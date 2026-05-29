# DB Health Report

Generated: 2026-05-29T17:42:18.021Z

**Overall:** ❌ FAIL 11/21 (52%)

| Category | Check | Status | Detail |
| --- | --- | --- | --- |
| tables | users | PASS | exists |
| tables | inventory | PASS | exists |
| tables | customers | PASS | exists |
| tables | sales | PASS | exists |
| tables | deliveries | PASS | exists |
| tables | roles | FAIL | missing |
| tables | permissions | FAIL | missing |
| tables | role_permissions | FAIL | missing |
| tables | audit_logs | FAIL | missing |
| tables | notifications | FAIL | missing |
| tables | stock_alerts | FAIL | missing |
| tables | payment_orders | PASS | exists |
| tables | payment_transactions | PASS | exists |
| tables | payment_webhooks | PASS | exists |
| tables | suspicious_activities | PASS | exists |
| tables | blocked_entities | PASS | exists |
| rbac | roles | FAIL | missing |
| rbac | permissions | FAIL | missing |
| rbac | role_permissions | FAIL | missing |
| foreign_keys | fk_count | PASS | 14 foreign keys defined |
| indexes | phase2_indexes | FAIL | 0 indexes on audit/notification/alert tables |
