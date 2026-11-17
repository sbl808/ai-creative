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

        # Subtitle model metadata backfill: preserve existing tasks and remain idempotent.
        subtitle_model_id = "migration-check-transcribe"
        db.execute(
            """
            INSERT INTO ai_models (
                id, name, category, enabled, is_default, plan_access,
                provider, capabilities_json, supported_tasks_json, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                subtitle_model_id, "Migration check", "transcribe", 1, 0, "FREE",
                "gemini", '["audio-transcription"]',
                '["content.transcribe","voice.transcribe"]', "active",
            ),
        )
        subtitle_migration = (
            MIGRATIONS_DIR / "019_add_subtitle_transcribe_task.sql"
        ).read_text(encoding="utf-8")
        db.executescript(subtitle_migration)
        backfilled_tasks = [
            row[0]
            for row in db.execute(
                "SELECT value FROM json_each(("
                "SELECT supported_tasks_json FROM ai_models WHERE id=?"
                "))",
                (subtitle_model_id,),
            )
        ]
        if backfilled_tasks != [
            "content.transcribe", "voice.transcribe", "subtitle.transcribe"
        ]:
            raise AssertionError(
                f"Subtitle task backfill did not preserve existing tasks: {backfilled_tasks}"
            )
        db.executescript(subtitle_migration)
        repeated_tasks = [
            row[0]
            for row in db.execute(
                "SELECT value FROM json_each(("
                "SELECT supported_tasks_json FROM ai_models WHERE id=?"
                "))",
                (subtitle_model_id,),
            )
        ]
        if repeated_tasks != backfilled_tasks:
            raise AssertionError(
                f"Subtitle task backfill is not idempotent: {repeated_tasks}"
            )

        # The complete platform registry is seeded so fail-closed settings reads
        # do not accidentally disable unrelated Studios or Features.
        expected_studios = {
            "story", "content", "short", "image", "voice", "subtitle", "shop"
        }
        seeded_studios = {
            row[0]: row[1]
            for row in db.execute("SELECT studio_id, enabled FROM studio_settings")
        }
        if set(seeded_studios) != expected_studios:
            raise AssertionError(
                f"Unexpected Studio settings seeded: {sorted(seeded_studios)}"
            )
        if any(enabled != 1 for enabled in seeded_studios.values()):
            raise AssertionError(
                f"Registry-enabled Studios were not all enabled: {seeded_studios}"
            )

        expected_features = {
            "generate": "FREE",
            "ideas.generate": "FREE",
            "content.generate": "FREE",
            "content.revise": "FREE",
            "content.tts": "FREE",
            "content.video": "FREE",
            "content.video_image": "FREE",
            "content.srt": "FREE",
            "content.translate_srt": "FREE",
            "story.generate": "FREE",
            "story.revise": "FREE",
            "story.video": "PRO",
            "story.video_image": "PRO",
            "short.generate": "FREE",
            "short.revise": "FREE",
            "short.video": "FREE",
            "short.video_image": "FREE",
            "image.prompt": "FREE",
            "image.ad_prompt": "FREE",
            "image.generate": "FREE",
            "voice.tts": "FREE",
            "voice.transcribe": "FREE",
            "voice.srt": "PRO",
            "voice.translate_srt": "PRO",
            "subtitle.transcribe": "FREE",
            "shop.content_generate": "FREE",
            "shop.content_revise": "FREE",
            "shop.video_generate": "FREE",
            "shop.video_image": "FREE",
        }
        seeded_features = {
            row[0]: (row[1], row[2], row[3])
            for row in db.execute(
                "SELECT feature_id, enabled, access, limit_value FROM feature_settings"
            )
        }
        if set(seeded_features) != set(expected_features):
            raise AssertionError(
                f"Unexpected Feature settings seeded: {sorted(seeded_features)}"
            )
        for feature_id, access in expected_features.items():
            if seeded_features[feature_id] != (1, access, 0):
                raise AssertionError(
                    f"Unexpected defaults for {feature_id}: {seeded_features[feature_id]}"
                )

        # Simulate a partially initialized existing installation. Existing
        # Admin overrides must survive while all missing registry rows are added.
        db.execute(
            "UPDATE studio_settings SET enabled=0 WHERE studio_id='story'"
        )
        db.execute(
            "UPDATE feature_settings SET enabled=0, access='PRO', limit_value=9 "
            "WHERE feature_id='subtitle.transcribe'"
        )
        db.execute(
            "DELETE FROM studio_settings WHERE studio_id <> 'story'"
        )
        db.execute(
            "DELETE FROM feature_settings WHERE feature_id <> 'subtitle.transcribe'"
        )
        subtitle_settings_migration = (
            MIGRATIONS_DIR / "020_seed_subtitle_platform_settings.sql"
        ).read_text(encoding="utf-8")
        db.executescript(subtitle_settings_migration)

        restored_studios = {
            row[0]: row[1]
            for row in db.execute("SELECT studio_id, enabled FROM studio_settings")
        }
        if set(restored_studios) != expected_studios:
            raise AssertionError(
                f"Migration did not backfill missing Studios: {sorted(restored_studios)}"
            )
        if restored_studios["story"] != 0:
            raise AssertionError("Story Studio Admin override was overwritten")
        if any(
            restored_studios[studio_id] != 1
            for studio_id in expected_studios - {"story"}
        ):
            raise AssertionError("Missing Studio defaults were not restored")

        restored_features = {
            row[0]: (row[1], row[2], row[3])
            for row in db.execute(
                "SELECT feature_id, enabled, access, limit_value FROM feature_settings"
            )
        }
        if set(restored_features) != set(expected_features):
            raise AssertionError(
                f"Migration did not backfill missing Features: {sorted(restored_features)}"
            )
        if restored_features["subtitle.transcribe"] != (0, "PRO", 9):
            raise AssertionError("Subtitle Feature Admin override was overwritten")
        for feature_id, access in expected_features.items():
            if feature_id == "subtitle.transcribe":
                continue
            if restored_features[feature_id] != (1, access, 0):
                raise AssertionError(
                    f"Missing Feature default was not restored for {feature_id}: "
                    f"{restored_features[feature_id]}"
                )

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
