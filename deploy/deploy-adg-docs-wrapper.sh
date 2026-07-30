#!/usr/bin/env bash
#
# Called by the GitHub webhook, from INSIDE the adriangoldner-webhook container.
#
# That container has neither git nor Node, but it does have the Docker socket — so
# the real work runs in a throwaway `node:22` container with the repo and the webroot
# bind-mounted. Same pattern as /opt/recipes/deploy-recipes-wrapper.sh, which uses
# alpine/git for the same reason.
#
# For a manual deploy on the host, use deploy-adg-docs.sh instead: the host has both
# git and Node 22 and does not need any of this.

set -uo pipefail

REPO=/opt/adg-docs
WEBROOT=/srv/adg-docs
LOG=/var/log/adg-docs-deploy.log

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

log "=== webhook deploy start ==="

# node:22 (bookworm, not -alpine) ships git, which is why it can do both halves.
docker run --rm \
    -v "$REPO":/repo \
    -v "$WEBROOT":/webroot \
    -v /root/.ssh:/root/.ssh:ro \
    -e GIT_SSH_COMMAND='ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null' \
    -w /repo \
    node:22 \
    bash -euo pipefail -c '
        git config --global --add safe.directory /repo
        git fetch --quiet origin main
        git reset --hard --quiet origin/main
        echo "at $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

        npm ci --no-audit --no-fund --silent
        npm run build

        # A dead internal link fails the build, which aborts here and leaves the
        # live site untouched. That is intended.
        test -f .vitepress/dist/index.html

        # No rsync in this image; empty the webroot then copy. The window is a few
        # hundred milliseconds on a static site.
        find /webroot -mindepth 1 -delete
        cp -a .vitepress/dist/. /webroot/
        echo "published $(find /webroot -name "*.html" | wc -l) pages"
    ' >> "$LOG" 2>&1

STATUS=$?

if [ $STATUS -eq 0 ]; then
    log "=== webhook deploy ok ==="
else
    log "=== webhook deploy FAILED (exit $STATUS) — live site untouched ==="
fi

exit $STATUS
