#!/usr/bin/env zsh
set -euo pipefail

cat <<'USAGE'
Run Supabase migrations from the repository.

Usage:
  1) Make executable: chmod +x supabase/run_migrations.sh
  2) Run: ./supabase/run_migrations.sh

The script will prompt for DB host/user/name and password (password input is hidden).
It runs each `.sql` file found under `supabase/migrations/` in lexicographic order.
USAGE

# Prompt for connection details (support env overrides)
: ${DB_HOST:=""}
: ${DB_PORT:=5432}
: ${DB_USER:=""}
: ${DB_NAME:=""}

if [[ -z "$DB_HOST" ]]; then
  read -r "?DB host (e.g. db.xxxxxx.supabase.co): " DB_HOST
fi
if [[ -z "$DB_USER" ]]; then
  read -r "?DB user: " DB_USER
fi
if [[ -z "$DB_NAME" ]]; then
  read -r "?DB name: " DB_NAME
fi
if [[ -z "${DB_PASSWORD:-}" ]]; then
  stty -echo
  printf "DB password: "
  read -r DB_PASSWORD
  stty echo
  printf "\n"
fi

MIGRATIONS_DIR="$(dirname "$0")/migrations"
if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

echo "Running migrations from: $MIGRATIONS_DIR"

# Optionally run combined file if present
COMBINED_FILE="$(dirname "$0")/all_migrations.sql"
if [[ -f "$COMBINED_FILE" ]]; then
  echo "Found combined file: $COMBINED_FILE"
  read -r "?Run combined file instead of individual files? (y/N): " run_combined
  if [[ "$run_combined" =~ ^[Yy]$ ]]; then
    echo "Running $COMBINED_FILE"
    PGPASSWORD="$DB_PASSWORD" psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" -f "$COMBINED_FILE"
    echo "Done."
    exit 0
  fi
fi

# Run individual migration files in lexicographic order
for sql in "$MIGRATIONS_DIR"/*.sql; do
  [[ -e "$sql" ]] || break
  echo "\n--- Running: $sql ---"
  if ! PGPASSWORD="$DB_PASSWORD" psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" -f "$sql"; then
    echo "Error: migration failed: $sql" >&2
    exit 1
  fi
done

echo "All migrations ran successfully."
