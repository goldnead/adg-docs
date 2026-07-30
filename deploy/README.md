# Deployment

`docs.adriangoldner.dev` is a static site built on the Hetzner host and served by the
existing Caddy container.

No new service, no new container, no new runtime. The site is HTML on disk.

## The chain

```
push to main
  └─ GitHub webhook  →  https://webhook.adriangoldner.com/hooks/deploy-adg-docs
      └─ wrapper in the adriangoldner-webhook container
          └─ deploy/deploy-adg-docs.sh on the host
              ├─ git reset --hard origin/main   in /opt/adg-docs
              ├─ npm ci
              ├─ npm run build                  (strict: dead links fail it)
              └─ rsync .vitepress/dist/ → /srv/adg-docs/
                  └─ Caddy file_server
```

The build happens in the repo and is only rsynced into the webroot on success, so a
failed build leaves the live site untouched. A dead internal link fails the build and
therefore aborts the deploy, which is the intended behaviour.

## Pieces

| | |
| --- | --- |
| Host | Hetzner, `157.90.224.18` |
| Repo | `/opt/adg-docs` |
| Webroot | `/srv/adg-docs` |
| Node | host Node 22 (`/usr/bin/node`) |
| Reverse proxy | `n8n-docker-caddy-caddy-1` |
| Caddyfile | `/root/n8n-docker-caddy/caddy_config/Caddyfile` |
| Deploy log | `/var/log/adg-docs-deploy.log` |
| DNS | Cloudflare zone `adriangoldner.dev` |

## First-time setup

### 1. Clone and build once

```bash
git clone git@github.com:goldnead/adg-docs.git /opt/adg-docs
bash /opt/adg-docs/deploy/deploy-adg-docs.sh
```

### 2. Mount the webroot into Caddy

Caddy runs in a container, so the webroot has to be visible inside it. In
`/root/n8n-docker-caddy/docker-compose.yml`, under the `caddy` service's `volumes`,
alongside the existing `soundsation` mount:

```yaml
      - /srv/adg-docs:/srv/adg-docs:ro
```

```bash
cd /root/n8n-docker-caddy && docker compose up -d caddy
```

### 3. Caddy site block

Append to `/root/n8n-docker-caddy/caddy_config/Caddyfile`:

```caddy
docs.adriangoldner.dev {
    root * /srv/adg-docs
    encode zstd gzip
    file_server

    # VitePress with cleanUrls: /guide/brands → /guide/brands.html
    try_files {path} {path}.html {path}/index.html

    handle_errors {
        @404 expression {err.status_code} == 404
        rewrite @404 /404.html
        file_server
    }

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }

    header /assets/* Cache-Control "public, max-age=31536000, immutable"
}
```

```bash
docker exec n8n-docker-caddy-caddy-1 caddy validate --config /etc/caddy/Caddyfile
docker exec n8n-docker-caddy-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

`/assets/*` is content-hashed by Vite, so a one-year immutable cache is safe. HTML is
left uncached deliberately, so a deploy is visible immediately.

### 4. DNS

Cloudflare, zone `adriangoldner.dev`:

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| A | `docs` | `157.90.224.18` | proxied |

Caddy obtains the certificate on the first request.

### 5. Webhook

Same pattern as the other repos on this host. The hook definition lives in
`/opt/webhook/hooks.json`; the wrapper it calls runs
`deploy/deploy-adg-docs.sh` on the host.

**Why a host-side script:** the webhook container runs as uid 1000 and has no `git`
and no Node. The other deploys on this host solve it the same way — the container-side
wrapper does the minimum and the real work happens on the host.

Then add the webhook in GitHub → repo → Settings → Webhooks, pointing at
`https://webhook.adriangoldner.com/hooks/deploy-adg-docs`, content type
`application/json`, with the secret from `hooks.json`.

## Deploying by hand

```bash
bash /opt/adg-docs/deploy/deploy-adg-docs.sh
tail -f /var/log/adg-docs-deploy.log
```

## Troubleshooting

**Push does not deploy.** `docker logs adriangoldner-webhook | grep adg-docs`. A
GitHub delivery can return 200 while the wrapper failed silently — that is the exact
failure mode that hid a broken `gldnr.studio` deploy for a while.

**A page 404s but exists.** The `try_files` line is what maps `cleanUrls` paths to
`.html` files. Check it is present in the site block.

**The build fails on a dead link.** Working as intended. Fix the link; the live site
is untouched in the meantime.

**Stale content after a deploy.** HTML is served uncached, so this is Cloudflare's
edge cache. Purge the zone, or check you did not add a `Cache-Control` header for
HTML.

**Assets 404 after a deploy.** `rsync --delete` replaces the whole tree atomically
enough for a static site, but a browser holding an old HTML page will ask for old
hashed asset names. A reload fixes it; it is not a deploy problem.
