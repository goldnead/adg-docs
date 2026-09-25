# Configuration

<AddonHeader />

`config/app-api.php`, published with:

```bash
php artisan vendor:publish --tag=app-api-config
```

| Key | Default | |
| --- | --- | --- |
| `routes.prefix` | `api/app` | Every endpoint lives under it. |
| `routes.middleware` | Sanctum's `EnsureFrontendRequestsAreStateful` | Runs before this addon's own. |
| `routes.guard` | `sanctum` | What "signed in" means: session or token. |
| `routes.rate_limit` | `120` | Requests per minute per user, per address for guests. |
| `routes.openapi` | `true` | Serve `{prefix}/openapi.json`. |
| `areas.session` / `account` / `teams` / `access` / `checkout` | `true` | Switch an area off. A missing addon switches it off by itself. |
| `areas.tokens` | `false` | Personal access tokens. Off also refuses tokens handed out before (401 `tokens_disabled`). |
| `auth.registration` | `true` | `POST session/register`. |
| `auth.password_reset_url` | `null` | The app's page for a new password; the reset mail links there with `?token=`. |
| `user.fields` | `[]` | Blueprint fields added to the user object. |
| `teams.header` | `null` | The team header. Null takes Teams' `current.header` (`X-Team-ID`). |
| `checkout.idempotency_seconds` | `300` | How long the same request answers with the same checkout. |
| `checkout.return_url` | `null` | Where the provider sends the buyer back, as a path. |
| `portal.require_verified_email` | `true` | Only a confirmed address gets a portal link. |
| `export.link_minutes` | `10` | Lifetime of an export's download link. |
| `tokens.abilities` | `['*']` | What a token may ask for. See [Token abilities](/app-api/sessions#token-abilities). |
| `tokens.expires_after_days` | `null` | How long a token lives. |

The runtime values (rate limit, reset page, user fields, checkout, portal, export, token
lifetime) are also editable under **Settings → Addon settings** when
[Brand Context](/brand-context/) is installed. The route values are read when the routes load
and stay in the config file.

To change the user object:

```php
AppApi::transformUserUsing(fn (array $data, $user) => $data + ['plan' => /* … */]);
```

## Example: a team app with its own header

An app whose frontend already sends its workspace as `X-Tenant-ID`, has its own page for a new
password, and shows the user's language:

```php
// config/app-api.php
'teams' => ['header' => 'X-Tenant-ID'],
'auth' => ['password_reset_url' => '/reset-password'],
'user' => ['fields' => ['locale']],

// config/teams.php
'current' => ['fallback_to_current' => false],   // no workspace named: 422 team_required
```

```dotenv
SANCTUM_STATEFUL_DOMAINS=app.example.com
```

The frontend then sets `baseURL` to `/api/app` and sends `X-Tenant-ID` with every team request.
Its own routes use `app-api.team` and `app-api.entitled:` or `app-api.quota:`; see
[Your own routes](/app-api/own-routes).
