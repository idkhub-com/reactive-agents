#!/usr/bin/env bash
#
# Builds the all-in-one image and checks that the container serves both halves.
#
# The API and the dashboard share one process now, and that static-serving path
# runs in neither `pnpm dev` (wrangler for the API, vite for the dashboard) nor
# the unit tests. The built image is the only place it executes, so without this
# a break in it would first appear in a published release.
#
# Usage: scripts/check-container-image.sh
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

image="${IMAGE_TAG:-super-agents:ci}"
port="${CONTAINER_PROBE_PORT:-3999}"
name="${CONTAINER_NAME:-super-agents-smoke}"
base="http://localhost:$port"
failures=0

cleanup() {
  docker rm -f "$name" > /dev/null 2>&1 || true
}
trap cleanup EXIT

# check <description> <expected> <actual>
check() {
  if [ "$2" = "$3" ]; then
    printf '    ok   %s (%s)\n' "$1" "$3"
  else
    printf '    FAIL %s -- expected %s, got %s\n' "$1" "$2" "$3"
    failures=$((failures + 1))
  fi
}

# status <path> -> HTTP status code
status() {
  curl -s -o /dev/null -w '%{http_code}' -m 15 "$base$1" || echo "000"
}

# content_type <path> -> leading mime type
content_type() {
  curl -s -o /dev/null -w '%{content_type}' -m 15 "$base$1" | cut -d';' -f1
}

start_container() {
  cleanup
  docker run -d --name "$name" -p "$port:3000" "$@" "$image" > /dev/null

  for _ in $(seq 1 60); do
    if [ "$(status /health)" = "200" ]; then
      return 0
    fi
    sleep 1
  done

  echo "ERROR: container did not become healthy." >&2
  docker logs "$name" >&2 || true
  exit 1
}

echo "==> Building $image"
docker build -t "$image" "$repo_root"
echo

echo "==> Starting container (dashboard enabled)"
start_container
echo "    container is up."
echo

echo "==> Dashboard"
check "GET /health"        "200"       "$(status /health)"
check "GET / status"       "200"       "$(status /)"
check "GET / type"         "text/html" "$(content_type /)"
# A client-side route has no file behind it; it must fall back to index.html.
check "GET /agents status" "200"       "$(status /agents)"
check "GET /agents type"   "text/html" "$(content_type /agents)"
echo

echo "==> Hashed assets"
asset="$(curl -s -m 15 "$base/" | grep -o '/assets/[A-Za-z0-9._-]*\.js' | head -1)"
if [ -z "$asset" ]; then
  echo "    FAIL could not find a hashed asset referenced by index.html"
  failures=$((failures + 1))
else
  check "GET $asset" "200" "$(status "$asset")"
  cache="$(curl -s -o /dev/null -D- -m 15 "$base$asset" \
    | tr -d '\r' | awk -F': ' 'tolower($1)=="cache-control"{print $2}')"
  check "$asset is immutable" "public, max-age=31536000, immutable" "$cache"
fi
echo

echo "==> API"
# The API must answer under /v1 rather than falling through to the SPA. This
# path is the one `commonVariablesMiddleware` skips, so it is the case that
# would silently return index.html if the fallback were ordered wrongly.
check "GET /v1/super-agents/nope status" "404" \
  "$(status /v1/super-agents/nope)"
check "GET /v1/super-agents/nope type" "application/json" \
  "$(content_type /v1/super-agents/nope)"
echo

echo "==> Security headers"
headers="$(curl -s -o /dev/null -D- -m 15 "$base/" | tr -d '\r' | tr 'A-Z' 'a-z')"
for header in x-frame-options x-content-type-options x-xss-protection; do
  if printf '%s' "$headers" | grep -q "^$header:"; then
    printf '    ok   %s present\n' "$header"
  else
    printf '    FAIL %s missing\n' "$header"
    failures=$((failures + 1))
  fi
done
echo

echo "==> Gateway-only mode (SERVE_DASHBOARD=false)"
start_container -e SERVE_DASHBOARD=false
check "GET /health" "200" "$(status /health)"
check "GET / (dashboard off)" "404" "$(status /)"
check "GET /v1/super-agents/nope" "404" "$(status /v1/super-agents/nope)"
echo

if [ "$failures" -gt 0 ]; then
  echo "Container image check FAILED ($failures problem(s))." >&2
  docker logs "$name" >&2 || true
  exit 1
fi

echo "Container image OK."
