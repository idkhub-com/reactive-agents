#!/bin/sh
set -e

echo "Starting migration runner..."

# Database connection helper
run_sql() {
  psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

# Wait for PostgreSQL to be ready
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "PostgreSQL is ready. Running migrations..."

# Acquire advisory lock to prevent concurrent migration runs
# Lock ID 12345 is arbitrary but consistent for this migration system
echo "Acquiring migration lock..."
lock_acquired=$(run_sql -tAc "SELECT pg_try_advisory_lock(12345)")

if [ "$lock_acquired" != "t" ]; then
  echo "ERROR: Another migration process is already running. Exiting."
  exit 1
fi

# Ensure lock is released on exit
cleanup() {
  echo "Releasing migration lock..."
  run_sql -c "SELECT pg_advisory_unlock(12345)" > /dev/null 2>&1 || true
}
trap cleanup EXIT

# Create migrations tracking tables if they don't exist
run_sql <<EOSQL
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS failed_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  error_message TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
EOSQL

# Get list of migration files sorted by name
MIGRATION_DIR="/migrations"
failed=0
failed_migration=""

for migration in $(find "$MIGRATION_DIR" -name "*.sql" -type f | sort); do
  filename=$(basename "$migration")

  # Validate filename format (only alphanumeric, underscore, hyphen, dot)
  case "$filename" in
    *[!a-zA-Z0-9._-]*)
      echo "ERROR: Invalid migration filename: $filename"
      exit 1
      ;;
  esac

  # Check if migration has already been applied
  applied=$(run_sql -tAc "SELECT COUNT(*) FROM schema_migrations WHERE version = '$filename'")

  if [ "$applied" -eq 0 ]; then
    echo "Applying migration: $filename"

    # Capture error output
    error_file=$(mktemp)

    # Run migration in a transaction for safety
    if run_sql -v ON_ERROR_STOP=1 2>"$error_file" <<EOSQL
BEGIN;
\i $migration
INSERT INTO schema_migrations (version) VALUES ('$filename');
COMMIT;
EOSQL
    then
      echo "Applied: $filename"
      rm -f "$error_file"
    else
      # Migration failed - record the failure
      error_msg=$(cat "$error_file" | head -c 1000 | sed "s/'/''/g")
      rm -f "$error_file"

      echo ""
      echo "=========================================="
      echo "ERROR: Migration failed: $filename"
      echo "=========================================="
      echo "$error_msg"
      echo ""

      # Record failed migration for debugging
      run_sql -c "INSERT INTO failed_migrations (version, error_message) VALUES ('$filename', '$error_msg')" 2>/dev/null || true

      # Show rollback status
      echo "Transaction was automatically rolled back."
      echo "The database state is unchanged from before this migration."
      echo ""
      echo "To fix:"
      echo "  1. Review the error message above"
      echo "  2. Fix the migration file: $filename"
      echo "  3. Re-run migrations"
      echo ""

      failed=1
      failed_migration="$filename"
      break
    fi
  else
    echo "Skipping (already applied): $filename"
  fi
done

if [ "$failed" -eq 1 ]; then
  echo "Migration process stopped due to failure in: $failed_migration"
  exit 1
fi

echo ""
echo "All migrations complete!"
