# Installation

<AddonHeader />

<Requirements laravel="12.40+ / 13.x" />

```bash
composer require goldnead/statamic-app-api
php artisan vendor:publish --tag=app-api-config   # optional
```

[Laravel Sanctum](https://laravel.com/docs/sanctum) 4 comes with it. For personal access tokens,
publish and run Sanctum's migration (`php artisan install:api`) and add `HasApiTokens` to your
user model; without tokens there is nothing to migrate.

`app-api:prune-exports` is scheduled hourly and deletes data exports whose download link has
expired. Make sure `php artisan schedule:run` runs on the server. See
[Queues & scheduling](/guide/queues).

## The areas and their addons

Each area has routes only when its addon is installed and `areas.<area>` is on:

| Area | Needs | Endpoints |
| --- | --- | --- |
| `session` | nothing | login, 2FA, passkeys, registration, passwords, `me`, elevation |
| `account` | [Accounts](/accounts/) | confirmation, address change, deletion, export |
| `teams` | [Teams](/teams/) | teams, members, invitations, join codes, roles |
| `access` | [Entitlements](/entitlements/) | products and quotas for user and team |
| `checkout` | [Payments](/payments/), optionally [Offers](/offers/) | order terms, checkout, portal link |
| `tokens` | Sanctum's migration, `areas.tokens = true` | personal access tokens |

On a bare Statamic site with only this addon installed, the session area and the OpenAPI
description are there, twenty routes in all.

## The SPA side

Serve the app from a domain listed in `sanctum.stateful` (env `SANCTUM_STATEFUL_DOMAINS`).
Then:

```js
axios.defaults.withCredentials = true;
axios.defaults.withXSRFToken = true;

await axios.get('/sanctum/csrf-cookie');                       // once
const { data } = await axios.post('/api/app/session/login', { email, password });
if (data.two_factor) await axios.post('/api/app/session/two-factor', { code });
const { data: { user } } = await axios.get('/api/app/me');
```

With a token instead: `Authorization: Bearer <plain_text_token>`, no CSRF cookie needed.

Typed clients come from the description of your own site:

```bash
php artisan app-api:openapi openapi.json   # only the areas active on this site; --all for every area
npx openapi-typescript openapi.json -o src/api.d.ts
```

## Permissions

| Permission | Allows |
| --- | --- |
| `view app api` | **Tools → App API** |
| `manage app api tokens` | revoke a user's tokens from that page |
| `manage app api settings` | the settings section (with Brand Context) |

## Publishable tags

| Tag | What it publishes |
| --- | --- |
| `app-api-config` | `config/app-api.php` |
| `app-api-translations` | `lang/{de,en}`, including every error message |
