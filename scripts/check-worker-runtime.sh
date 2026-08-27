#!/usr/bin/env bash
#
# Verifies that the Cloudflare Workers build of the API still works.
#
# `pnpm dev:api` runs `wrangler dev`, so workerd is the runtime every developer
# uses day to day -- but nothing built or booted it outside a developer's
# machine. These two checks cover the failure modes that gap allows, and they
# catch different things:
#
#   1. `wrangler deploy --dry-run` fails on imports that cannot be bundled.
#      A driver package with native bindings (`@libsql/client` rather than
#      `@libsql/client/web`, say) resolves to its Node build and stops here.
#      It does NOT notice anything about runtime behaviour.
#
#   2. Booting workerd catches what bundling cannot: operations Workers forbid
#      at module scope -- asynchronous I/O, timers, random values. A dry run
#      exits 0 on those; workerd refuses to start.
#
# Neither check catches a `node:` builtin that workerd does not implement:
# wrangler's unenv layer substitutes a stub at bundle time, so the import
# resolves and the Worker boots. It only throws if the stub is actually called.
#
# Usage: scripts/check-worker-runtime.sh
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
api_dir="$repo_root/packages/api"

port="${WORKER_PROBE_PORT:-8799}"
inspector_port="${WORKER_INSPECTOR_PORT:-9399}"
# Any path under /v1 works as a liveness probe. An unrouted one avoids needing
# a database: reaching the API's own 404 already proves the module evaluated,
# middleware ran and Hono dispatched.
probe_path="${WORKER_PROBE_PATH:-/v1/}"
boot_timeout="${WORKER_BOOT_TIMEOUT:-90}"

workdir="$(mktemp -d)"
log="$workdir/wrangler-dev.log"
worker_pid=""

cleanup() {
  if [ -n "$worker_pid" ] && kill -0 "$worker_pid" 2>/dev/null; then
    # wrangler spawns workerd as a child, so signal the whole group.
    kill -- "-$worker_pid" 2>/dev/null || kill "$worker_pid" 2>/dev/null || true
    wait "$worker_pid" 2>/dev/null || true
  fi
  rm -rf "$workdir"
}
trap cleanup EXIT

cd "$api_dir"

echo "==> Bundling the Worker (wrangler deploy --dry-run)"
pnpm exec wrangler deploy --dry-run --outdir "$workdir/dry-run"
echo "    Worker bundles cleanly."
echo

echo "==> Booting workerd (wrangler dev) on port $port"
setsid pnpm exec wrangler dev \
  --port "$port" \
  --inspector-port "$inspector_port" \
  > "$log" 2>&1 < /dev/null &
worker_pid=$!

ready=""
for _ in $(seq 1 "$boot_timeout"); do
  if grep -q "Ready on" "$log" 2>/dev/null; then
    ready=1
    break
  fi
  if grep -qi "runtime failed to start\|Uncaught Error" "$log" 2>/dev/null; then
    break
  fi
  if ! kill -0 "$worker_pid" 2>/dev/null; then
    break
  fi
  sleep 1
done

if [ -z "$ready" ]; then
  echo "ERROR: workerd did not start." >&2
  echo "--- wrangler dev output ---" >&2
  cat "$log" >&2
  exit 1
fi
echo "    workerd started."
echo

echo "==> Probing GET $probe_path"
status="$(curl -s -o "$workdir/body" -w '%{http_code}' -m 15 \
  "http://localhost:$port$probe_path" || echo "000")"

if [ "$status" = "000" ]; then
  echo "ERROR: no HTTP response from the Worker." >&2
  echo "--- wrangler dev output ---" >&2
  cat "$log" >&2
  exit 1
fi

if [ "$status" -ge 500 ]; then
  echo "ERROR: Worker answered $status -- the runtime booted but the request failed." >&2
  echo "--- response body ---" >&2
  cat "$workdir/body" >&2
  echo >&2
  echo "--- wrangler dev output ---" >&2
  cat "$log" >&2
  exit 1
fi

echo "    Worker answered $status."
echo
echo "Worker runtime OK."
