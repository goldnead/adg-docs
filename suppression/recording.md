# Recording and releasing

<AddonHeader />

The gate answers. This is the write side.

## Recording what a provider told you

```php
use Goldnead\Suppression\Facades\Suppression;
use Goldnead\Suppression\Reasons;

Suppression::suppress($email, Reasons::HARD_BOUNCE, [
    'source' => 'resend',
    'provider' => 'resend',
    'provider_event_id' => $payload['data']['email_id'],
]);
```

Pass `provider_event_id` whenever the provider gives you one. It becomes the event's
`dedupe_key`, which is unique, so the same webhook delivered twice writes one event instead of
two.

### The reasons

| Constant | Value |
| --- | --- |
| `Reasons::HARD_BOUNCE` | `hard_bounce` |
| `Reasons::INVALID_EMAIL` | `invalid_email` |
| `Reasons::SOFT_BOUNCE_THRESHOLD` | `soft_bounce_threshold` |
| `Reasons::PROVIDER_IMPORT` | `provider_import` |
| `Reasons::COMPLAINT` | `complaint` |
| `Reasons::MANUAL` | `manual` |

Which of these cross a brand boundary is [a separate question](/suppression/brands).

## Soft bounces are counted, not acted on

A single soft bounce is a full mailbox or a greylisting server, not a dead address. Record it
and let the package decide:

```php
Suppression::recordSoftBounce($email, ['provider' => 'resend']);
Suppression::recordDelivery($email);
```

`recordSoftBounce()` returns a `Suppression` only when the run inside the window trips the
threshold, and `null` every other time. `recordDelivery()` resets the window, which is what
stops a mailbox that fails on Monday and succeeds every day after from accumulating its way to
a block over a year.

```php
'soft_bounce' => [
    'threshold' => 5,      // SUPPRESSION_SOFT_BOUNCE_THRESHOLD
    'window_days' => 30,   // SUPPRESSION_SOFT_BOUNCE_WINDOW_DAYS
],
```

::: tip Call `recordDelivery()` even though nothing appears to happen
It writes no suppression and returns nothing, so it is easy to leave out. Without it the window
only ever fills, and the threshold stops meaning "five failures in a row" and starts meaning
"five failures ever".
:::

## Releasing

Suppressions are **released, not deleted**. `released_at` keeps the record and the event log
keeps the reasoning, so "blocked → released by X on D because R → blocked again" stays readable
in full.

```php
Suppression::release($email);
```

### Complaints are the exception

`release()` **throws** `ComplaintReleaseRefused` for a complaint. Mailing somebody who pressed
the spam button is the one failure mode here with regulatory exposure, so it has a separate,
deliberate path:

```php
Suppression::releaseComplaint($email, $actor, $reason);
```

It requires an actor and a stated reason clearing `suppression.release.min_reason_length`
(default 20 characters), and it writes the state change and the audit event in **one
transaction**. A release that cannot be logged does not happen — that is
`IncompleteAuditTrail`, and it is a feature.

The point is not to make the release impossible. It is to make it impossible *by accident*, and
provable afterwards.

::: danger The actor is not a form field
Take it from the authenticated request or the console, never from user input, because a form
field is the attacker's to fill in. Store a stable id, not a display name — a display name
changes and an audit trail should not.
:::

## From the console

```bash
php artisan suppression:suppress --email=… --reason=hard_bounce
php artisan suppression:release  --email=… --reason="…"
php artisan suppression:release  --email=… --reason="…" --force   # a complaint
```

`--reason` is optional for an ordinary release and mandatory for a complaint. `--force` is the
console's `releaseComplaint()`: without it a complaint release is refused outright, and with it
the 20-character minimum on `--reason` applies. `--actor` defaults to the OS user.

## Reading the history

```php
Suppression::find($email);          // current state, or null
Suppression::historyFor($email);    // the append-only event log
```

`suppression_events` refuses updates and deletes at the model level, so the history is what
actually happened rather than what somebody later wished had happened.
