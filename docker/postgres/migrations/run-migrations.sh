#!/bin/sh
set -e

echo "Starting migration runner..."

# Wait for PostgreSQL to be ready
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "PostgreSQL is ready. Running migrations..."

# Create migrations tracking table if it doesn't exist
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<EOSQL
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
EOSQL

# Get list of migration files sorted by name
MIGRATION_DIR="/migrations"

for migration in $(find "$MIGRATION_DIR" -name "*.sql" -type f | sort); do
  filename=$(basename "$migration")

  # Check if migration has already been applied
  applied=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "SELECT COUNT(*) FROM schema_migrations WHERE version = '$filename'")

  if [ "$applied" -eq 0 ]; then
    echo "Applying migration: $filename"
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$migration"

    # Record the migration
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
      "INSERT INTO schema_migrations (version) VALUES ('$filename')"

    echo "Applied: $filename"
  else
    echo "Skipping (already applied): $filename"
  fi
done

echo "All migrations complete!"
