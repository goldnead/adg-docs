# Storage drivers

<AddonHeader />

Webhook **configuration** can live in two places. Delivery records and logs are
runtime telemetry and **always** live in the database, whichever driver you choose.

```php
'storage' => [
    'driver' => env('WEBHOOK_MANAGER_DRIVER', 'eloquent'),  // eloquent | flat
    'flat' => [
        'path' => env('WEBHOOK_MANAGER_FLAT_PATH', base_path('content/webhooks')),
    ],
],
```

| Driver | Config lives in | Needs `migrate` |
| --- | --- | --- |
| `eloquent` (default) | database tables | yes |
| `flat` | YAML under `content/webhooks/` | yes, still — for deliveries |

What "configuration" covers: outbound webhooks, inbound endpoints, rules and payload
templates.

## Why the split

Configuration is authored, reviewed and deployed. It belongs in git next to the
blueprints and templates that reference it, and a code review should be able to show
that a webhook's destination changed.

Telemetry is high-volume, append-heavy and useless in a diff. So "flat driver" never
means "no database"; it means your *webhooks* are files and your *deliveries* are rows.

## Switching in the Control Panel

**Settings → Storage** migrates the existing config to the target store and activates
it. No `.env` access needed, which is the point: an editor on a managed host can do it.

::: warning A CP choice outranks config and env
The choice made there is persisted under `storage/` and **takes precedence over the
config file and the environment variable.** If `WEBHOOK_MANAGER_DRIVER=eloquent` and
the CP says flat, the addon uses flat.

That is a deliberate design decision — the person clicking the button should win — and
it is worth knowing before you spend an hour wondering why the env var does nothing.
:::

## Switching from the CLI

```bash
php please webhook-manager:storage:migrate --from=eloquent --to=flat --dry-run
php please webhook-manager:storage:migrate --from=eloquent --to=flat
```

Records are copied **id-for-id** either way, so a delivery that references a webhook
still references the same webhook after the move. Always run the dry run first: it
prints what would move without moving it.

Then set the driver:

```dotenv
WEBHOOK_MANAGER_DRIVER=flat
```

…unless a CP choice is already in force, in which case set it there instead.

## What the flat layout looks like

```
content/webhooks/
  outbound/
    slack-announcements.yaml
  inbound/
    esp-events.yaml
  rules/
    announcement-fanout.yaml
  templates/
    entry-envelope.yaml
```

Human-readable, diffable, and reviewable in a pull request.

## Secrets in git

::: danger This is the flat driver's real cost
Hook secrets are stored **with** the hook, which under the flat driver means inside a
YAML file that you commit. Bearer tokens, basic-auth passwords and HMAC secrets end up
in your repository history, where removing them later is a history rewrite rather than
a delete.

Two ways to avoid it:

- Keep secret-bearing hooks on the **eloquent** driver, and use flat only for hooks
  whose destination URL is the credential.
- Reference an environment variable from the hook config so the file holds a name
  rather than a value.

Decide this before you commit, not after.
:::

## Choosing

**Use `eloquent`** when hooks carry real secrets, when editors rather than developers
manage them, or when you have many of them.

**Use `flat`** when the hooks are part of the site's definition, few in number, and
you want a deploy to be able to change them. A Statamic project that keeps everything
in `content/` will want this, and it is why the driver exists.

## Multi-brand

The eloquent driver isolates by `brand_id`. The flat driver cannot isolate by a query,
so it isolates by directory:

```
content/webhooks/
  acme/outbound/…
  contoso/outbound/…
```

Files still in the un-prefixed layout are read as the **default brand's**, so a
single-brand install that later enables multi-brand keeps working. Move them when the
second brand arrives:

```bash
php artisan webhook-manager:migrate-flat-brands --dry-run
php artisan webhook-manager:migrate-flat-brands
```

It only ever moves, never overwrites, never deletes, and a second run does nothing.

::: danger Before 1.9 the flat driver had no brand concept at all
`content/webhooks/` was one undifferentiated set and every brand read every brand's
hooks. That is worse here than elsewhere: a webhook config carries a destination URL
**and the credentials it authenticates with**, so the leak handed over bearer tokens,
and firing a hook from the wrong brand posted one tenant's payload to another tenant's
endpoint. The eloquent driver scoped correctly the whole time.

If you ran `flat` with multi-brand on, upgrade, run the migration, and rotate every
token that sat in the shared directory.
:::

## After switching

Clear caches. Statamic's Stache can hold serialised state that references the old
store:

```bash
php artisan cache:clear
php artisan stache:clear && php artisan stache:warm
```

Then confirm what the addon actually thinks:

```bash
php please webhook-manager:health
```
