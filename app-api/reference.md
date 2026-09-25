# Reference

<AddonHeader />

## Control Panel

**Tools → App API** (permission `view app api`) shows:

- every endpoint with method, path, what it needs, and whether it is registered on this site;
- the areas and their addons;
- the request setup: prefix, guard, middleware, team header, stateful domains, CSRF cookie;
- the error codes;
- the events, with how many automations and webhooks listen;
- the personal access tokens, which `manage app api tokens` may revoke.

## Events

Only what this addon does itself; everything else is the sibling's event.

| Event | Handle | Payload |
| --- | --- | --- |
| `TokenCreated` | `app-api.token.created` | `user {id, email}`, `token {id, name, abilities, expires_at}` |
| `TokenRevoked` | `app-api.token.revoked` | `user`, `token {id, name}`, `revoked_by` (`user` or `cp`), `actor_id` |

Both are triggers in [Automations](/automations/) (group "App API") and
[Webhook Manager](/webhook-manager/), and are written to [Activity](/activity/). No payload
carries a token.

## PHP

```php
use Goldnead\AppApi\Facades\AppApi;

AppApi::transformUserUsing(fn (array $data, $user) => $data + ['plan' => /* … */]);
```

## Middleware

| Alias | See |
| --- | --- |
| `app-api.json`, `app-api.2fa`, `app-api.ability:<area>`, `app-api.team`, `app-api.entitled:<products>`, `app-api.quota:<key>` | [Your own routes](/app-api/own-routes) |

## Rate limits

| Limiter | |
| --- | --- |
| the prefix | `routes.rate_limit` per minute, per user, per address for guests |
| `app-api-mail` | 6 per minute on endpoints that send mail |
| `app-api-checkout` | 10 per minute on starting a checkout |

## Permissions

| Permission | Allows |
| --- | --- |
| `view app api` | **Tools → App API** |
| `manage app api tokens` | revoking tokens there |
| `manage app api settings` | the settings section (with Brand Context) |

## Commands

| Command | |
| --- | --- |
| `php artisan app-api:openapi [path] [--all] [--server=]` | Writes the OpenAPI description, by default `openapi.json` in the project, for the areas active here or with `--all` for every area. |
| `php artisan app-api:prune-exports` | Deletes data exports whose link has expired. Scheduled hourly. |

## Tables

None of its own. Personal access tokens are Sanctum's `personal_access_tokens`, created by
Sanctum's migration only when tokens are used.
