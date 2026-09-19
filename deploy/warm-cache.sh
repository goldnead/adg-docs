#!/usr/bin/env bash
#
# Ask Cloudflare for every file we just published, once.
#
# Why this exists. Cloudflare refuses a speculative request for an object it
# does not already hold: a browser prefetch carries `Sec-Purpose: prefetch`,
# and for a cache MISS the edge answers an empty **503** with
# `cf-speculation-refused: prefetch refused: not eligible` instead of going to
# the origin. Measured on 2026-09-19: right after a deploy, one docs page
# produced 16 of those, and `/payments/` produced 47. Nothing is broken by it,
# every page and every link works, but VitePress's prefetch is the reason a
# second page opens instantly, and a refused prefetch is a feature that
# silently does not happen.
#
# Every deploy makes it worse for a while: the chunks are content-hashed, so a
# build gives every changed page a new filename and the whole set is cold
# again. On a site with this little traffic they stay cold for a long time.
#
# One GET per file turns the MISS into a HIT and the refusals stop. Verified:
# 16 refusals before, 0 after, same page, same browser.
#
# It also stops the other half of the same problem. An object requested before
# it existed leaves a cached 404 behind, and that 404 outlives the deploy. A
# GET afterwards replaces it with the real thing.
#
# Deliberately not a cache purge: that would need an API token on this host,
# and warming is the same outcome with nothing to keep secret.
set -uo pipefail

WEBROOT="${ADG_DOCS_WEBROOT:-/srv/adg-docs}"
BASE="${ADG_DOCS_URL:-https://docs.adriangoldner.dev}"
PARALLEL="${ADG_DOCS_WARM_PARALLEL:-8}"

[ -d "$WEBROOT" ] || { echo "warm: no $WEBROOT, nothing to do"; exit 0; }

# The hashed assets and the images the pages embed. Not the HTML: a page is
# cheap to render and is not what a prefetch asks for.
mapfile -t paths < <(
    cd "$WEBROOT" && find assets art screenshots -type f \
        \( -name '*.js' -o -name '*.css' -o -name '*.png' -o -name '*.svg' -o -name '*.woff2' \) 2>/dev/null
)

if [ "${#paths[@]}" -eq 0 ]; then
    echo "warm: nothing found under $WEBROOT"
    exit 0
fi

# `|| true` per request and no `set -e`: a cold cache is a slow site, never a
# failed deploy. The count below is the only thing that reports.
printf '%s\n' "${paths[@]}" \
    | xargs -P "$PARALLEL" -I{} curl -s -o /dev/null -w '%{http_code}\n' --max-time 20 "$BASE/{}" \
    | sort | uniq -c | sed 's/^/warm: /' || true

echo "warm: ${#paths[@]} file(s) requested"
