# Recording facts

<AddonHeader />

```php
use Goldnead\Activity\Facades\Activity;

Activity::record('commerce.purchase_completed', [
    'actor' => $user,                       // anything IdentityContext can resolve
    'subject' => $order,                    // any Eloquent model
    'dedupe_key' => 'mollie:'.$payment->id, // the fact's fingerprint
    'properties' => ['amount' => 4900, 'currency' => 'EUR', 'product' => 'kurs'],
]);
```

**Everything except the event type is optional.** Brand, actor, source and request context are filled in
automatically.

## The arguments

| Key | Type | Notes |
| --- | --- | --- |
| `actor` | `Identity` \| `ProvidesIdentity` \| `Authenticatable` \| email string | Defaults to `IdentityContext::current()` |
| `subject` | any Eloquent model | Stored as `subject_type` + `subject_id` |
| `dedupe_key` | string | The **fact's** fingerprint, per brand |
| `event_id` | string | The **physical event's** id, global |
| `properties` | array | The fact's own data. Sanitised. |
| `occurred_at` | datetime | Defaults to now. Set it when backfilling. |

## Two idempotency keys

This is the part worth reading twice.

| Key | Guards against | Scope |
| --- | --- | --- |
| `event_id` | the same *physical* event arriving twice — a webhook retry, a job retry | global |
| `dedupe_key` | the same *fact* being recorded twice — two producers, one truth | per brand |

Recording an existing fact **returns the original row and writes nothing**. This is the core guarantee:
*a producer may be as noisy as it likes.*

### When to use a dedupe key

**Use one for state transitions.** A purchase, a confirmation, a bounce, a status change. These happen
once, and if two parts of your system both notice, you want one row.

```php
'dedupe_key' => 'order:'.$order->id,           // good: a fact
'dedupe_key' => 'mollie:'.$payment->id,        // good: a fact
```

**Leave it off for repeatable facts.** An email open, a page view, a login. The second open is a second
fact, and `event_id` alone keeps retries safe.

```php
Activity::record('marketing.email_opened', [
    'subject' => $message,
    // no dedupe_key — every open is a real, separate fact
]);
```

::: danger Never write an empty-but-present dedupe key
A producer that cannot build a key must write **`null`**, never `''`.

`(brand_id, dedupe_key)` is unique, and it is deliberately not binding for rows *without* a key — those are
facts nobody asked to be deduplicated, and `event_id` holds them instead. But an empty string **is** a
value, so every event of that type in the brand would collapse onto one row.

The symptom is a ledger that stops growing for one event type while everything else works.
:::

### Choose the key from the fact, not the moment

```php
'dedupe_key' => 'order:'.$order->id,   // a fact: that order completing, forever
'dedupe_key' => 'order:'.now(),        // a moment: a retry produces a second row
```

## Recording never breaks the caller

A ledger failure is **reported and swallowed**. A broken `activities` table must never roll back the
purchase that produced the event.

The corollary: **a failed write is visible only in `laravel.log`.** If facts are missing and nothing errored,
that is where the reason is.

## Queued recording

```php
Activity::recordLater('commerce.purchase_completed', [...]);
```

::: warning The actor and the request context are captured at dispatch
Never in the worker. By the time the job runs, the request that caused it is long gone — no session, no
authenticated user, and in multi-brand mode no current brand.

This is why the capture happens where it does, and it is not something you can compensate for from the
worker side.
:::

```php
'queue' => [
    'enabled' => env('ACTIVITY_QUEUE', false),
    'unique_for' => 3600,
],
```

Queueing is off by default and that default is right for most sites: `record()` is one indexed insert.
`unique_for` deduplicates identical queued writes at the job level, as a third layer on top of the two keys.

## Sanitisation happens on write

```php
'sanitizer' => [
    'strip_keys' => [
        'password', 'token', 'secret', 'authorization', 'api_key', 'apikey',
        'credit_card', 'card_number', 'cvv', 'iban', 'bic',
    ],
    'max_payload_bytes' => 60000,
],
```

Secret-shaped keys are redacted **at any depth**. An oversized payload is replaced with a **visible marker**
rather than silently truncated, so a reader can tell "too much was there" from "nothing was there".

Add your own field names. This is the most complete default list in the suite and it still knows nothing
about `kundennummer`.

## Immutability

`activities` is append-only. Updating or deleting a row throws `ImmutableActivity`, and the retention and
anonymisation commands are the only paths that lift the guard.

**Correct a wrong fact by recording a correcting one.** A ledger you can quietly edit is not a ledger.

## Backfilling

```php
Activity::record('commerce.purchase_completed', [
    'occurred_at' => $order->created_at,      // not now
    'dedupe_key' => 'order:'.$order->id,      // makes the backfill re-runnable
    'actor' => Identity::system('importer'),
]);
```

Three things to get right in a backfill:

1. **Set `occurred_at`.** Otherwise every historical fact happened today, and the ledger's whole value —
   ordering — is gone.
2. **Set a dedupe key**, so a second run is a no-op. This is the case the keys were designed for.
3. **Pin the actor**, so the rows are attributed to the importer rather than to whoever ran the command:

```php
IdentityContext::actingAs(Identity::system('importer'), function () {
    // …
});
```

Wrap it in `BrandContext::runFor()` too — a console command has no session, so in multi-brand mode there is
no current brand to stamp.

## What not to record

**Not a debug log.** A stack trace is not a fact about your business.

**Not high-frequency internal state.** A row per queue tick will dominate the table and answer nothing.

**Not anything the sanitizer would have to save you from.** The redaction list is a safety net, not a design.
Do not put a payment token in `properties` and rely on the key name being caught.
