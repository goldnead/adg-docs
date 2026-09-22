# Reference

<AddonHeader />

## Tag

| Tag | |
| --- | --- |
| `{{ private_media:url resource="…" asset="…" ttl="…" }}` | a signed link for the signed-in user, or an empty string; see [Signed links and the tag](/private-media/links) |

## Facade

`Goldnead\PrivateMedia\Facades\PrivateMedia`, alias `PrivateMedia`.

| Method | |
| --- | --- |
| `url($user, string $resource, $asset, ?int $ttlMinutes = null): ?string` | a signed link, or `null` without a user, without the route, for an empty resource or one with a slash, or for an asset outside the source |
| `viewerToken(string $userId): string` | the token a link carries for its user; stable per user and app key |
| `pathOf($asset): ?string` | the path inside the configured container, from a path, a `container::path` id or an asset; `null` for another container or a path of the wrong shape |

## Contract

| Interface | Default binding |
| --- | --- |
| `Goldnead\PrivateMedia\Contracts\MediaAccess` | `EntitlementsMediaAccess` with Entitlements 1.3+, `ClosedMediaAccess` without; see [Access and entitlements](/private-media/access) |

## Console

| Command | |
| --- | --- |
| `php artisan private-media:prune` | deletes audit rows older than `audit.retention_days` |
| `php artisan private-media:prune --days=30` | keeps this many days instead, for this run |

## Events

| Event | Payload | When |
| --- | --- | --- |
| `Goldnead\PrivateMedia\Events\MediaServed` | `$user`, `$resource`, `$path`, `$delivery` (`stream` or `redirect`), `$opening`, `$range` | every served request; `$opening` is true for the first request of a playback |
| `Goldnead\PrivateMedia\Events\MediaRefused` | `$user`, `$resource`, `$path`, `$reason` (a `Reason` enum) | every refusal |

## Route

| Method | URL | Name | |
| --- | --- | --- | --- |
| GET | `/{prefix}/{resource}/{path}` | `private-media.show` | only with `routes.enabled`; middleware `routes.middleware` plus `throttle:{routes.throttle}` |

Query parameters on a link: `viewer`, `expires`, `signature`. The refusal codes are on
[Security notes](/private-media/security#refusal-codes).

## Table

| Table | |
| --- | --- |
| `private_media_access_log` | `user_id`, `resource`, `path`, `allowed`, `reason`, `delivery`, `range`, `ip_address`, `user_agent`, `created_at`; indexed on `user_id`, `created_at`, `resource` + `created_at`, `allowed` + `reason` |

## Configuration

| Key | Default |
| --- | --- |
| `source.container` | `'private'` (`PRIVATE_MEDIA_CONTAINER`) |
| `source.disk` | `null` (`PRIVATE_MEDIA_DISK`) |
| `routes.enabled` | `false` (`PRIVATE_MEDIA_ROUTES_ENABLED`) |
| `routes.prefix` | `'private-media'` (`PRIVATE_MEDIA_ROUTE_PREFIX`) |
| `routes.middleware` | `['web']` |
| `routes.throttle` | `'300,1'` (`PRIVATE_MEDIA_THROTTLE`) |
| `routes.guard` | `null` |
| `links.ttl` | `240` (`PRIVATE_MEDIA_LINK_TTL`) |
| `delivery.strategy` | `'auto'` (`PRIVATE_MEDIA_STRATEGY`) |
| `delivery.temporary_url_ttl` | `60` (`PRIVATE_MEDIA_TEMPORARY_URL_TTL`) |
| `delivery.chunk_size` | `8192` |
| `audit.enabled` | `true` |
| `audit.table` | `'private_media_access_log'` |
| `audit.log_ranges` | `false` |
| `audit.retention_days` | `90` |
| `entitlements.subject_type` | `null` (`PRIVATE_MEDIA_SUBJECT_TYPE`) |
