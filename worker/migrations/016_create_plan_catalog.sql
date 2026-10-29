-- ============================================================
-- AI Creative Studio — Migration 016: Plan Catalog + Upgrade Contacts
-- Option B — Admin-editable plan display data, separate from authorization.
--
-- IMPORTANT:
--   * This migration only defines/initializes schema when applied.
--   * It does NOT grant plan permissions or modify users.plan.
--   * Feature access remains controlled by the existing server-side Feature Gate.
--   * Plans are disabled/archived via enabled=0; do not delete plans assigned to users.
--   * No real prices or contact URLs are assumed; configure them in Admin.
-- ============================================================

CREATE TABLE IF NOT EXISTS plan_catalog (
  plan_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'sparkles',
  description TEXT NOT NULL DEFAULT '',
  price_amount REAL,
  price_currency TEXT,
  billing_period TEXT NOT NULL DEFAULT '',
  features_json TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plan_catalog_enabled_order
  ON plan_catalog (enabled, sort_order);

-- Seed only the existing plan identifiers. Display prices and feature copy are
-- intentionally blank until an administrator configures them; permissions are
-- not inferred from this catalog.
INSERT OR IGNORE INTO plan_catalog
  (plan_key, name, icon, description, price_amount, price_currency, billing_period, features_json, enabled, sort_order, updated_at)
VALUES
  ('FREE', 'FREE', 'sparkles', '', NULL, NULL, '', '[]', 1, 10, datetime('now')),
  ('PRO', 'PRO', 'crown', '', NULL, NULL, '', '[]', 1, 20, datetime('now'));

CREATE TABLE IF NOT EXISTS plan_contact_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Real links are deliberately not hard-coded. Admin can configure validated
-- HTTPS Facebook Messenger and Telegram destinations in the application layer.
INSERT OR IGNORE INTO plan_contact_settings (setting_key, setting_value, updated_at)
VALUES
  ('facebook_messenger_url', '', datetime('now')),
  ('telegram_url', '', datetime('now'));
