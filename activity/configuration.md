# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=activity-config
```

## `enabled` and `source`

```php
'enabled' => env('ACTIVITY_ENABLED', true),
'source' => env('ACTIVITY_SOURCE', env('APP_NAME')),
```

`enabled => false` makes every `record()` a no-op. Useful in a test suite, and useful as a kill switch.

`source` is stamped on every row. Set it explicitly on a multi-service install so a fact recorded by your
nightly import is distinguishable from one recorded by the web app, without either having to say so.

## `queue`

```php
'queue' => [
    'enabled' => env('ACTIVITY_QUEUE', false),
    'connection' => env('ACTIVITY_QUEUE_CONNECTION'),
    'queue' => env('ACTIVITY_QUEUE_NAME'),
    'unique_for' => 3600,
],
```

Off by default, and that default is right for most sites: `record()` is one indexed insert, and doing it
inline keeps the request context available.

Turn it on if you record on a hot path, then use `Activity::recordLater()`.

`unique_for` is the window in which an identical queued write is deduplicated at the job level — a second
layer on top of the two idempotency keys, guarding against a burst of identical dispatches.

::: warning Context is captured at dispatch, not in the worker
The actor and the request context are captured when you call `recordLater()`. By the time the job runs
there is no request, no session, and in multi-brand mode no current brand.

This is not something you can work around from the worker side; it is why the capture happens where it
does.
:::

## `context`

```php
'context' => [
    'capture' => env('ACTIVITY_CAPTURE_CONTEXT', true),
    'utm' => true,
    'referrer' => true,
    'page_url' => true,
    'user_agent_category' => true,
],
```

What is captured from the request automatically.

`user_agent_category` stores a **coarse category** — `mobile`, `desktop`, `tablet`, `bot` — and never the
raw user-agent string. There is no setting to store the raw string, deliberately.

There is also no IP capture, at any setting. If you need a country, derive it upstream and pass it in
`properties`.

Turning `capture` off entirely is the right call for a ledger that only ever records server-side facts,
where a page URL would be misleading.

## `sanitizer`

```php
'sanitizer' => [
    'strip_keys' => [
        'password', 'token', 'secret', 'authorization', 'api_key', 'apikey',
        'credit_card', 'card_number', 'cvv', 'iban', 'bic',
    ],
    'blocked_event_types' => [],
    'max_payload_bytes' => 60000,
],
```

Runs on **every** write.

`strip_keys` are redacted **at any depth**, so a secret nested three levels into a properties array is
still caught. This is the most complete default list in the suite — it includes `iban`, `bic` and `cvv` —
and it still knows nothing about your field called `kundennummer`.

`max_payload_bytes` replaces an oversized payload with a **visible marker** rather than silently
truncating it, so a reader can tell "too much was there" from "nothing was there".

`blocked_event_types` drops whole types:

```php
'blocked_event_types' => ['hr.salary_changed'],
```

That is the enforcement point for "this domain never mirrors into a central store". For anything more
specific, bind your own `ActivitySanitizer` — returning `null` drops the activity entirely.

## `retention`

```php
'retention' => [
    'days' => env('ACTIVITY_RETENTION_DAYS'),
    'anonymize_after_days' => env('ACTIVITY_ANONYMIZE_AFTER_DAYS'),
    'per_event_type' => [
        // 'marketing.email_opened' => 90,
    ],
],
```

Both top-level values default to **unset**, and there is **no scheduled prune**. A ledger's retention
period is a policy decision, so you have to state it, and then schedule it yourself:

```php
Schedule::command('activity:prune --days=365')->weekly();
```

`per_event_type` is the important one on a busy site. `marketing.email_opened` will dominate the table long
before anything else does, and it is also the least valuable row to keep:

```php
'per_event_type' => [
    'marketing.email_opened' => 90,
    'marketing.email_clicked' => 365,
],
```

`anonymize_after_days` is usually the better lever than `days`: it strips the personal fields and keeps the
countable fact. See [Privacy & retention](/activity/privacy).

## `producers`

```php
'producers' => [
    'marketing' => env('ACTIVITY_PRODUCER_MARKETING', true),
    'leadhub' => env('ACTIVITY_PRODUCER_LEADHUB', true),
],
```

The bundled producers attach only when the sibling addon is installed, so `true` on a site without
Marketing does nothing.

Set one to `false` if you want the sibling addon installed but not mirrored — for example if its own log is
sufficient and you would rather not double the write volume.

## `cp`

```php
'cp' => [
    'enabled' => env('ACTIVITY_CP', true),
    'per_page' => 50,
],
```

The read-only inspector at **Tools → Activity**, behind `view activity`.

`enabled => false` removes the screen while continuing to record — reasonable on a production site where
the ledger is machine-read and a human browsing personal facts is not a use case you want to offer.

## Environment summary

```dotenv
ACTIVITY_ENABLED=true
ACTIVITY_SOURCE="Main site"
ACTIVITY_QUEUE=false
ACTIVITY_QUEUE_CONNECTION=
ACTIVITY_QUEUE_NAME=
ACTIVITY_CAPTURE_CONTEXT=true
ACTIVITY_RETENTION_DAYS=
ACTIVITY_ANONYMIZE_AFTER_DAYS=
ACTIVITY_PRODUCER_MARKETING=true
ACTIVITY_PRODUCER_LEADHUB=true
ACTIVITY_CP=true
```
