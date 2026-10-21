-- Shared fixed-window rate limits for AI generation routes across Worker isolates.
-- One counter per authenticated user per 10-minute window.
-- Old windows can be pruned periodically; no remote migration is run by CI.
CREATE TABLE IF NOT EXISTS api_generation_limits (
  user_id TEXT NOT NULL,
  window_id INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_id)
);

CREATE INDEX IF NOT EXISTS idx_api_generation_limits_window
  ON api_generation_limits(window_id);
