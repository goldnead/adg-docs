# Configuration

<AddonHeader />

```bash
php please vendor:publish --tag=statamic-booking-config
```

Everything lives in `config/statamic-booking.php`. There is no Control Panel settings
screen and no environment override beyond what you write into the file yourself: five keys
is not enough to justify a second place to look.

## `endpoints`

One entry per booking funnel. Empty on purpose — an addon cannot know which funnels a site
runs.

```php
'endpoints' => [
    'beratung' => [
        'secret' => env('BOOKING_SECRET_BERATUNG'),
        'label' => 'Free first conversation',
    ],
    'unterricht' => [
        'secret' => env('BOOKING_SECRET_UNTERRICHT'),
        'label' => 'Paid lesson',
    ],
],
```

| Key | Required | Means |
| --- | --- | --- |
| the array key | yes | The **handle**: the last URL segment, and a column on every row |
| `secret` | yes | The shared secret, matching the one entered in Cal.com |
| `label` | no | A note to whoever opens this file. Nothing reads it |

`label` is documented here because it appears in the shipped example, not because it does
anything. It is not shown in the Control Panel and it is not stored on a booking.

::: danger Do not rename a handle after the first booking
The handle is part of the unique key `(endpoint, external_id)` and sits in every stored
row. Rename it and every existing booking is orphaned: the old rows keep the old handle,
new deliveries insert fresh rows, and a reschedule of an old booking creates a second one
instead of updating the first.
:::

## `signature`

```php
'signature' => [
    'header' => 'X-Cal-Signature-256',
    'algorithm' => 'sha256',
    'timestamp_header' => null,
    'tolerance_seconds' => 300,
],
```

| Key | Default | What happens when it is wrong |
| --- | --- | --- |
| `header` | `X-Cal-Signature-256` | A wrong name means every delivery is refused as unsigned |
| `algorithm` | `sha256` | An unknown value is refused cleanly rather than raising a 500 |
| `timestamp_header` | `null` | Without one, a captured delivery can be replayed forever. Naming a header your provider does not send refuses every delivery |
| `tolerance_seconds` | `300` | Too tight and clock drift refuses real deliveries; too loose and a replay window opens |

Both `header` and `algorithm` are configurable because a second provider with the same
shape should not need a second addon.

**`timestamp_header` is null because Cal.com sends no timestamp.** Read
[Replay is the one thing a signature cannot fix](/booking/endpoints#replay-is-the-one-thing-a-signature-cannot-fix)
before you set it; it changes what is signed, not just what is checked.

## `rate_limit`

```php
'rate_limit' => 60,
```

Per minute, per IP. The endpoint writes rows, so it needs a brake even though a valid
signature is required to write anything. Exceeding it answers **429**.

It is registered as a **named limiter**, not baked into the route as `throttle:60,1`. An
inline value is frozen by `route:cache`, so raising the limit after an incident would need
a cache clear nobody remembers. This one resolves per request.

## `keep_days`

```php
'keep_days' => 730,
```

How old an appointment may be before `php please booking:prune` deletes it. **Null keeps
every name and address forever**, which is the opposite of data minimisation, and the
command says so rather than quietly deleting nothing.

Nothing runs `prune` for you. See [What it stores](/booking/storage#retention).

## What is not configurable

- **Which triggers are handled.** Five Cal.com triggers are mapped; anything else is
  answered 200 and ignored. See [Reference](/booking/reference#triggers).
- **What `requested` means.** It is recorded and it is not upcoming. There is no switch
  that promotes an unconfirmed request to an appointment.
- **Whether a cancellation deletes the row.** It never does.
- **Site scoping.** Bookings are not site-scoped. A booking is an appointment with a
  person, not a piece of content, and it does not become a different appointment when read
  from another site.
