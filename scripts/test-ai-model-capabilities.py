#!/usr/bin/env python3
"""Offline SQLite contract test for migration 017; no remote D1 access."""
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "worker" / "migrations" / "017_add_ai_model_capabilities.sql"

def main():
    db = sqlite3.connect(":memory:")
    db.executescript("""
      CREATE TABLE ai_models (
        id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'text', enabled INTEGER NOT NULL DEFAULT 1,
        is_default INTEGER NOT NULL DEFAULT 0, plan_access TEXT NOT NULL DEFAULT 'FREE',
        updated_at TEXT
      );
      INSERT INTO ai_models (id,name,category) VALUES
        ('m-text','Text','text'), ('m-image','Image','image'),
        ('m-voice','Voice','voice'), ('m-transcribe','Transcribe','transcribe');
    """)
    db.executescript(MIGRATION.read_text(encoding="utf-8"))
    cols = {row[1] for row in db.execute("PRAGMA table_info(ai_models)")}
    assert {"provider", "capabilities_json", "supported_tasks_json", "status"} <= cols
    rows = db.execute("SELECT id,provider,capabilities_json,supported_tasks_json,status FROM ai_models").fetchall()
    assert len(rows) == 4
    for model_id, provider, capabilities, tasks, status in rows:
        assert provider == "gemini" and status == "active", model_id
        assert json.loads(capabilities) and json.loads(tasks), model_id
    print("PASS: migration 017 adds model metadata and preserves existing rows")

if __name__ == "__main__":
    main()
