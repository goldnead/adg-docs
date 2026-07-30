#!/usr/bin/env bash
#
# Deploy adg-docs on the Hetzner host.
#
# Called by the GitHub webhook wrapper, and safe to run by hand:
#   bash /opt/adg-docs/deploy/deploy-adg-docs.sh
#
# Builds into a temporary directory and only swaps it into place on success, so a
# failed build leaves the live site untouched.

set -euo pipefail

REPO="${ADG_DOCS_REPO:-/opt/adg-docs}"
WEBROOT="${ADG_DOCS_WEBROOT:-/srv/adg-docs}"
LOG="${ADG_DOCS_LOG:-/var/log/adg-docs-deploy.log}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== deploy start ==="

cd "$REPO"

log "git pull"
git fetch --quiet origin main
git reset --hard --quiet origin/main
log "now at $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

log "npm ci"
npm ci --no-audit --no-fund --silent

log "npm run build"
# The build is strict: a dead internal link fails it, and we want that to abort the
# deploy rather than publish a half-linked site.
npm run build

DIST="$REPO/.vitepress/dist"
if [ ! -f "$DIST/index.html" ]; then
    log "FAIL: no index.html in $DIST — refusing to publish"
    exit 1
fi

log "publish → $WEBROOT"
mkdir -p "$WEBROOT"
# --delete removes pages that no longer exist; the trailing slash matters.
rsync -a --delete "$DIST/" "$WEBROOT/"

log "=== deploy ok ($(find "$WEBROOT" -name '*.html' | wc -l) pages) ==="
