#!/usr/bin/env python3
"""Offline SQLite contract test for the API test rate-limit migration.

This validates SQL syntax and schema constraints without connecting to Cloudflare D1.
It does NOT prove that a remote D1 database has had the migration applied.
"""
from pathlib import Path
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "worker" / "migrations" / "006_create_api_test_limits.sql"

def main():
    sql = MIGRATION.read_text(encoding="utf-8")
    db = sqlite3.connect(":memory:")
    try:
        db.executescript(sql)
        # Migration must be safe to apply a second time.
        db.executescript(sql)

        columns = {row[1]: row for row in db.execute("PRAGMA table_info(api_test_limits)")}
        assert set(columns) == {"user_id", "window_id", "attempts"}, columns
        assert columns["user_id"][3] == 1, "user_id must be NOT NULL"
        assert columns["window_id"][3] == 1, "window_id must be NOT NULL"
        assert columns["attempts"][4] == "0", "attempts default must be 0"

        indexes = {row[1] for row in db.execute("PRAGMA index_list(api_test_limits)")}
        assert "idx_api_test_limits_window" in indexes, indexes

        db.execute(
            "INSERT INTO api_test_limits(user_id, window_id) VALUES (?, ?)",
            ("user-a", 123),
        )
        row = db.execute(
            "SELECT attempts FROM api_test_limits WHERE user_id = ? AND window_id = ?",
            ("user-a", 123),
        ).fetchone()
        assert row == (0,), row

        duplicate_rejected = False
        try:
            db.execute(
                "INSERT INTO api_test_limits(user_id, window_id) VALUES (?, ?)",
                ("user-a", 123),
            )
        except sqlite3.IntegrityError:
            duplicate_rejected = True
        assert duplicate_rejected, "composite primary key must reject duplicate user/window rows"

        db.execute(
            "INSERT INTO api_test_limits(user_id, window_id, attempts) VALUES (?, ?, ?)",
            ("user-b", 123, 1),
        )
        assert db.execute("SELECT COUNT(*) FROM api_test_limits").fetchone() == (2,)
        print("=== MIGRATION RESULT: PASS ===")
        print("SQL syntax, idempotence, columns, default, index, and composite key verified in SQLite.")
        print("Cloudflare D1 remote application: NOT TESTED.")
    finally:
        db.close()

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"=== MIGRATION RESULT: FAIL — {exc} ===", file=sys.stderr)
        raise
