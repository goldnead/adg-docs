# Troubleshooting

<AddonHeader />

Almost everything here is answered by one line in `laravel.log`. The endpoint deliberately
tells the caller nothing about *why* it refused, and writes the reason on your side instead:

```bash
grep statamic-booking storage/logs/laravel.log
```

## Nothing arrives at all

Work down the list; it is ordered by how often each one is the answer.

1. **Is the secret set?** An endpoint whose `secret` is empty refuses every request. On a
   fresh install, before the environment variable exists, that is every delivery. The log
   line says `no secret configured for this endpoint`.
2. **Does the URL match the handle?** `/!/statamic-booking/beratung` needs
   `endpoints.beratung` in the config. A mismatch answers 404, and the log says nothing —
   404 is decided before verification.
3. **Is `config:cache` stale?** If the endpoint was added after the last
   `php artisan config:cache`, the application does not know about it. Run it again.
4. **Is the site reachable from the outside?** Cal.com posts to a public URL. A local
   development URL, an IP allowlist or basic auth in front of the site all end the story
   before the addon sees anything.
5. **Are the right triggers subscribed in Cal.com?** A subscription to only
   `BOOKING_CREATED` on a confirmation-required event type produces nothing until the
   organiser confirms.

## Every delivery answers 401

The log line names which of the six checks failed. The three common ones:

**`no secret configured for this endpoint`** — the endpoint's `secret` resolves to an empty
string. Usually an environment variable that is not set in the environment the web process
actually runs in, or a `config:cache` from before it was.

**`signature does not match`** — the secret in Cal.com and the secret in your environment
are different strings. Check for a trailing newline or a quoted value in `.env`; both are
invisible and both change the digest.

It can also mean something is rewriting the body in transit. The digest is computed over the
**raw** body, so a proxy that re-serialises JSON, strips whitespace or fixes encoding breaks
verification while leaving the payload apparently identical.

**`missing signature header`** — `signature.header` does not match what the provider sends.
The default is `X-Cal-Signature-256`.

## Every delivery answers 401 after I set `timestamp_header`

Set it back to `null` unless your provider signs the timestamp together with the body.

Naming a header the provider does not send produces `missing or unreadable timestamp` on
every delivery. And even when the header exists, the addon signs `timestamp.body` — Stripe's
scheme — so a provider that signs only the body will now mismatch. **Cal.com sends no
timestamp**, so on Cal.com this key belongs on `null`.

## The endpoint answers 419

The route removes Laravel's request-forgery middleware, so this should not happen. If it
does, something in your application is adding CSRF protection back — a global middleware, a
route-level group, or a package that pushes onto the `web` group.

Note that a green test suite proves nothing here: `PreventRequestForgery::handle()` returns
early under `runningUnitTests()`. Hit the real URL with `curl` to find out.

## The endpoint answers 429

Over `rate_limit`, which is 60 per minute per IP by default. Raise it in the config; the
limiter is named and resolved per request, so no `route:clear` is needed.

If a single Cal.com retry storm is hitting the limit, the underlying problem is usually that
deliveries are failing and being retried — look for 500s first.

## `{"recorded": false}` with a 200

The signature was valid and nothing was written. Two causes:

- **An unmapped trigger.** Five triggers are handled; anything else is accepted and ignored
  on purpose, so the provider does not retry forever.
- **No `payload.uid`.** Without the provider's own id there is nothing to be idempotent
  about, and recording it anyway would mean a redelivery creates a second booking.

## A booking is in the database but not on the site

`{{ bookings }}` shows **upcoming** bookings only: not cancelled, not `requested`, and
`scheduled_at` in the future. Any of those excludes it.

The one that surprises people is `requested`. A booking on a confirmation-required event
type is recorded but is not an appointment yet, so it is deliberately kept out. It appears
once the organiser confirms and `BOOKING_CREATED` arrives.

A booking whose `scheduled_at` is null — Cal.com sent a time the addon could not parse — is
also excluded, because it has no time to compare. It does show in the Control Panel under
the **upcoming** filter, which is where unresolved things belong.

## The template prints one empty row

