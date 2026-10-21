#!/usr/bin/env python3
"""Offline SQLite contract test for the API test rate-limit migration.

This validates SQL syntax and schema constraints without connecting to Cloudflare D1.
It does NOT prove that a remote D1 database has had the migration applied.
"""
from pathlib import Path
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = [
    (ROOT / "worker" / "migrations" / "006_create_api_test_limits.sql", "api_test_limits",
     {"user_id", "window_id", "attempts"}, "idx_api_test_limits_window"),
    (ROOT / "worker" / "migrations" / "007_create_api_generation_limits.sql", "api_generation_limits",
     {"user_id", "window_id", "attempts"}, "idx_api_generation_limits_window"),
]

def main():
    db = sqlite3.connect(":memory:")
    try:
        for migration_path, table, expected_columns, expected_index in MIGRATIONS:
            sql = migration_path.read_text(encoding="utf-8")
            db.executescript(sql)
            db.executescript(sql)

            columns = {row[1]: row for row in db.execute(f"PRAGMA table_info({table})")}
            assert set(columns) == expected_columns, (table, columns)
            assert columns["user_id"][3] == 1, f"{table}: user_id must be NOT NULL"
            assert columns["window_id"][3] == 1, f"{table}: window_id must be NOT NULL"
            assert columns["attempts"][4] == "0", f"{table}: attempts default must be 0"
            indexes = {row[1] for row in db.execute(f"PRAGMA index_list({table})")}
            assert expected_index in indexes, (table, indexes)

            db.execute(f"INSERT INTO {table}(user_id, window_id) VALUES (?, ?)", ("user-a", 123))
            row = db.execute(
                f"SELECT attempts FROM {table} WHERE user_id = ? AND window_id = ?",
                ("user-a", 123),
            ).fetchone()
            assert row == (0,), (table, row)
            duplicate_rejected = False
            try:
                db.execute(f"INSERT INTO {table}(user_id, window_id) VALUES (?, ?)", ("user-a", 123))
            except sqlite3.IntegrityError:
                duplicate_rejected = True
            assert duplicate_rejected, f"{table}: composite key must reject duplicates"
            db.execute(f"INSERT INTO {table}(user_id, window_id, attempts) VALUES (?, ?, ?)", ("user-b", 123, 1))
            assert db.execute(f"SELECT COUNT(*) FROM {table}").fetchone() == (2,), table

        print("=== MIGRATION RESULT: PASS ===")
        print("Both rate-limit migrations: SQL syntax, idempotence, columns, default, index, and composite key verified in SQLite.")
        print("Cloudflare D1 remote application: NOT TESTED.")
    finally:
        db.close()

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"=== MIGRATION RESULT: FAIL — {exc} ===", file=sys.stderr)
        raise
