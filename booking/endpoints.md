# Endpoints and Cal.com setup

<AddonHeader />

An endpoint is a configured funnel: a handle, a secret, and the URL that follows from them.

```
POST https://example.com/!/statamic-booking/<handle>
```

One route serves all of them. The handle in the path selects the configured funnel, and
with it the secret.

## One endpoint per funnel

A free consultation and a paid lesson are different things: different Cal.com event types,
different secrets, usually different consequences in your listeners.

```php
// config/statamic-booking.php
'endpoints' => [
    'beratung' => ['secret' => env('BOOKING_SECRET_BERATUNG')],
    'unterricht' => ['secret' => env('BOOKING_SECRET_UNTERRICHT')],
],
```

They are configuration rather than separate controllers, and separate rather than one
endpoint with a switch inside, for two reasons:

- **One leaked secret does not open the others.** A secret shared with a form-builder, a
  freelancer or a staging environment stays scoped to one funnel.
- **`$booking->endpoint` is on every row**, so a listener can tell a paid lesson from a
  free chat without parsing the title.

The handle must match `[A-Za-z0-9_-]+`. Anything else does not route.

## The secret is not optional

**An endpoint with no secret refuses every request**, with a 401 and a line in the log.

That is a deliberate design decision and not a bug to work around. An unverified booking
webhook is an open write endpoint: anyone who guesses the URL can insert appointments,
including ones with somebody else's name and address on them. "The site has not been
configured yet" must not mean "anyone may post here", so it fails closed.

The practical consequence: on a fresh install, before you set the environment variable,
every real Cal.com delivery is refused. That is the intended state, and it is the first
thing to check when nothing arrives.

## Setting Cal.com up

**Settings → Webhooks → New**:

| Field | Value |
| --- | --- |
| Subscriber URL | `https://example.com/!/statamic-booking/beratung` |
| Secret | the same string as the endpoint's `secret` |
| Event triggers | see below |

### Which triggers to subscribe to

| Trigger | Subscribe when | What the addon does |
| --- | --- | --- |
| `BOOKING_CREATED` | always | Creates the row, status `booked`, dispatches `BookingMade` |
| `BOOKING_RESCHEDULED` | always | Updates time and status, dispatches `BookingRescheduled` |
| `BOOKING_CANCELLED` | always | Stamps `cancelled_at`, dispatches `BookingCancelled` |
| `BOOKING_REQUESTED` | the event type needs confirming | Records with status `requested`. **No event** |
| `BOOKING_REJECTED` | the event type needs confirming | Stamps `cancelled_at` with status `rejected`, dispatches `BookingCancelled` |

::: warning Confirmation-required event types need all five
Subscribe to only the first three on an event type that requires confirmation and two
things go wrong. A booking awaiting confirmation never reaches your site at all, and a
request the organiser **declines** stays on `booked` forever — an appointment in
`{{ bookings }}` that will never happen.
:::

Any other trigger is answered **200 and ignored**. A trigger this addon does not handle is
not an error on Cal.com's side, and answering anything else makes it retry forever.

## How a delivery is verified

Every request runs the same gauntlet before a single row is written:

1. **Is the handle configured?** No → **404**. A handle is a name, not a secret; pretending
   otherwise buys nothing and makes a typo undebuggable.
2. **Is a secret set?** No → **401**.
3. **Is the signature header present?** No → **401**.
4. **Is the configured algorithm real?** No → **401**, rather than a 500 from a typo
   reaching `hash_hmac()`.
5. **If a timestamp header is configured:** is it numeric and within tolerance? No → **401**.
6. **Does the HMAC match?** Compared with `hash_equals()`, in constant time. No → **401**.

A plain `===` would leak the position of the first wrong byte through timing, which is
enough to forge a digest given patience.

### The refusal reason goes to the log, not to the caller

All six failures answer the same 401 with the same body. Someone probing the endpoint
learns only that it refused; you learn which one it was:

