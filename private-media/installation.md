# Installation

<AddonHeader />

<Requirements laravel="12.40+ / 13.x" />

```bash
composer require goldnead/statamic-private-media
php artisan migrate
```

The migration creates one table, `private_media_access_log`. Then, in `.env`:

```dotenv
PRIVATE_MEDIA_ROUTES_ENABLED=true
PRIVATE_MEDIA_CONTAINER=private
```

The route is off until the first line is there. The second names the Statamic asset container
the files live in; `private` is also the default.

::: danger The container must not be public
The container must sit on a disk **without a public URL**: a local disk under
`storage/app/private`, for example, or a bucket without public read. A public container hands
the file to anyone who guesses the path, and this addon never sees the request.
:::

## What comes with it

No other package is required. One is suggested:

| Package | Constraint | Without it |
| --- | --- | --- |
| `goldnead/statamic-entitlements` | `^1.3` (older versions conflict) | Every request is refused as `no_access`, unless you bind your own `MediaAccess`. See [Access and entitlements](/private-media/access). |

Nothing needs a queue. The prune command is the only thing worth scheduling; see
[Audit trail and pruning](/private-media/audit#pruning).

## Control Panel

None. There is no screen, no nav entry, no permission and no settings section. There is
nothing to configure per entry, and the audit table is meant for queries and reports.

## Publishable tags

| Tag | What it publishes |
| --- | --- |
| `private-media-config` | `config/private-media.php` |
| `private-media-migrations` | The migration, into `database/migrations/` |
| `private-media-translations` | The refusal messages (en, de), into `lang/vendor/private-media/` |

## Licence

MIT. No key, no licence check, no phone-home. It is an internal infrastructure package and is
not sold.
