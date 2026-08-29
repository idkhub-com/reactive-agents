#!/usr/bin/env bash
#
# Runs the visual regression project inside the Playwright container image.
#
# Pixel comparison is only meaningful when the renderer is pinned. The fonts
# are self-hosted, so they no longer vary, but FreeType hinting and
# antialiasing still differ between distributions -- and Playwright names every
# one of them `linux`, so a baseline written on Arch and compared on Ubuntu
# reuses the same file and disagrees about pixels nobody changed. Running both
# the baseline and the comparison in one image removes that variable, and it is
# the same image the `visual` CI job runs in.
#
# The image tag must track the @playwright/test version in package.json; a
# browser build difference shifts rendering just as a font difference does.
#
# Usage:
#   scripts/e2e-visual.sh                     compare against the baselines
#   scripts/e2e-visual.sh --update-snapshots  rewrite them
set -euo pipefail

image="mcr.microsoft.com/playwright:v1.62.1-noble"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

declare -a runtime
declare -a identity

# Podman is a drop-in and is what a Linux workstation is likely to have. The
# uid handling is where they differ: rootless Podman already maps the calling
# user onto the container's root, so bind-mounted files stay writable and
# anything written back -- new baselines, the report -- is owned by the caller.
# Under Docker the container runs as real root, so the uid has to be passed in
# or the baselines come back owned by root.
if command -v docker > /dev/null 2>&1 && docker info > /dev/null 2>&1; then
  runtime=(docker)
  identity=(--user "$(id -u):$(id -g)")
elif command -v podman > /dev/null 2>&1; then
  runtime=(podman)
  identity=(--userns=keep-id)
else
  echo "Neither docker nor podman is available." >&2
  echo "The visual baselines are environment-specific, so they have to be" >&2
  echo "produced in the pinned image rather than on the host." >&2
  exit 1
fi

if [ ! -d node_modules ] || [ ! -f packages/api/dist/server.js ]; then
  echo "Building first -- the suite runs against the built app." >&2
  pnpm build
fi

# Interactive only when there is a terminal, so this works unchanged in CI.
declare -a tty_flags=()
if [ -t 1 ]; then
  tty_flags=(-t)
fi

# HOME is redirected because the container user may not own the image's home
# directory once the uid is remapped, and Playwright writes a cache there.
#
# `node_modules/.bin/playwright` rather than `npx`, which would try to reach
# the network and write to a cache of its own. Everything the run needs is
# already in the mounted workspace: linux-x64 is linux-x64, so the host's
# installed dependencies -- including libsql's native addon -- load as they are.
exec "${runtime[@]}" run --rm "${tty_flags[@]}" \
  --ipc=host \
  "${identity[@]}" \
  --volume "$repo_root":/work \
  --workdir /work \
  --env HOME=/tmp \
  --env E2E_VISUAL=1 \
  "$image" \
  node_modules/.bin/playwright test --project=visual "$@"
