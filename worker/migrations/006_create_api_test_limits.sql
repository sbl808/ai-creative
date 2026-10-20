-- Fixed-window counters for authenticated API connection tests.
-- One row per user per 10-minute window; old rows can be pruned periodically.
CREATE TABLE IF NOT EXISTS api_test_limits (
  user_id TEXT NOT NULL,
  window_id INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_id)
);

CREATE INDEX IF NOT EXISTS idx_api_test_limits_window ON api_test_limits(window_id);
