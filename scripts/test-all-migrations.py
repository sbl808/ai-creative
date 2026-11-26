#!/usr/bin/env python3
"""Offline contract test for the Platform-only Worker SQL migrations.

Uses an in-memory SQLite database only. This does NOT connect to or validate
the state of any remote Cloudflare D1 database.
"""
from pathlib import Path
import json
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

        expected_studios = {
            "story", "content", "short", "image", "voice", "subtitle", "shop",
        }
        studio_rows = {
            row[0]: row[1]
            for row in db.execute("SELECT studio_id, enabled FROM studio_settings")
        }
        if studio_rows != {studio_id: 1 for studio_id in expected_studios}:
            raise AssertionError(f"Unexpected Studio seeds: {studio_rows}")

        expected_feature_access = {
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
            "subtitle.srt": "PRO",
            "subtitle.translate_srt": "PRO",
            "shop.content_generate": "FREE",
            "shop.content_revise": "FREE",
            "shop.video_generate": "FREE",
            "shop.video_image": "FREE",
        }
        feature_rows = {
            row[0]: (row[1], row[2], row[3])
            for row in db.execute(
                "SELECT feature_id, enabled, access, limit_value FROM feature_settings"
            )
        }
        expected_feature_rows = {
            feature_id: (1, access, 0)
            for feature_id, access in expected_feature_access.items()
        }
        if feature_rows != expected_feature_rows:
            raise AssertionError(f"Unexpected Feature seeds: {feature_rows}")

        canonical_model = db.execute(
            "SELECT category, enabled, is_default, plan_access, provider, "
            "capabilities_json, supported_tasks_json, status "
            "FROM ai_models WHERE id='gemini-3.6-flash'"
        ).fetchone()
        expected_model = (
            "transcribe", 1, 1, "FREE", "gemini",
            '["audio-transcription","subtitle-generation","text-translation"]',
            '["content.transcribe","voice.transcribe","subtitle.transcribe"]',
            "active",
        )
        if canonical_model != expected_model:
            raise AssertionError(f"Unexpected canonical transcription model seed: {canonical_model}")

        legacy_model = db.execute(
            "SELECT supported_tasks_json FROM ai_models WHERE id='gemini-3.5-transcribe'"
        ).fetchone()
        if not legacy_model or legacy_model[0] != '["content.transcribe","voice.transcribe"]':
            raise AssertionError(f"Legacy transcription model was not preserved: {legacy_model}")

        # Existing installations may have persisted model metadata from before
        # subtitle.transcribe was added. Migration 0012 must append the task without
        # overwriting Admin-managed model settings or duplicating existing tasks.
        migration_0012 = MIGRATIONS_DIR / "0012_subtitle_transcribe_task_metadata.sql"
        db.execute(
            "UPDATE ai_models SET supported_tasks_json=?, enabled=0, is_default=0, "
            "plan_access='PRO', provider='custom', capabilities_json='[\"custom-capability\"]', "
            "status='deprecated', updated_at='admin-kept' WHERE id='gemini-3.6-flash'",
            ('["content.transcribe","voice.transcribe"]',),
        )
        db.execute(
            "UPDATE ai_models SET supported_tasks_json=? WHERE id='gemini-3.5-transcribe'",
            ('["voice.transcribe"]',),
        )
        db.execute(
            "INSERT INTO ai_models "
            "(id, name, category, supported_tasks_json) "
            "VALUES ('m-invalid-transcribe', 'Invalid metadata', 'transcribe', 'not-json')"
        )
        voice_before = db.execute(
            "SELECT supported_tasks_json FROM ai_models WHERE category='voice' LIMIT 1"
        ).fetchone()
        apply_migrations(db, [migration_0012])

        canonical_after = db.execute(
            "SELECT supported_tasks_json, enabled, is_default, plan_access, provider, "
            "capabilities_json, status, updated_at "
            "FROM ai_models WHERE id='gemini-3.6-flash'"
        ).fetchone()
        expected_canonical_after = (
            '["content.transcribe","voice.transcribe","subtitle.transcribe"]',
            0, 0, "PRO", "custom", '["custom-capability"]', "deprecated", "admin-kept",
        )
        if canonical_after != expected_canonical_after:
            raise AssertionError(
                f"Subtitle task migration did not preserve canonical model metadata: {canonical_after}"
            )

        legacy_tasks = json.loads(db.execute(
            "SELECT supported_tasks_json FROM ai_models WHERE id='gemini-3.5-transcribe'"
        ).fetchone()[0])
        if legacy_tasks != ["voice.transcribe", "subtitle.transcribe"]:
            raise AssertionError(f"Legacy model task list was not extended safely: {legacy_tasks}")

        invalid_tasks = db.execute(
            "SELECT supported_tasks_json FROM ai_models WHERE id='m-invalid-transcribe'"
        ).fetchone()[0]
        if invalid_tasks != "not-json":
            raise AssertionError("Invalid task metadata must remain untouched for review")

        voice_after = db.execute(
            "SELECT supported_tasks_json FROM ai_models WHERE category='voice' LIMIT 1"
        ).fetchone()
        if voice_after != voice_before:
            raise AssertionError("Subtitle migration changed a non-transcribe model")

        migrated_snapshot = db.execute(
            "SELECT id, supported_tasks_json, enabled, is_default, plan_access, provider, "
            "capabilities_json, status, updated_at FROM ai_models ORDER BY id"
        ).fetchall()
        apply_migrations(db, [migration_0012])
        rerun_snapshot = db.execute(
            "SELECT id, supported_tasks_json, enabled, is_default, plan_access, provider, "
            "capabilities_json, status, updated_at FROM ai_models ORDER BY id"
        ).fetchall()
        if rerun_snapshot != migrated_snapshot:
            raise AssertionError("Subtitle task migration is not idempotent")
        if json.loads(canonical_after[0]).count("subtitle.transcribe") != 1:
            raise AssertionError("Subtitle task must appear exactly once per model")

        # Re-applying 0011 must not overwrite persisted Admin settings or model overrides.
        migration_0011 = MIGRATIONS_DIR / "0011_subtitle_platform_seed.sql"
        db.execute(
            "UPDATE studio_settings SET enabled=0, updated_at='admin-kept' "
            "WHERE studio_id='subtitle'"
        )
        db.execute(
            "UPDATE feature_settings SET enabled=0, access='PRO', limit_value=7, "
            "updated_at='admin-kept' WHERE feature_id='subtitle.transcribe'"
        )
        db.execute(
            "UPDATE ai_models SET enabled=0, is_default=0, "
            "supported_tasks_json='[\"voice.transcribe\"]', updated_at='admin-kept' "
            "WHERE id='gemini-3.6-flash'"
        )
        apply_migrations(db, [migration_0011])

        preserved_studio = db.execute(
            "SELECT enabled, updated_at FROM studio_settings WHERE studio_id='subtitle'"
        ).fetchone()
        preserved_feature = db.execute(
            "SELECT enabled, access, limit_value, updated_at FROM feature_settings "
            "WHERE feature_id='subtitle.transcribe'"
        ).fetchone()
        preserved_model = db.execute(
            "SELECT enabled, is_default, supported_tasks_json, updated_at "
            "FROM ai_models WHERE id='gemini-3.6-flash'"
        ).fetchone()
        if preserved_studio != (0, "admin-kept"):
            raise AssertionError(f"Admin Studio override was overwritten: {preserved_studio}")
        if preserved_feature != (0, "PRO", 7, "admin-kept"):
            raise AssertionError(f"Admin Feature override was overwritten: {preserved_feature}")
        if preserved_model != (0, 0, '["voice.transcribe"]', "admin-kept"):
            raise AssertionError(f"Admin model override was overwritten: {preserved_model}")

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
