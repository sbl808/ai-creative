-- Admin-editable plan display metadata.
-- This catalog does not grant permissions or modify users.plan.

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

INSERT OR IGNORE INTO plan_catalog
  (plan_key, name, icon, description, price_amount, price_currency,
   billing_period, features_json, enabled, sort_order, updated_at)
VALUES
  ('FREE', 'FREE', 'sparkles', '', NULL, NULL, '', '[]', 1, 10, datetime('now')),
  ('PRO', 'PRO', 'crown', '', NULL, NULL, '', '[]', 1, 20, datetime('now'));

CREATE TABLE IF NOT EXISTS plan_contact_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO plan_contact_settings
  (setting_key, setting_value, updated_at)
VALUES
  ('facebook_messenger_url', '', datetime('now')),
  ('telegram_url', '', datetime('now'));
