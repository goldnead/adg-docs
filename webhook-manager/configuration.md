# Configuration

<AddonHeader />

```bash
php please vendor:publish --tag=webhook-manager-config
```

Thirteen sections. The ones you are most likely to change are `retry`, `logging`,
`alerts` and `http`.

Most of that file can also be changed in the Control Panel, where it takes precedence — see
[Settings in the Control Panel](#settings-in-the-control-panel) below before you go looking
for a value on the server.

## Settings in the Control Panel

Under **Settings → Addon Settings**, with the `manage webhook settings` permission, 32 fields
are editable: modules, retry policy, HTTP defaults, inbound limits, signature headers, logging
and retention.

::: warning Moved in 2.8.0
The screen used to be this addon's own, with its own table `webhook_settings`. It is now one
section on the shared screen every addon in the suite registers with, provided by
`goldnead/statamic-brand-context` 1.12 or newer — see
[Addon settings](/brand-context/settings). The old URL redirects, the permission name is
unchanged, and an upgrade migration carries your stored values across. Nothing to do by hand
beyond `php artisan migrate`.

`webhook_settings` is left in place for one minor version so a rollback keeps its values.

Moved with it: the deployment-owned values, the resolved config tree with its secrets masked,
and the storage-driver switch are now on the **Debug** screen. None of the three was a setting.
:::

### Only the difference is stored

One row per changed key in the `brand_settings` table, applied over the config at boot.

- **A value set back to what the file says deletes its row again.** The shipped defaults keep
  moving with the package instead of being frozen the day somebody first opened the screen.
- **An install that never opens the screen behaves exactly as before.**
- **The values are brand-scoped** since 2.8.0, unlike the table they replaced. Be deliberate
  about that on a multi-brand install: a timeout or a feature toggle that differs per brand
  means one queue worker applying different rules depending on whose delivery it happened to
  pick up.

The screen, the validation and the boot-time override all read one definition
(`Support\Settings`), which is the point of the rewrite: the read-only version kept its own
list of labels **and its own copy of every default**, so it was a second description of the
config file that could disagree with it — and did.

### What is editable

| Group | Keys |
| --- | --- |
| Modules | `features.outbound`, `.inbound`, `.rules`, `.templates`, `.debug_tools` |
| Retry defaults | `retry.strategy`, `max_attempts`, `base_delay_seconds`, `max_delay_seconds`, `retry_on_status`, `retry_on_network_errors` |
| HTTP defaults | `http.timeout_seconds`, `connect_timeout_seconds`, `follow_redirects`, `max_redirects`, `user_agent`, `verify_ssl` |
| Inbound limits | `inbound.max_payload_kb`, `rate_limit_per_minute`, `replay_protection_ttl_seconds` |
| Signatures | `security.default_hash_algorithm`, `signature_header`, `timestamp_header`, `timestamp_tolerance_seconds`, `mask_secrets_in_ui` |
| Delivery logging | `logging.mode`, `partial_bytes`, `mask_headers`, `mask_payload_keys` |
| Retention | `pruning.deliveries_after_days`, `pruning.logs_after_days` |
| Debug | `debug.expose_full_response_in_dev` |

### What is not, and why

| Not offered | Because |
| --- | --- |
| Everything from `env()`: the whole `queue`, `alerts` and `circuit_breaker` blocks | The deployment owns them, and `WEBHOOK_MANAGER_ALERT_SLACK_URL` is a credential with no business in a database backup. `alerts.mail.recipients` is the *result* of parsing a comma-separated env string, so a stored override would have a shape the file never has. |
| `inbound.route_prefix`, `legacy_route_prefixes`, `middleware` | Read while the routes are registered, and frozen by `route:cache`. A changed prefix would print endpoint URLs that answer 404 until somebody clears the route cache — a failure with no visible cause. `middleware` is class names on top of that. |
| `retry.schedule` | Read before the addon boots. A control that takes effect only after the next deploy is worse than no control. |
| `storage.driver` | Switched through the storage panel on the same screen, which **moves** the stored configuration with it. A second, silent switch would strand the config in the old store. |
| `event_triggers` | Closures and class strings. That is code. |
| `security.hash_algorithms` | A property of PHP and of the signing code, not an operator's choice. Which of them is the **default** is editable. |

The env-provided values are still shown, read-only, so nobody has to guess what is active:
queue connection and name, circuit breaker, alerts and their recipients, the inbound URL
prefix. The chat alert webhook is reported only as configured or not set, never printed.

### The diagnostics block masks credentials

At the foot of the screen the resolved config tree is printed, so an operator can see what
the install actually loaded. **Secrets in it are masked server-side**, before the page is
built — not hidden by the browser.

Matching is by key **name**, as a case-insensitive substring, over `secret`, `token`,
`password`, `passwd`, `api_key`, `apikey`, `webhook_url`, `private_key` and `credential`. A
key added next year that is called `secret` is covered without anybody remembering to add
it. The flag is inherited downwards, so `webhook_urls => [a, b]` is covered exactly like a
single value, and everything nested under a matched key goes with it. A masked value keeps
its first and last four characters — enough to tell two credentials apart, not enough to use
one. Anything eight characters or shorter is replaced outright.

::: danger This is why it matters
Before 2.2.0 the chat alert URL stood in that block in clear text, and that URL **is** the
password: whoever holds it writes into the channel. It went into screenshots, into shared
screens and into every front-end error report.
:::

### `config:cache` is safe

The overrides are deliberately **not** applied while `config:cache` builds its file. Baking
them in would let an override outlive the row it came from — a deleted setting would keep
working until the next `config:clear` — and the next boot would read the baked value as the
shipped default, so a value reset to the file's would count as a difference and be stored
instead of deleted. The cached file carries the file's values; each process lays its
overrides over them at its own boot.

## `features`

Each toggle hides a module's CP screens, navigation entries **and** runtime wiring,
so you can run the addon as outbound-only without uninstalling anything.

```php
'features' => [
    'outbound' => true,
    'inbound' => true,
    'rules' => true,
    'templates' => true,
    'debug_tools' => true,
],
```

Turning `debug_tools` off in production is a reasonable default: it removes the
screens that render raw payloads.

## `storage`

```php
'storage' => [
    'driver' => env('WEBHOOK_MANAGER_DRIVER', 'eloquent'),  // eloquent | flat
    'flat' => [
        'path' => env('WEBHOOK_MANAGER_FLAT_PATH', base_path('content/webhooks')),
    ],
],
```

Governs where **configuration** lives. Delivery records and logs are runtime
telemetry and always live in the database.

::: warning A CP choice outranks this
Switching the driver in **Settings → Storage** persists a choice under `storage/`
that **takes precedence over the config and env default**. If the env var says one
thing and the CP says another, the CP wins. Worth knowing before you spend an hour
on it. See [Storage drivers](/webhook-manager/storage).
:::

## `queue`

```php
'queue' => [
    'connection' => env('WEBHOOK_MANAGER_QUEUE_CONNECTION'),
    'name' => env('WEBHOOK_MANAGER_QUEUE_NAME', 'default'),
    'sync_in_console' => false,
],
```

`sync_in_console` runs deliveries inline in console commands. Useful for a seeding
or import script where you want the delivery to have happened by the time the
command exits; not something to leave on.

## `retry`

```php
'retry' => [
    'schedule' => true,
    'strategy' => 'exponential',        // none | linear | exponential
    'max_attempts' => 3,
    'base_delay_seconds' => 30,
    'max_delay_seconds' => 3600,
    'retry_on_status' => [408, 425, 429, 500, 502, 503, 504],
    'retry_on_network_errors' => true,
],
```

All but `schedule` are **defaults**; each webhook can override its own retry policy.

`schedule` puts `webhook-manager:dispatch-retries` on Laravel's scheduler, every
minute. That command is what actually *runs* the retries the planner writes, so
leaving it on is the normal setup; turn it off only if you drive the command yourself.

::: danger Your site still needs a `schedule:run` cron
`schedule => true` registers the command. It cannot start the cron entry that drives
the scheduler. Without one, retries never run, and because the attempts are never
exhausted, no failure alert fires and the circuit breaker never counts. See
[Installation](/webhook-manager/installation#retries-need-the-scheduler).
:::

The status list is deliberate: 4xx codes other than 408, 425 and 429 mean *you* are
wrong, and retrying an unchanged request against a 400 or a 422 is just noise. If
your destination signals a transient failure with a non-standard code, add it here.

## `logging`

```php
'logging' => [
    'mode' => 'partial',           // full | partial | none
    'partial_bytes' => 4096,
    'mask_headers' => ['authorization', 'x-api-key', 'x-auth-token', 'cookie', 'set-cookie'],
    'mask_payload_keys' => ['password', 'secret', 'token', 'api_key', 'apikey'],
],
```

`partial` keeps the first 4 KB of each body, which is almost always enough to debug
a failure and bounds the table's growth. `full` is for a debugging session, not for
production with large payloads.

Masking applies in the Control Panel; reading unmasked bodies is the separate
`view sensitive payloads` permission. Add your own keys here — the defaults catch
the obvious names, not your field called `kundennummer`.

## `pruning`

```php
'pruning' => [
    'deliveries_after_days' => 30,
    'logs_after_days' => 60,
],
```

Applied by `webhook-manager:prune`. Unlike the retry dispatcher, this command is
**not** put on the scheduler for you — add it to your own `routes/console.php` with
`Schedule::command('webhook-manager:prune')->daily()`.

## `inbound`

```php
'inbound' => [
    'route_prefix' => 'webhooks/inbound',
    'legacy_route_prefixes' => ['!/webhooks/inbound'],
    'middleware' => [SubstituteBindings::class],
    'max_payload_kb' => 512,
    'rate_limit_per_minute' => 60,
    'replay_protection_ttl_seconds' => 600,
],
```

`middleware` is the **complete** stack of the inbound route, not a list appended to
`web`. Putting `web` back adds CSRF validation to an endpoint that external senders
call without a token, and every delivery starts failing with a 419.

`legacy_route_prefixes` keeps senders configured against a pre-1.8.0 release routable.
Empty it once none are left.

`replay_protection_ttl_seconds` is how long a seen signature is remembered, so a
captured request cannot be resent.

`rate_limit_per_minute` is enforced as the first step of the inbound pipeline, before
the method allowlist and before authentication. It counts per endpoint, answers 429
with `Retry-After`, and puts `X-RateLimit-Limit` and `X-RateLimit-Remaining` on every
response. A single endpoint overrides it with `{"per_minute": N}` in its rate-limit
config; `0` disables throttling. The legacy prefix shares the counter, so it is not a
way around the limit.

::: tip 60 requests a minute is a real limit
An ESP delivering a burst of bounce notifications can exceed it. Raise it before
wiring up a high-volume provider, and see
[Inbound endpoints](/webhook-manager/inbound#the-rate-limit).
:::

## `security`

```php
'security' => [
    'hash_algorithms' => ['sha256', 'sha512'],
    'default_hash_algorithm' => 'sha256',
    'signature_header' => 'X-Webhook-Signature',
    'timestamp_header' => 'X-Webhook-Timestamp',
    'timestamp_tolerance_seconds' => 300,
    'mask_secrets_in_ui' => true,
],
```

The two header names are what the addon **sends** on outbound HMAC requests and
expects on inbound ones. Change them to match a counterparty that insists on its
own names.

`timestamp_tolerance_seconds` guards against replay: a request whose timestamp is
more than five minutes out is rejected. If a counterparty's clock is off, fix the
clock rather than widening this.

## `http`

```php
'http' => [
    'timeout_seconds' => 15,
    'connect_timeout_seconds' => 5,
    'follow_redirects' => true,
    'max_redirects' => 3,
    'user_agent' => 'Statamic-Webhook-Manager/1.0',
    'verify_ssl' => true,
],
```

::: danger Leave `verify_ssl` on
Turning it off to get past a self-signed certificate on a staging endpoint also
turns it off for every production destination, because this is a global setting.
Add the certificate to your trust store instead.
:::

## `alerts`

```php
'alerts' => [
    'enabled' => env('WEBHOOK_MANAGER_ALERTS', true),
    'throttle_minutes' => (int) env('WEBHOOK_MANAGER_ALERT_THROTTLE', 15),
    'mail' => [
        'enabled' => env('WEBHOOK_MANAGER_ALERT_MAIL', true),
        'recipients' => /* WEBHOOK_MANAGER_ALERT_EMAILS, comma-separated */,
    ],
    'slack' => [
        'webhook_url' => env('WEBHOOK_MANAGER_ALERT_SLACK_URL'),
    ],
],
```

Alerts fire on **terminal** failure — after the retries are exhausted — and are
throttled per hook.

The Slack URL accepts any Slack-compatible incoming webhook, which in practice means
Discord and Microsoft Teams work too.

## `circuit_breaker`

```php
'circuit_breaker' => [
    'enabled' => env('WEBHOOK_MANAGER_CIRCUIT_BREAKER', true),
    'threshold' => (int) env('WEBHOOK_MANAGER_CIRCUIT_THRESHOLD', 10),
],
```

After 10 consecutive terminal failures the hook is **disabled**. Re-enable it in the
CP once the destination is back; the breaker will not do it for you, deliberately,
because a hook that silently resumed after a week of failures would deliver a week
of stale events.

## `debug`

```php
'debug' => ['expose_full_response_in_dev' => true],
```

## `event_triggers`

Turn any Laravel or Statamic event class into a trigger, declaratively. Covered in
[Extending](/webhook-manager/extending#custom-event-triggers).

## Environment summary

```dotenv
WEBHOOK_MANAGER_DRIVER=eloquent
WEBHOOK_MANAGER_FLAT_PATH=
WEBHOOK_MANAGER_QUEUE_CONNECTION=
WEBHOOK_MANAGER_QUEUE_NAME=default
WEBHOOK_MANAGER_ALERTS=true
WEBHOOK_MANAGER_ALERT_MAIL=true
WEBHOOK_MANAGER_ALERT_EMAILS=ops@example.com
WEBHOOK_MANAGER_ALERT_SLACK_URL=
WEBHOOK_MANAGER_ALERT_THROTTLE=15
WEBHOOK_MANAGER_CIRCUIT_BREAKER=true
WEBHOOK_MANAGER_CIRCUIT_THRESHOLD=10
```
