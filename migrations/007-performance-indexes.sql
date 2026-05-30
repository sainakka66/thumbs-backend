-- =============================================================================
-- Migration 007 — Performance indexes
-- Idempotent: the migration runner skips indexes that already exist
-- (INFORMATION_SCHEMA.STATISTICS check on index name).
-- =============================================================================

-- Login lookup: users.username (legacy table may lack an index on this column).
CREATE INDEX `idx_users_username` ON `users` (`username`);

-- Top-products dashboard aggregation groups by sales.product_name.
CREATE INDEX `idx_sales_product_name` ON `sales` (`product_name`);

-- Revenue/trend aggregations scan by created_at and sum total_amount.
-- Composite lets MySQL satisfy the range + sum from the index (covering-ish).
CREATE INDEX `idx_sales_created_amount` ON `sales` (`created_at`, `total_amount`);

-- Low-stock dashboard / stock-alert sync filter on quantity vs reorder.
CREATE INDEX `idx_inventory_qty_reorder` ON `inventory` (`quantity`, `reorder`);

-- Notifications unread badge: (is_read, user_id) complements existing (user_id, is_read).
CREATE INDEX `idx_notifications_read` ON `notifications` (`is_read`);

-- Audit log default view orders by created_at DESC (already indexed) — add action+created
-- composite for filtered+sorted admin queries.
CREATE INDEX `idx_audit_action_created` ON `audit_logs` (`action`, `created_at`);