```
[statamic-booking] refused a delivery on [beratung]: signature does not match
```

The reasons are, verbatim: `no secret configured for this endpoint`, `missing signature
header`, `unknown signature algorithm [x]`, `missing or unreadable timestamp`, `timestamp
outside tolerance`, `signature does not match`.

### A valid signature over a different body is refused

The digest is computed over the **raw request body**, not over a re-encoded array. That is
the forgery a naive check lets through: taking a real signature from one delivery and
attaching it to a payload you wrote yourself.

## Replay is the one thing a signature cannot fix

A signature proves *who* wrote the body. Only a timestamp proves *when*. Without one,
whoever has ever seen a valid delivery — a proxy log, a mirrored request, an exported HAR —
can send it again next year and it will still verify.

**Cal.com sends no timestamp today.** Said plainly rather than implied: this endpoint is
signature-authentic but not replay-proof.

What limits the damage is that a replay is, by definition, a delivery you already
processed. `(endpoint, external_id)` is unique, so a replayed `BOOKING_CREATED` writes
nothing and dispatches nothing. A replayed `BOOKING_CANCELLED` finds a row that is already
cancelled and does the same. The rate limit bounds the volume. What a replay could still
do is re-apply an *older* reschedule over a newer one.

If your provider does send a timestamp:

```php
'signature' => [
    'header' => 'X-Signature',
    'timestamp_header' => 'X-Signature-Timestamp',
    'tolerance_seconds' => 300,
],
```

The timestamp is then **signed together with the body** as `timestamp.body` — Stripe's
scheme — and deliveries outside the tolerance are refused.

::: danger Checking an unsigned timestamp header would be theatre
Whoever replays a captured delivery simply writes the current time into a free header.
Signing `timestamp.body` is what makes the freshness claim as hard to forge as the body
claim, and it is why setting `timestamp_header` for a provider that does not sign the
timestamp the same way refuses every delivery instead of quietly weakening the check.
:::

## The rate limit

`rate_limit` is per minute, per IP, default 60, answered as **429** when exceeded. Raise it
before wiring up a funnel that can burst.

## Why the route drops CSRF

The route removes Laravel's request-forgery middleware. The caller is a server, not a
browser: it has no session and no token, and it authenticates with an HMAC signature, which
is a stronger proof than a session token and the only one a provider can give. Left in
place, `PreventRequestForgery` answers every real delivery with a **419** before the
signature is ever consulted.

::: warning A test suite cannot see a 419
`PreventRequestForgery::handle()` returns early under `runningUnitTests()`, so a fully green
suite says nothing about whether a live endpoint 419s. The addon therefore excludes **four**
class names, not one: in Laravel 12 and 13 the `web` group registers `PreventRequestForgery`
and `VerifyCsrfToken` is its *subclass*, and `Router::resolveMiddleware()` removes only what
is a subclass of the excluded class — never the parent. Excluding the subclass alone leaves
the check standing. The addon's test asserts the gathered middleware list rather than making
a request, for exactly this reason.
:::

## Verifying a live endpoint

Test the refusal as carefully as the acceptance. An endpoint that accepts everything looks
identical to a working one from the happy path alone:

```bash
# wrong signature → 401
curl -i -X POST https://example.com/!/statamic-booking/beratung \
  -H 'Content-Type: application/json' \
  -H 'X-Cal-Signature-256: nope' \
  -d '{"triggerEvent":"BOOKING_CREATED","payload":{"uid":"test-1"}}'

# unknown handle → 404
curl -i -X POST https://example.com/!/statamic-booking/does-not-exist -d '{}'
```

Then make a real booking in Cal.com and confirm it appears under **Utilities → Bookings**.

A correctly signed delivery whose trigger this addon does not map answers
`200 {"recorded":false}`. That is a healthy answer, not a failure — see
[Reference](/booking/reference#responses).
