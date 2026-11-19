#!/usr/bin/env python3
"""Offline contract test for the Platform-only Worker SQL migrations.

Uses an in-memory SQLite database only. This does NOT connect to or validate
the state of any remote Cloudflare D1 database.
"""
from pathlib import Path
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = ROOT / "worker" / "migrations-platform"

EXPECTED_TABLE_COLUMNS = {
    "users": {"id", "google_sub", "email", "plan", "expiry", "created_at", "updated_at"},
    "cms_prompts": {
        "id", "studio", "plan", "type", "core", "memory", "knowledge", "workflow",
        "template", "prompt", "quality_check", "final_output", "updated_at",
        "feature", "tab", "step", "status", "version",
    },
    "cms_brain": {
        "id", "scope", "module", "type", "plan", "key", "value",
        "active", "version", "updated_at",
    },
    "studio_settings": {"studio_id", "enabled", "updated_at"},
    "feature_settings": {"feature_id", "enabled", "access", "limit_value", "updated_at"},
    "ai_models": {
        "id", "name", "category", "enabled", "is_default", "plan_access", "updated_at",
        "provider", "capabilities_json", "supported_tasks_json", "status",
    },
    "plan_catalog": {
        "plan_key", "name", "icon", "description", "price_amount", "price_currency",
        "billing_period", "features_json", "enabled", "sort_order", "created_at", "updated_at",
    },
    "plan_contact_settings": {"setting_key", "setting_value", "updated_at"},
    "admin_logs": {"id", "action_code", "result_code", "created_at"},
    "task_catalog": {
        "task_id", "studio_id", "name", "category", "required_capabilities_json",
        "description", "enabled", "created_at", "updated_at",
    },
    "task_instruction_sets": {
        "instruction_id", "task_id", "active_version_id", "created_at", "updated_at",
    },
    "task_instruction_drafts": {
        "draft_id", "instruction_id", "fields_json", "revision", "updated_by", "updated_at",
    },
    "task_instruction_versions": {
        "version_id", "instruction_id", "version_number", "fields_json", "content_hash",
        "status", "created_by", "created_at", "published_at",
    },
    "task_instruction_reviews": {
        "review_id", "version_id", "decision", "reviewed_by", "comment", "reviewed_at",
    },
}

FORBIDDEN_USER_DATA_TABLES = {
    "creations", "projects", "usage", "user_settings", "user_preferences",
    "user_keys", "api_test_limits", "api_generation_limits",
}


def apply_migrations(db, migration_paths):
    for migration_path in migration_paths:
        sql = migration_path.read_text(encoding="utf-8")
        if not sql.strip():
            raise AssertionError(f"{migration_path.name}: migration file is empty")
        try:
            db.executescript(sql)
        except sqlite3.Error as exc:
            raise AssertionError(f"{migration_path.name} failed: {exc}") from exc


def main():
    migration_paths = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migration_paths:
        raise AssertionError(f"No SQL migration files found in {MIGRATIONS_DIR}")

    db = sqlite3.connect(":memory:")
    try:
        apply_migrations(db, migration_paths)
        # Every Platform migration must be safe to re-run in the offline contract DB.
        apply_migrations(db, migration_paths)

        actual_tables = {
            row[0]
            for row in db.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' "
                "AND name NOT LIKE 'sqlite_%'"
            )
        }
        expected_tables = set(EXPECTED_TABLE_COLUMNS)
        if actual_tables != expected_tables:
            raise AssertionError(
                "Unexpected Platform schema tables: "
                f"missing={sorted(expected_tables - actual_tables)}, "
                f"extra={sorted(actual_tables - expected_tables)}"
            )

        forbidden = actual_tables & FORBIDDEN_USER_DATA_TABLES
        if forbidden:
            raise AssertionError(
                f"User-owned data tables must not exist in Platform D1: {sorted(forbidden)}"
            )

        for table, expected_columns in EXPECTED_TABLE_COLUMNS.items():
            actual_columns = {
                row[1] for row in db.execute(f"PRAGMA table_info({table})")
            }
            missing = expected_columns - actual_columns
            if missing:
                raise AssertionError(
                    f"{table}: missing expected columns: {sorted(missing)}"
                )
            if table == "admin_logs" and actual_columns != expected_columns:
                raise AssertionError(
                    f"admin_logs must contain only minimal audit columns; found {sorted(actual_columns)}"
                )

        seeded_plans = {
            row[0]: row[1]
            for row in db.execute("SELECT plan_key, name FROM plan_catalog")
        }
        if seeded_plans != {"FREE": "FREE", "PRO": "PRO"}:
            raise AssertionError(f"Unexpected plan catalog seeds: {seeded_plans}")

        contacts = {
            row[0]: row[1]
            for row in db.execute(
                "SELECT setting_key, setting_value FROM plan_contact_settings"
            )
        }
        if contacts != {"facebook_messenger_url": "", "telegram_url": ""}:
            raise AssertionError(f"Unexpected plan contact defaults: {contacts}")

        if db.execute(
            "SELECT COUNT(*) FROM sqlite_master "
            "WHERE type='index' AND name='idx_plan_catalog_enabled_order'"
        ).fetchone()[0] != 1:
            raise AssertionError("Plan catalog enabled/order index is missing")

        print("=== PLATFORM MIGRATIONS OFFLINE RESULT: PASS ===")
        print(
            f"Applied {len(migration_paths)} Platform SQL migration files twice "
            "to in-memory SQLite."
        )
        print(f"Verified schema contracts for {len(EXPECTED_TABLE_COLUMNS)} tables.")
        print("Verified Platform D1 excludes user-owned content/settings/usage tables.")
        print("Cloudflare D1 remote application: NOT TESTED.")
    finally:
        db.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"=== PLATFORM MIGRATIONS OFFLINE RESULT: FAIL — {exc} ===", file=sys.stderr)
        raise
