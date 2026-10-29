#!/usr/bin/env python3
"""Offline contract test for every Worker SQL migration.

Uses an in-memory SQLite database only. This does NOT connect to or validate
the state of any remote Cloudflare D1 database.
"""
from pathlib import Path
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = ROOT / "worker" / "migrations"

EXPECTED_TABLE_COLUMNS = {
    "users": {"id", "email", "plan", "name", "password_hash"},
    "cms_prompts": {
        "id", "studio", "plan", "type", "core", "memory", "knowledge",
        "workflow", "template", "prompt", "quality_check", "final_output",
        "feature", "tab", "step", "status", "version",
    },
    "creations": {
        "id", "user_id", "studio", "title", "original_prompt", "ai_output",
        "type", "created_at", "is_favorite",
    },
    "user_keys": {"user_id", "gemini_key", "updated_at"},
    "user_settings": {
        "user_id", "default_studio", "default_voice", "default_model",
        "language", "theme", "updated_at",
    },
    "user_preferences": {"user_id", "pref_key", "pref_value", "updated_at"},
    "api_test_limits": {"user_id", "window_id", "attempts"},
    "projects": {"id", "user_id", "title", "description", "created_at", "updated_at"},
    "usage": {"id", "user_id", "category", "amount", "created_at"},
    "studio_settings": {"studio_id", "enabled", "updated_at"},
    "feature_settings": {"feature_id", "enabled", "access", "limit_value", "updated_at"},
    "admin_logs": {"id", "admin_email", "action", "detail", "created_at"},
    "ai_models": {
        "id", "name", "category", "enabled", "is_default", "plan_access", "updated_at",
    },
    "api_generation_limits": {"user_id", "window_id", "attempts"},
    "cms_brain": {
        "id", "scope", "module", "type", "plan", "key", "value",
        "active", "version", "updated_at",
    },
    "plan_catalog": {
        "plan_key", "name", "icon", "description", "price_amount", "price_currency",
        "billing_period", "features_json", "enabled", "sort_order", "created_at", "updated_at",
    },
    "plan_contact_settings": {"setting_key", "setting_value", "updated_at"},
}


def main():
    migration_paths = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migration_paths:
        raise AssertionError(f"No SQL migration files found in {MIGRATIONS_DIR}")

    db = sqlite3.connect(":memory:")
    try:
        for migration_path in migration_paths:
            sql = migration_path.read_text(encoding="utf-8")
            if not sql.strip():
                raise AssertionError(f"{migration_path.name}: migration file is empty")
            try:
                db.executescript(sql)
            except sqlite3.Error as exc:
                raise AssertionError(f"{migration_path.name} failed: {exc}") from exc

        actual_tables = {
            row[0]
            for row in db.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        for table, expected_columns in EXPECTED_TABLE_COLUMNS.items():
            if table not in actual_tables:
                raise AssertionError(f"Expected table is missing: {table}")
            actual_columns = {
                row[1] for row in db.execute(f"PRAGMA table_info({table})")
            }
            missing = expected_columns - actual_columns
            if missing:
                raise AssertionError(
                    f"{table}: missing expected columns: {sorted(missing)}"
                )

        # Plan catalog migration contract: known plans are seeded for display only,
        # contact destinations are blank until an admin configures validated URLs.
        seeded_plans = {
            row[0]: row[1]
            for row in db.execute("SELECT plan_key, name FROM plan_catalog")
        }
        if seeded_plans != {"FREE": "FREE", "PRO": "PRO"}:
            raise AssertionError(f"Unexpected plan catalog seeds: {seeded_plans}")
        contacts = {
            row[0]: row[1]
            for row in db.execute("SELECT setting_key, setting_value FROM plan_contact_settings")
        }
        if contacts != {"facebook_messenger_url": "", "telegram_url": ""}:
            raise AssertionError(f"Unexpected plan contact defaults: {contacts}")
        if db.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_plan_catalog_enabled_order'").fetchone()[0] != 1:
            raise AssertionError("Plan catalog enabled/order index is missing")

        # The migration is idempotent and does not modify the existing users.plan values.
        migration_user = db.execute(
            "INSERT INTO users (email, plan, name, password_hash) VALUES (?, ?, ?, ?)",
            ("migration-check@example.test", "PRO", "", ""),
        )
        migration_user_id = migration_user.lastrowid
        db.executescript((MIGRATIONS_DIR / "016_create_plan_catalog.sql").read_text(encoding="utf-8"))
        unchanged_plan = db.execute("SELECT plan FROM users WHERE id=?", (migration_user_id,)).fetchone()
        if not unchanged_plan or unchanged_plan[0] != "PRO":
            raise AssertionError("Plan catalog migration changed users.plan")
        if db.execute("SELECT COUNT(*) FROM plan_catalog").fetchone()[0] != 2:
            raise AssertionError("Plan catalog migration is not idempotent")

        # Explicitly guard against accidentally overlooking the duplicate 006 prefix.
        duplicate_prefix_migrations = [
            path.name for path in migration_paths if path.name.startswith("006_")
        ]
        if len(duplicate_prefix_migrations) != 2:
            raise AssertionError(
                "Expected both distinct 006 migrations; found "
                f"{duplicate_prefix_migrations}"
            )

        print("=== ALL MIGRATIONS OFFLINE RESULT: PASS ===")
        print(f"Applied {len(migration_paths)} SQL migration files to in-memory SQLite.")
        print(f"Verified schema contracts for {len(EXPECTED_TABLE_COLUMNS)} tables.")
        print("Both distinct 006-prefixed migrations were included.")
        print("Cloudflare D1 remote application: NOT TESTED.")
    finally:
        db.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"=== ALL MIGRATIONS OFFLINE RESULT: FAIL — {exc} ===", file=sys.stderr)
        raise
