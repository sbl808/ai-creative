#!/usr/bin/env python3
"""Offline SQLite tests for migration 019; never connects to remote D1."""
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "worker" / "migrations" / "019_seed_subtitle_config.sql"


def make_db():
    db = sqlite3.connect(":memory:")
    db.executescript("""
      CREATE TABLE ai_models (
        id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'text', enabled INTEGER NOT NULL DEFAULT 1,
        is_default INTEGER NOT NULL DEFAULT 0, plan_access TEXT NOT NULL DEFAULT 'FREE',
        supported_tasks_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT
      );
      CREATE TABLE feature_settings (
        feature_id TEXT PRIMARY KEY, enabled INTEGER DEFAULT 1,
        access TEXT DEFAULT 'FREE', limit_value INTEGER DEFAULT 0, updated_at TEXT
      );
    """)
    return db


def apply_twice(db):
    sql = MIGRATION.read_text(encoding="utf-8")
    db.executescript(sql)
    first = db.execute(
        "SELECT supported_tasks_json FROM ai_models WHERE id='gemini-3.6-flash'"
    ).fetchone()
    feature_first = db.execute(
        "SELECT enabled, access, limit_value FROM feature_settings WHERE feature_id='subtitle.transcribe'"
    ).fetchone()
    db.executescript(sql)
    second = db.execute(
        "SELECT supported_tasks_json FROM ai_models WHERE id='gemini-3.6-flash'"
    ).fetchone()
    feature_second = db.execute(
        "SELECT enabled, access, limit_value FROM feature_settings WHERE feature_id='subtitle.transcribe'"
    ).fetchone()
    assert first == second, (first, second)
    assert feature_first == feature_second, (feature_first, feature_second)
    assert db.execute(
        "SELECT COUNT(*) FROM feature_settings WHERE feature_id='subtitle.transcribe'"
    ).fetchone()[0] == 1


def test_fresh_seed():
    db = make_db()
    db.execute(
        "INSERT INTO ai_models (id, name, category, supported_tasks_json) VALUES (?,?,?,?)",
        ("gemini-3.6-flash", "သာမန်", "transcribe", '["voice.transcribe"]'),
    )
    apply_twice(db)
    tasks = json.loads(db.execute(
        "SELECT supported_tasks_json FROM ai_models WHERE id='gemini-3.6-flash'"
    ).fetchone()[0])
    assert tasks == ["voice.transcribe", "subtitle.transcribe"], tasks
    assert db.execute(
        "SELECT enabled, access, limit_value FROM feature_settings WHERE feature_id='subtitle.transcribe'"
    ).fetchone() == (1, "FREE", 0)
    db.close()


def test_admin_overrides_preserved():
    db = make_db()
    db.execute(
        "INSERT INTO ai_models (id, name, category, enabled, is_default, plan_access, supported_tasks_json) VALUES (?,?,?,?,?,?,?)",
        ("gemini-3.6-flash", "Admin Model Name", "transcribe", 0, 0, "PRO", '["voice.transcribe","custom.task"]'),
    )
    db.execute(
        "INSERT INTO feature_settings (feature_id, enabled, access, limit_value) VALUES (?,?,?,?)",
        ("subtitle.transcribe", 0, "PRO", 9),
    )
    apply_twice(db)
    model = db.execute(
        "SELECT name, enabled, is_default, plan_access, supported_tasks_json FROM ai_models WHERE id='gemini-3.6-flash'"
    ).fetchone()
    assert model[:4] == ("Admin Model Name", 0, 0, "PRO"), model
    assert json.loads(model[4]) == ["voice.transcribe", "custom.task", "subtitle.transcribe"], model
    feature = db.execute(
        "SELECT enabled, access, limit_value FROM feature_settings WHERE feature_id='subtitle.transcribe'"
    ).fetchone()
    assert feature == (0, "PRO", 9), feature
    db.close()


if __name__ == "__main__":
    test_fresh_seed()
    test_admin_overrides_preserved()
    print("PASS: Subtitle config migration is idempotent and preserves admin overrides")
