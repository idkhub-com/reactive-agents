#!/bin/sh
set -eu

# Generate changelog for GitHub releases using Conventional Commits
# https://www.conventionalcommits.org/
#
# Usage: ./scripts/generate-changelog.sh <current-tag> <repo-url>
# Example: ./scripts/generate-changelog.sh v1.0.0 https://github.com/owner/repo
#
# Supported commit formats (case-insensitive):
#   feat: add user authentication     (conventional)
#   feat(api): add endpoint           (with scope)
#   feat!: breaking change            (breaking)
#   FEAT: uppercase style             (uppercase)
#   [feat] add feature                (bracketed)
#   [FEAT]: add feature               (bracketed with colon)
#   Fix something                     (simple - word + space)
#
# Recognized types:
#   feat, fix      -> Features, Bug Fixes
#   perf, docs     -> Performance, Documentation
#   chore, ci, test, refactor, style, build -> Maintenance (collapsed)

CURRENT_TAG="${1:-}"
REPO_URL="${2:-}"

if [ -z "$CURRENT_TAG" ]; then
  echo "Error: Current tag is required" >&2
  echo "Usage: $0 <current-tag> [repo-url]" >&2
  exit 1
fi

# Validate tag doesn't contain dangerous characters (defense in depth)
case "$CURRENT_TAG" in
  *[\'\"\\@\$\`\;]*)
    echo "Error: Tag contains invalid characters" >&2
    exit 1
    ;;
esac

# Verify we're in a valid git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Error: Not a valid git repository" >&2
  exit 1
fi

# Get the previous tag with proper error handling
if git describe --tags --abbrev=0 "${CURRENT_TAG}^" > /dev/null 2>&1; then
  PREV_TAG=$(git describe --tags --abbrev=0 "${CURRENT_TAG}^")
  echo "Previous tag: $PREV_TAG" >&2
else
  PREV_TAG=""
  echo "No previous tag found - this is the initial release" >&2
fi

echo "Current tag: $CURRENT_TAG" >&2

# Helper function to get commits matching a type
# Supports multiple formats:
#   - feat: message       (conventional)
#   - feat(scope): msg    (conventional with scope)
#   - feat! message       (breaking)
#   - [feat] message      (bracketed)
#   - [FEAT]: message     (bracketed with colon)
#   - FEAT: message       (uppercase)
#   - Feat message        (simple prefix with space)
# Uses git's --grep which safely handles special characters in commit messages
get_commits() {
  type="$1"
  range="$2"
  # Match various formats (case-insensitive)
  git log --pretty=format:"* %s (%h)" \
    --grep="^${type}:" \
    --grep="^${type}(" \
    --grep="^${type}!" \
    --grep="^${type} " \
    --grep="^\[${type}\]" \
    --regexp-ignore-case "$range" 2>/dev/null || true
}

# Helper function to print a section if it has content
print_section() {
  title="$1"
  content="$2"
  if [ -n "$content" ]; then
    echo "### $title"
    echo "$content"
    echo ""
  fi
}

# Generate changelog to stdout
echo "## What's Changed"
echo ""

if [ -n "$PREV_TAG" ]; then
  RANGE="${PREV_TAG}..${CURRENT_TAG}"

  # Breaking changes (type!: or BREAKING CHANGE in message)
  BREAKING=$(git log --pretty=format:"* %s (%h)" \
    --grep="^[a-z]*!:" \
    --grep="^[a-z]*!(" \
    --grep="BREAKING CHANGE" \
    --grep="BREAKING:" \
    --regexp-ignore-case "$RANGE" 2>/dev/null || true)
  if [ -n "$BREAKING" ]; then
    echo "### Breaking Changes"
    echo "$BREAKING"
    echo ""
  fi

  # Features: feat, feature
  FEATURES=$(get_commits "^feat" "$RANGE")
  print_section "Features" "$FEATURES"

  # Bug Fixes: fix
  FIXES=$(get_commits "^fix" "$RANGE")
  print_section "Bug Fixes" "$FIXES"

  # Performance: perf
  PERF=$(get_commits "^perf" "$RANGE")
  print_section "Performance" "$PERF"

  # Documentation: docs
  DOCS=$(get_commits "^docs" "$RANGE")
  print_section "Documentation" "$DOCS"

  # Other changes (exclude all known types in any format)
  # We exclude: type:, type(, type!, type<space>, [type]
  OTHERS=$(git log --pretty=format:"* %s (%h)" \
    --invert-grep \
    --grep="^feat[:(! ]" --grep="^\[feat\]" \
    --grep="^fix[:(! ]" --grep="^\[fix\]" \
    --grep="^perf[:(! ]" --grep="^\[perf\]" \
    --grep="^docs[:(! ]" --grep="^\[docs\]" \
    --grep="^chore[:(! ]" --grep="^\[chore\]" \
    --grep="^ci[:(! ]" --grep="^\[ci\]" \
    --grep="^test[:(! ]" --grep="^\[test\]" \
    --grep="^refactor[:(! ]" --grep="^\[refactor\]" \
    --grep="^style[:(! ]" --grep="^\[style\]" \
    --grep="^build[:(! ]" --grep="^\[build\]" \
    --regexp-ignore-case "$RANGE" 2>/dev/null || true)
  print_section "Other Changes" "$OTHERS"

  # Maintenance (chore, ci, test, refactor, style, build) - collapsed by default
  MAINTENANCE=$(git log --pretty=format:"* %s (%h)" \
    --grep="^chore[:(! ]" --grep="^\[chore\]" \
    --grep="^ci[:(! ]" --grep="^\[ci\]" \
    --grep="^test[:(! ]" --grep="^\[test\]" \
    --grep="^refactor[:(! ]" --grep="^\[refactor\]" \
    --grep="^style[:(! ]" --grep="^\[style\]" \
    --grep="^build[:(! ]" --grep="^\[build\]" \
    --regexp-ignore-case "$RANGE" 2>/dev/null || true)
  if [ -n "$MAINTENANCE" ]; then
    echo "<details>"
    echo "<summary>Maintenance</summary>"
    echo ""
    echo "$MAINTENANCE"
    echo ""
    echo "</details>"
    echo ""
  fi

  if [ -n "$REPO_URL" ]; then
    echo "**Full Changelog**: ${REPO_URL}/compare/${PREV_TAG}...${CURRENT_TAG}"
  fi
else
  # Initial release - still categorize commits
  RANGE="$CURRENT_TAG"

  # Breaking changes
  BREAKING=$(git log --pretty=format:"* %s (%h)" \
    --grep="^[a-z]*!:" \
    --grep="^[a-z]*!(" \
    --grep="BREAKING CHANGE" \
    --grep="BREAKING:" \
    --regexp-ignore-case "$RANGE" 2>/dev/null || true)
  if [ -n "$BREAKING" ]; then
    echo "### Breaking Changes"
    echo "$BREAKING"
    echo ""
  fi

  # Features
  FEATURES=$(get_commits "feat" "$RANGE")
  print_section "Features" "$FEATURES"

  # Bug Fixes
  FIXES=$(get_commits "fix" "$RANGE")
  print_section "Bug Fixes" "$FIXES"

  # Performance
  PERF=$(get_commits "perf" "$RANGE")
  print_section "Performance" "$PERF"

  # Documentation
  DOCS=$(get_commits "docs" "$RANGE")
  print_section "Documentation" "$DOCS"

  # Other changes
  OTHERS=$(git log --pretty=format:"* %s (%h)" \
    --invert-grep \
    --grep="^feat[:(! ]" --grep="^\[feat\]" \
    --grep="^fix[:(! ]" --grep="^\[fix\]" \
    --grep="^perf[:(! ]" --grep="^\[perf\]" \
    --grep="^docs[:(! ]" --grep="^\[docs\]" \
    --grep="^chore[:(! ]" --grep="^\[chore\]" \
    --grep="^ci[:(! ]" --grep="^\[ci\]" \
    --grep="^test[:(! ]" --grep="^\[test\]" \
    --grep="^refactor[:(! ]" --grep="^\[refactor\]" \
    --grep="^style[:(! ]" --grep="^\[style\]" \
    --grep="^build[:(! ]" --grep="^\[build\]" \
    --regexp-ignore-case "$RANGE" 2>/dev/null || true)
  print_section "Other Changes" "$OTHERS"

  # Maintenance
  MAINTENANCE=$(git log --pretty=format:"* %s (%h)" \
    --grep="^chore[:(! ]" --grep="^\[chore\]" \
    --grep="^ci[:(! ]" --grep="^\[ci\]" \
    --grep="^test[:(! ]" --grep="^\[test\]" \
    --grep="^refactor[:(! ]" --grep="^\[refactor\]" \
    --grep="^style[:(! ]" --grep="^\[style\]" \
    --grep="^build[:(! ]" --grep="^\[build\]" \
    --regexp-ignore-case "$RANGE" 2>/dev/null || true)
  if [ -n "$MAINTENANCE" ]; then
    echo "<details>"
    echo "<summary>Maintenance</summary>"
    echo ""
    echo "$MAINTENANCE"
    echo ""
    echo "</details>"
    echo ""
  fi
fi
