# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=private-media-config
```

Sixteen keys in `config/private-media.php`, nine of them with an environment variable. There is
no settings screen.

| Key | Default | What happens when it is wrong |
| --- | --- | --- |
| `source.container` | `'private'` (`PRIVATE_MEDIA_CONTAINER`) | A container that does not exist answers every request with `storage_unavailable`. |
| `source.disk` | `null` (`PRIVATE_MEDIA_DISK`) | Only read when no container is set. |
| `routes.enabled` | `false` (`PRIVATE_MEDIA_ROUTES_ENABLED`) | Off, the route does not exist and the tag renders nothing. |
| `routes.prefix` | `'private-media'` (`PRIVATE_MEDIA_ROUTE_PREFIX`) | Links made before a change point at the old prefix. |
| `routes.middleware` | `['web']` | Without whatever puts the user on the request, every request is `unauthenticated`. |
| `routes.throttle` | `'300,1'` (`PRIVATE_MEDIA_THROTTLE`) | Too tight, a seeking player gets 429s. |
| `routes.guard` | `null` | The auth guard the tag and the route ask; `null` is the default guard. |
| `links.ttl` | `240` (`PRIVATE_MEDIA_LINK_TTL`) | Shorter than a video, a seek after expiry is refused. |
| `delivery.strategy` | `'auto'` (`PRIVATE_MEDIA_STRATEGY`) | `redirect` on a disk without temporary URLs refuses everything. |
| `delivery.temporary_url_ttl` | `60` (`PRIVATE_MEDIA_TEMPORARY_URL_TTL`) | Minutes the provider's URL stays valid after a redirect. |
| `delivery.chunk_size` | `8192` | Bytes read per chunk when streaming, with a floor of 1024. |
| `audit.enabled` | `true` | Off, nothing is written to the table. The events still fire. |
| `audit.table` | `'private_media_access_log'` | Read by the migration; change it before migrating. |
| `audit.log_ranges` | `false` | On, every range request of a playback gets a row. |
| `audit.retention_days` | `90` | What `private-media:prune` keeps. |
| `entitlements.subject_type` | `null` (`PRIVATE_MEDIA_SUBJECT_TYPE`) | Must match the type the grants were written with, or every request is `no_access`. |

## `source`

```php
'source' => [
    'container' => env('PRIVATE_MEDIA_CONTAINER', 'private'),
    'disk' => env('PRIVATE_MEDIA_DISK'),
],
```

Where private media lives. With a container, every requested path is looked up in it, so
nothing outside the container can be served, whatever the URL says. Without a container,
`disk` names a Laravel filesystem disk directly, and the path is checked against the disk
alone. The tag then accepts only plain paths, not assets or `container::path` ids.

Either way the disk must not be publicly reachable. See
[Installation](/private-media/installation).

## `routes`

```php
'routes' => [
    'enabled' => (bool) env('PRIVATE_MEDIA_ROUTES_ENABLED', false),
    'prefix' => env('PRIVATE_MEDIA_ROUTE_PREFIX', 'private-media'),
    'middleware' => ['web'],
    'throttle' => env('PRIVATE_MEDIA_THROTTLE', '300,1'),
    'guard' => null,
],
```

The route is `GET /{prefix}/{resource}/{path}`, named `private-media.show`.

**`enabled`** is off by default: a site turns it on once the container and the access rules
are in place. The switch is read where the route is registered. With the route switched off,
`{{ private_media:url }}` and `PrivateMedia::url()` return nothing, because there is no route to
sign. On a site that caches its routes, the cache decides: rebuild it after changing the switch.

**`prefix`** is the first URL segment. Leading and trailing slashes are trimmed.

**`middleware`** must include whatever puts the signed-in user on the request: `web` for a
session. **`guard`** picks the auth guard both the tag and the route use.

**`throttle`** is Laravel's `throttle:` argument, requests and minutes, keyed by user or IP. A
player asks for a video in several byte ranges and again on every seek, so keep it generous.
`null` or an empty string switches it off.

## `links.ttl`

How long a link stays valid, in minutes. The tag's `ttl` parameter overrides it per link.
Pick a value longer than your longest video: a player that seeks after expiry is refused as
`expired`, and a page reload makes a new link.

## `delivery`

```php
'delivery' => [
    'strategy' => env('PRIVATE_MEDIA_STRATEGY', 'auto'),
    'temporary_url_ttl' => (int) env('PRIVATE_MEDIA_TEMPORARY_URL_TTL', 60),
    'chunk_size' => 8192,
],
```

| `strategy` | What happens |
| --- | --- |
| `auto` (default) | Local disks are streamed by this app, with byte ranges. Disks that make temporary URLs (S3 and compatible) get a 302 to one. Anything else is streamed. |
| `stream` | Always through this app. |
| `redirect` | Always a temporary URL. A disk that cannot make one is refused with `storage_unavailable`. |

A local disk is streamed under `auto` even when it can sign URLs: Laravel's own local file
serving answers without byte ranges, and a video that cannot seek is worse than one that goes
through the app.

`temporary_url_ttl` is how long the provider's URL stays valid after the redirect. Past that
the player gets its error from the provider, not from here; a reload makes a new one.

**Remote disks and `stream`.** Flysystem has no ranged read, so streaming from S3 and similar
reads a range by skipping forward from byte 0. Every seek into a long video then pulls
everything before it from the bucket. For remote disks keep `auto` or set `redirect`; `stream`
is meant for local disks.

### Byte ranges

When streaming, one range per request is honoured:

| `Range` | Answer |
| --- | --- |
| none, not `bytes=`, unparseable | 200, whole file |
| `bytes=0-3`, `bytes=6-` | 206 with `Content-Range` |
| `bytes=-500` (suffix) | 206, the last 500 bytes (the whole file if shorter) |
| end past the file | 206, clamped to the last byte |
| start after end (`bytes=5-2`) | 200, whole file (an invalid spec is ignored, RFC 9110) |
| start at or past the size, `bytes=-0` | 416 with `Content-Range: bytes */size` |
| several ranges (`bytes=0-1,4-5`) | 200, whole file (no multipart) |

## `audit`

```php
'audit' => [
    'enabled' => true,
    'table' => 'private_media_access_log',
    'log_ranges' => false,
    'retention_days' => 90,
],
```

What is written, and what is left out, is on
[Audit trail and pruning](/private-media/audit).

## `entitlements.subject_type`

```dotenv
PRIVATE_MEDIA_SUBJECT_TYPE=user
```

The subject type a user is looked up under in Entitlements when the user is not an Eloquent
model. Unset, it is the auth model's morph class when Statamic's users live in Eloquent, and
`user` when they are flat files. See
[Access and entitlements](/private-media/access#how-a-user-becomes-a-subject).
