#!/bin/sh
#
# Called by the GitHub webhook, from INSIDE the adriangoldner-webhook container.
#
# POSIX sh, not bash: that container is Alpine and has no bash. (The first version of
# this script used `#!/usr/bin/env bash` and the hook fired into nothing — webhook
# reported "triggered successfully" and no log line was ever written.)
#
# The container has neither git nor Node either, but it does have the Docker socket —
# so the real work runs in a throwaway `node:22` container with the repo and the
# webroot bind-mounted. Same pattern as /opt/recipes/deploy-recipes-wrapper.sh, which
# uses alpine/git for the same reason.
#
# For a manual deploy on the host, use deploy-adg-docs.sh instead: the host has both
# git and Node 22 and does not need any of this.

set -u

REPO=/opt/adg-docs
WEBROOT=/srv/adg-docs
LOG=/var/log/adg-docs-deploy.log
LOCK=/opt/adg-docs/.deploy.lock
MAX_WAIT_SECONDS=1800
SLEEP_SECONDS=5

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

log "=== webhook deploy start ==="

# --- Deploy-Sperre ---------------------------------------------------------------
# Zwei gleichzeitige Zustellungen (Doppel-Hook, GitHub-Retry, Deploy von Hand) duerfen
# nicht parallel laufen: beide Laeufe teilen sich denselben Checkout und denselben
# Webroot, und der Webroot wird zwischendurch geleert. Ein zweiter Lauf, der genau in
# dieses Fenster faellt, kopiert in ein halb geloeschtes Verzeichnis.
# Die BusyBox-flock im Webhook-Container kennt kein -w, deshalb begrenztes Warten per
# "flock -n" in einer Schleife mit Countdown (gleiches Muster wie
# /opt/recipes/deploy-recipes-wrapper.sh).
#
# Die Sperrdatei ist im Repo eingecheckt und entsteht dadurch beim Deploy von selbst:
# der Webhook laeuft als uid 1000 und kann in /opt/adg-docs (root-owned Bind-Mount)
# nichts anlegen. Weil die Datei leer ist und leer bleibt, laesst "git reset --hard" sie
# in Ruhe und die Inode bleibt ueber Deploys hinweg dieselbe.
# Fehlt sie doch einmal (z.B. nach "git clean -fdx"), wird sie angelegt, sofern das
# Verzeichnis schreibbar ist, sonst weicht die Sperre sichtbar auf /tmp aus.
if [ ! -e "$LOCK" ]; then
    ( umask 000; : > "$LOCK" ) 2>/dev/null || true
fi
if [ ! -e "$LOCK" ]; then
    LOCK=/tmp/adg-docs.deploy.lock
    log "WARN: Sperrdatei im Repo fehlt und ist nicht anlegbar — weiche auf $LOCK aus"
    log "WARN: serialisiert damit nur Laeufe im selben Container, nicht gegen Host-Laeufe"
    ( umask 000; : > "$LOCK" ) 2>/dev/null || true
fi
if [ ! -r "$LOCK" ]; then
    log "=== webhook deploy ABGEBROCHEN: Sperrdatei $LOCK nicht lesbar ==="
    exit 1
fi

# Nur lesend oeffnen: flock(2) braucht kein Schreibrecht, und die eingecheckte Datei
# gehoert root, waehrend der Webhook als uid 1000 laeuft.
exec 9<"$LOCK"

start_ts=$(date +%s)
deadline_ts=$((start_ts + MAX_WAIT_SECONDS))

while ! flock -x -n 9; do
    now_ts=$(date +%s)
    if [ "$now_ts" -ge "$deadline_ts" ]; then
        log "=== webhook deploy ABGEBROCHEN: Lock nach ${MAX_WAIT_SECONDS}s noch belegt — live site untouched ==="
        exit 1
    fi
    remaining=$((deadline_ts - now_ts))
    log "deploy lock belegt, neuer Versuch in ${SLEEP_SECONDS}s (${remaining}s Frist uebrig)"
    sleep "$SLEEP_SECONDS"
done

log "=== deploy lock acquired ($LOCK) ==="
# --- Ende Deploy-Sperre ----------------------------------------------------------

# node:22 (bookworm, not -alpine) ships git, which is why one container can do both
# halves. --network host is not needed; the default bridge reaches GitHub.
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

if [ "$STATUS" -eq 0 ]; then
    log "=== webhook deploy ok ==="
else
    log "=== webhook deploy FAILED (exit $STATUS) — live site untouched ==="
fi

exit "$STATUS"
