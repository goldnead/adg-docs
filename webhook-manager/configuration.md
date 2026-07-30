# Configuration

<AddonHeader />

```bash
php please vendor:publish --tag=webhook-manager-config
```

Thirteen sections. The ones you are most likely to change are `retry`, `logging`,
`alerts` and `http`.

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
    'strategy' => 'exponential',        // none | linear | exponential
    'max_attempts' => 3,
    'base_delay_seconds' => 30,
    'max_delay_seconds' => 3600,
    'retry_on_status' => [408, 425, 429, 500, 502, 503, 504],
    'retry_on_network_errors' => true,
],
```

These are **defaults**; each webhook can override its own retry policy.

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

Applied by `webhook-manager:prune`, which is scheduled daily.

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

::: tip 60 requests a minute is a real limit
An ESP delivering a burst of bounce notifications can exceed it. Raise it before
wiring up a high-volume provider, and see
[Inbound endpoints](/webhook-manager/inbound).
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