Every Statamic tag pair parses its block once with `no_results` set when the result is
empty. Use the `no_results` form:

```antlers
{{ bookings }}
    {{ if no_results }}
        <li>Nothing yet.</li>
    {{ else }}
        <li>{{ scheduled_at format="d.m.Y H:i" }}</li>
    {{ /if }}
{{ /bookings }}
```

## The tag does not give me the name

It never will. The Antlers tags carry `id`, `endpoint`, `scheduled_at`, `timezone`,
`duration_minutes` and `status`, and nothing else — not the name, not the address, and not
the title, because Cal.com's default title contains the booker's name.

Anything else comes from the model, in a template you control the visibility of, or from the
Control Panel screen behind the `access bookings utility` permission.

## A listener does not run

- **Is it registered?** These are plain Laravel events; nothing about them is
  Statamic-specific.
- **Is this a redelivery?** A repeated `BOOKING_CREATED` or a repeated cancellation
  dispatches nothing at all, by design.
- **Is it a `requested` booking?** No event is dispatched for those.
- **Is it a reschedule that arrived after a cancellation?** Nothing is dispatched, and
  nothing is changed.

## A listener runs twice

For `BookingRescheduled`, that is expected on a redelivery: the reschedule path has no
already-applied marker and dispatches whether or not the times differ. Guard the listener:

```php
if (! $event->booking->wasChanged('scheduled_at')) {
    return;
}
```

For `BookingMade` and `BookingCancelled` it should not happen, and if it does the cause is
usually two listeners registered for the same event rather than two dispatches.

## A reschedule created a second booking

The handle changed. `(endpoint, external_id)` is the unique key, so renaming an endpoint
after the first booking orphans every existing row: the reschedule no longer matches
anything and inserts a new one.

Renaming a handle after go-live has no safe path in the addon. Either put the old name back,
or update the `endpoint` column on the affected rows yourself.

## Deliveries are slow, then Cal.com retries

Events are dispatched synchronously inside the webhook request, so a listener that talks to
a third party makes the delivery as slow as that third party. When it times out, Cal.com
sees a failure and retries — and the retry dispatches nothing, so the work never happens.

Queue the listener.

## The Control Panel screen is blank or shows "Something went wrong"

The published bundle is stale or missing. Republish it:

```bash
php artisan vendor:publish --tag=statamic-booking --force
```

This is what an update without a republish looks like: the screen was built from newer
sources than the JavaScript on disk.

## The Bookings entry is not in the Utilities menu

The `access bookings utility` permission is missing for that user. Statamic registers it
along with the utility, under Utilities in the permission list.

If the entry is missing for a superuser too, the addon did not boot — check that the package
is actually installed and that `php please addons:discover` has run.

## The screen says "No bookings yet" although one exists

That empty state is driven by whether **any** booking exists at all, not by whether the
current search found one. If it appears while rows are in the table, the query the screen
runs is seeing an empty table — most often a second database, for example a console command
pointed at a different connection than the web process.

A fruitless *search* looks different: the list is empty, the search box stays visible, and
no empty state appears.

## `prune` deletes nothing

- `keep_days` is `null`. The command warns and exits successfully.
- Nothing is old enough. `keep_days` is 730 days by default, which is two years.
- Nothing schedules the command. The addon does not register it on Laravel's scheduler; if
  you never call it, it never runs.

## Migration fails: table `bookings` already exists

The table name is unqualified on purpose, and it is a name another package or an earlier
project may already have taken. There is no prefix option.

Publish the migration and rename the table in your own copy:

```bash
php please vendor:publish --tag=statamic-booking-migrations
```

Then set `protected $table` on a model of your own, or rename the pre-existing table. Note
that the addon's model is hard-coded to `bookings` through Eloquent's default, so renaming
the addon's table means the addon can no longer find it — the pre-existing table is the one
that has to move.

## Still stuck

The addon writes one warning line per refused delivery and nothing else. If the log is
silent and Cal.com reports a failure, the request never reached the addon: check the web
server, the firewall and the URL before the configuration.

[Support](/guide/support).
