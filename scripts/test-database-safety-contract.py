#!/usr/bin/env python3
"""Offline safety contract for Wrangler environment targets and SQL migrations.

This test reads repository files only. It never connects to Cloudflare or D1.
"""
from collections import defaultdict
from pathlib import Path
import re
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[1]
WRANGLER = ROOT / "worker" / "wrangler.toml"
MIGRATIONS = ROOT / "worker" / "migrations"
DATABASE_DOC = ROOT / "DATABASE.md"

EXPECTED_ENVIRONMENTS = ("dev", "staging", "prod")
# Deliberate destructive SQL must be reviewed and explicitly listed here.
# Keep the historical migration itself unchanged.
ALLOWED_DESTRUCTIVE_STATEMENTS = {
    (
        "013_switch_transcribe_model.sql",
        "DELETE FROM ai_models WHERE category='transcribe' AND id='gemini-3.5-transcribe';",
    ),
}
DESTRUCTIVE_LINE = re.compile(
    r"\b(?:DELETE\s+FROM|DROP\s+TABLE|TRUNCATE(?:\s+TABLE)?|ALTER\s+TABLE\s+\S+\s+DROP\s+(?:COLUMN|CONSTRAINT))\b",
    re.IGNORECASE,
)


def fail(message: str) -> None:
    raise AssertionError(message)


def normalize_sql(statement: str) -> str:
    return re.sub(r"\s+", " ", statement.strip()).rstrip(";").lower()


def main() -> int:
    if not WRANGLER.is_file() or not DATABASE_DOC.is_file():
        fail("Required safety-contract input file is missing.")
    if not MIGRATIONS.is_dir():
        fail("Migration directory is missing.")

    config = tomllib.loads(WRANGLER.read_text(encoding="utf-8"))
    names = []
    placeholder_targets = []
    for env_name in EXPECTED_ENVIRONMENTS:
        env = config.get("env", {}).get(env_name)
        if not isinstance(env, dict):
            fail(f"Missing Wrangler environment: env.{env_name}")
        if env.get("vars", {}).get("ENVIRONMENT") != env_name:
            fail(f"env.{env_name} must set vars.ENVIRONMENT = {env_name!r}")
        bindings = env.get("d1_databases", [])
        if len(bindings) != 1:
            fail(f"env.{env_name} must declare exactly one D1 binding for review")
        binding = bindings[0]
        if binding.get("binding") != "DB":
            fail(f"env.{env_name} D1 binding must be named DB")
        database_name = binding.get("database_name")
        database_id = binding.get("database_id")
        if not isinstance(database_name, str) or not database_name.strip():
            fail(f"env.{env_name} is missing database_name")
        if not isinstance(database_id, str) or not database_id.strip():
            fail(f"env.{env_name} is missing database_id")
        names.append(database_name.strip())
        if "cloudflare" in database_id.lower() or "မရှိသေး" in database_id:
            placeholder_targets.append(env_name)

    if len(set(names)) != len(EXPECTED_ENVIRONMENTS):
        fail("dev, staging, and prod must have distinct D1 database_name values")

    docs = DATABASE_DOC.read_text(encoding="utf-8")
    migration_files = sorted(MIGRATIONS.glob("*.sql"))
    if not migration_files:
        fail("No SQL migration files found.")

    prefixes = defaultdict(list)
    observed_destructive = set()
    for path in migration_files:
        if not path.read_text(encoding="utf-8").strip():
            fail(f"Empty migration file: {path.name}")
        match = re.match(r"^(\d+)_", path.name)
        if not match:
            fail(f"Migration filename must start with a numeric prefix: {path.name}")
        prefixes[match.group(1)].append(path.name)
        # Strip full-line and inline SQL comments, then inspect complete statements.
        # Joining lines before splitting on semicolons also catches multiline SQL.
        sql_lines = []
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("--"):
                continue
            sql_lines.append(line.split("--", 1)[0])
        sql_text = "\\n".join(sql_lines)
        for statement in sql_text.split(";"):
            statement = statement.strip()
            if not statement or not DESTRUCTIVE_LINE.search(statement):
                continue
            normalized = normalize_sql(statement)
            allowed = {
                (filename, normalize_sql(sql))
                for filename, sql in ALLOWED_DESTRUCTIVE_STATEMENTS
            }
            key = (path.name, normalized)
            if key not in allowed:
                fail(f"Unreviewed destructive SQL in {path.name}: {statement}")
            observed_destructive.add(key)

    duplicates = {prefix: files for prefix, files in prefixes.items() if len(files) > 1}
    for prefix, files in duplicates.items():
        if f"both `{prefix}_` files exist" not in docs:
            fail(f"Duplicate migration prefix {prefix} is not documented in DATABASE.md")
        for filename in files:
            if filename not in docs:
                fail(f"Duplicate-prefix migration is missing from DATABASE.md: {filename}")

    expected_allowed = {
        (filename, normalize_sql(sql))
        for filename, sql in ALLOWED_DESTRUCTIVE_STATEMENTS
    }
    if observed_destructive != expected_allowed:
        missing = expected_allowed - observed_destructive
        if missing:
            fail("An allowlisted destructive statement changed or disappeared; review the allowlist deliberately.")

    print("PASS: dev/staging/prod Wrangler bindings are distinct and structurally present.")
    print(f"PASS: inspected {len(migration_files)} SQL migration files; duplicate prefixes are documented.")
    print("PASS: no unreviewed destructive SQL statements detected.")
    if placeholder_targets:
        print(
            "NOT PRODUCTION-READY: placeholder D1 database_id in environment(s): "
            + ", ".join(placeholder_targets)
        )
        print("This offline test does not verify remote D1 existence or migration history.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, OSError, tomllib.TOMLDecodeError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
