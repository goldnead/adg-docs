# Troubleshooting

<AddonHeader />

## Nothing is delivered, and no delivery record appears

If there is no `Delivery` row at all, the pipeline never got that far. In order:

1. **Is the hook enabled?** The circuit breaker disables a hook after 10 consecutive
   terminal failures and never re-enables it.
2. **Do the conditions match?** Conditions are evaluated before anything is queued, so
   a non-match leaves no trace.
3. **Is the trigger scoped past your event?** An `entry.published` hook scoped to
   `blog` will not fire for `pages`.
4. **Is a brand current?** In multi-brand mode a console command or worker with no
   brand sees no hooks.
5. **Is the module on?** `features.outbound` must be `true`.
6. **Is Automations doing it instead?** If both addons are installed, check both.

`php please webhook-manager:health` prints what the addon can see.

## A record appears but stays `queued`

No queue worker. The addon is queue-first by design.

```bash
php artisan queue:work
```

If you set `WEBHOOK_MANAGER_QUEUE_NAME`, the worker has to be told about that queue:

```bash
php artisan queue:work --queue=webhooks,default
```

## Retries do not happen, or happen immediately

The retry schedule is implemented as delayed jobs. With `QUEUE_CONNECTION=sync` there
is no delay mechanism at all, so a 30-second base delay cannot be honoured.

Also check `retry.max_attempts` and whether the response status is in
`retry_on_status` — a `422` is deliberately not retried, because retrying an unchanged
request against a validation error is noise.

## An inbound endpoint returns 419

CSRF. The route runs through the `web` middleware group, and an external POST has no
session and no token.

The shipped route handles this with `withoutMiddleware(ValidateCsrfToken::class)`. If
you see a 419, either you are on a version before 1.0.1 or the route is your own.

::: warning Your tests cannot see this
Laravel's CSRF middleware skips itself in unit tests, so a green suite proves nothing
here. Test with `curl` against a running server.
:::

## An inbound endpoint returns 401 for a valid request

For an HMAC verifier, in order of likelihood:

1. **The signature was computed over a parsed body.** Use the raw body. Key order and
   whitespace change on re-serialisation, and the HMAC will never match.
2. **The clock is out.** `timestamp_tolerance_seconds` is 300. Fix the clock rather
   than widening the tolerance.
3. **The header names differ.** Yours must match `security.signature_header` and
   `security.timestamp_header`, or theirs must be configured here.
4. **It is a genuine replay.** A signature already seen within
   `replay_protection_ttl_seconds` is rejected.

For a static-header verifier, check that the secret is actually set. An endpoint
created before its secret existed is deliberately left **disabled**.

## An inbound endpoint intermittently returns 429

`inbound.rate_limit_per_minute` is 60. An ESP delivering a burst of bounce
notifications after a campaign exceeds that easily, and from their side it looks like
your endpoint being down.

Raise it before wiring up a high-volume provider.

## The signature is always wrong on the receiving end

See point 1 above. It is almost always the raw body.

```php
$expected = hash_hmac('sha256', $request->getContent(), $secret);
hash_equals($expected, $signatureFromHeader);
```

## A token renders empty

Three causes:

1. **The namespace is not available for that trigger.** `{{ entry:title }}` on a
   `form.submitted` hook resolves to nothing, silently.
2. **A typo in the namespace.** Unknown namespaces resolve to empty rather than
   throwing.
3. **The field handle is wrong**, or the field is a group and you need the nested path.

**Webhooks → Debug** renders a template against a real record without sending
anything, which answers all three in one look.

## The rendered payload is invalid JSON

A token inside a quoted string value is escaped for JSON. A token used as a structural
element is not:

```json
{ "count": "{{ entry:count }}" }     // "42" — fine
{ "count": {{ entry:count }} }       // 42, and broken when the field is empty
```

Keep tokens inside quoted values. Where a destination insists on a real number, a
custom variable resolver is the clean answer.

## The env var for the storage driver does nothing

A driver choice made in **Settings → Storage** is persisted under `storage/` and
**takes precedence over the config file and the environment variable**. Change it in
the CP, or clear the persisted choice.

## A delivery says success but the destination disagrees

The success evaluator decided it was fine. Some destinations return `200` with
`{"ok": false}`, and the default evaluator believes the status code.

Register a custom success evaluator rather than trying to express this in retry
config. See [Extending](/webhook-manager/extending#a-custom-success-evaluator).

## A hook fires twice

Both this addon and Automations are wired to the same event and destination. Both
configurations are individually correct, which is why the failure is silent.

Symptom: two identical deliveries milliseconds apart, one in the delivery list and one
in an automation run log. Delete whichever you did not mean to keep. See
[Boundaries](/guide/boundaries).

## A custom trigger or action does not appear

1. **Registered in `register()` instead of `boot()`.** Statamic boots addon providers
   first, so the registries only exist by `boot()`.
2. **Wrapped in `app->booted()`.** Statamic already calls `bootAddon()` inside one, so
   nesting fires immediately and is still too early.
3. **Handle collision.** A handle matching a built-in **replaces** it rather than
   adding, so your registration may have silently taken over an existing entry, or
   been taken over by one.

## A CP screen is blank, or `ViteManifestNotFoundException`

Assets were never published.

```bash
php artisan vendor:publish --tag=webhook-manager-config
php artisan statamic:install
```

Statamic publishes addon assets from a `statamic:install` hook in
`post-autoload-dump`. Without it, nothing publishes. On a cold Docker build the hook
needs `CACHE_STORE=array` and an existing SQLite file.

## The deliveries table is enormous

Pruning is scheduled, so this means no scheduler is running:

```bash
php artisan schedule:work
```

Or run it once and then fix the scheduler:

```bash
php please webhook-manager:prune
```

Also check `logging.mode`. `full` stores every byte of every body, which is a
debugging setting, not a production one.

## Secrets are visible in the repository

You are on the flat driver, and hook secrets are stored with the hook. See
[Storage drivers](/webhook-manager/storage#secrets-in-git). Removing them now is a
history rewrite, not a delete; rotate the secrets as well.
