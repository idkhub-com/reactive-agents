#!/usr/bin/env bash
#
# Brings up the Postgres + PostgREST pair that the Supabase half of the
# end-to-end suite runs against.
#
# The libSQL half needs nothing: an embedded file is created on demand. Supabase
# is migrated by the `migrations` compose service rather than on first request,
# so it has to exist before the app server starts. This reuses the services
# already defined in docker-compose.yml instead of redeclaring them, so the
# suite exercises the same Postgres image, the same init script and the same
# migration runner that a real deployment does.
#
# Starting `postgrest` pulls in its dependencies through `depends_on`: Postgres
# comes up, the health check passes, the one-shot migration runner completes,
# and only then does PostgREST start.
#
# Usage: scripts/e2e-postgres.sh up|down|url
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

# Podman is a drop-in here and is what a Linux workstation is likely to have.
if docker compose version > /dev/null 2>&1; then
  compose=(docker compose)
elif podman compose version > /dev/null 2>&1; then
  compose=(podman compose)
elif command -v docker-compose > /dev/null 2>&1; then
  compose=(docker-compose)
else
  echo "ERROR: neither docker compose nor podman compose is available." >&2
  echo "The Supabase half of the e2e suite needs one of them; the libSQL half" >&2
  echo "runs without any container runtime (pnpm test:e2e)." >&2
  exit 1
fi

# Host port that docker-compose.yml maps PostgREST's :3000 to.
url="http://127.0.0.1:3001"

case "${1:-up}" in
  up)
    echo "==> Starting Postgres and PostgREST (${compose[*]})"
    "${compose[@]}" up -d postgrest

    echo "==> Waiting for PostgREST on $url"
    for _ in $(seq 1 60); do
      if [ "$(curl -s -o /dev/null -w '%{http_code}' -m 5 "$url/" || true)" = "200" ]; then
        echo "    PostgREST is up."
        exit 0
      fi
      sleep 1
    done

    echo "ERROR: PostgREST did not become ready." >&2
    "${compose[@]}" logs postgrest >&2 || true
    "${compose[@]}" logs migrations >&2 || true
    exit 1
    ;;
  down)
    echo "==> Stopping Postgres and PostgREST"
    # `-v` so the next run starts from a freshly migrated database rather than
    # inheriting rows from the last one.
    "${compose[@]}" down -v
    ;;
  url)
    echo "$url"
    ;;
  *)
    echo "Usage: $0 up|down|url" >&2
    exit 1
    ;;
esac
