# Ingestion API

<AddonHeader />

Forms are one source. The ingestion API is the general one: **any** source — purchases,
bookings, logins, inbound webhooks, an import — becomes a contact plus a timeline entry.

```php
'features' => ['ingestion' => true],   // eloquent driver only
```

## Ingesting

```php
use Goldnead\Leadhub\Facades\LeadHub;

LeadHub::ingest([
    'source' => 'shop',
    'event' => 'purchase.completed',
    'email' => $order->email,
    'dedupe_key' => 'order:'.$order->id,
    'data' => [
        'amount' => $order->total,
        'product' => $order->product_name,
    ],
]);
```

That single call:

- resolves or creates the contact, deduplicated by **email or phone**
- writes a timeline entry
- awards points if [scoring](/leadhub/scoring) is on
- re-evaluates [segments](/leadhub/segments)
- fires `LeadHubSourceIngested`

## Idempotency

`dedupe_key` is the fingerprint of the **fact**, unique per brand. Ingesting the same key
twice returns the existing entry and writes nothing.

That is the property the whole API is built around: **a producer may be as noisy as it
likes.** A webhook that retries, a job that runs twice, an import you re-run — none of them
duplicate anything.

::: warning Choose the key from the fact, not from the moment
`'order:'.$order->id` is a fact: that order completing is one event forever. `'order:'.now()`
is a moment, and a retry produces a second row.

For a genuinely repeatable fact — a login, a page view — leave the key **off**. The second
login is a second fact, and omitting the key says so.
:::

## Source projectors

Registering a projector lets LeadHub map one of your models automatically, so the
call site does not have to build the array:

```php
use Goldnead\Leadhub\Contracts\SourceProjector;

class OrderProjector implements SourceProjector
{
    public function source(): string
    {
        return 'shop';
    }

    public function project($order): array
    {
        return [
            'event' => 'purchase.completed',
            'email' => $order->email,
            'phone' => $order->phone,
            'dedupe_key' => 'order:'.$order->id,
            'data' => ['amount' => $order->total],
        ];
    }
}
```

Register it from a service provider's `boot()`, then ingest the model directly. The mapping
lives in one place rather than at every call site, which matters once three parts of your
application ingest orders.

## Deduplication by email or phone

Ingestion resolves a contact in two passes: by email first, then by **normalized phone**.
The second pass is what catches the same person arriving from a booking system under an
address they no longer use.

::: warning An email is still mandatory
`LeadHub::ingest()` returns `null` for a `SourceEvent` without an email, before any
resolution runs. Phone is a *secondary* match on an event that already carries an address,
not a way in without one. A phone-only event is dropped, and because the return is `null`
rather than an exception, a backfill loop that ignores the return value drops it silently.

Check the return value, or fall back to a placeholder address you control.
:::

A contact matched by phone keeps the email it already had. It can be a
[Marketing](/marketing/) subscriber like any other, since consent is tied to that address.

## Backfilling history

There is no backfill command. Backfilling is a one-off shaped by your own tables, so
LeadHub gives you the idempotent primitive and you write the loop:

```php
Order::query()
    ->where('created_at', '<', $cutoff)
    ->chunkById(500, function ($orders) {
        foreach ($orders as $order) {
            LeadHub::ingest(new SourceEvent(
                email: $order->email,
                sourceType: 'order',
                sourceId: $order->id,
                dedupeKey: 'order:'.$order->id,
                occurredAt: $order->created_at,
            ));
        }
    });
```

`dedupeKey` is what makes a re-run safe: `IngestionService` looks the key up before it
writes and returns the existing event instead of creating a second one. Run the loop
twice and the second pass changes nothing.

::: warning A source with no natural dedupe key
Some tables have nothing stable to key on. Without a `dedupeKey` the idempotency check is
skipped entirely and a second run duplicates every row, so derive one from something that
cannot change — the primary key, not a timestamp or a status.
:::

Backfills fire the same events as live ingestion, so any Automations recipe listening for
them will run against three-year-old leads. Disable those recipes for the duration, or
scope them by `occurred_at`.

## Ingesting from an inbound webhook

The clean composition, when you also run [Webhook Manager](/webhook-manager/):

1. Create an inbound endpoint with a real verifier.
2. Point it at the **Dispatch event** action.
3. Listen for that event and call `LeadHub::ingest()`.

Signature verification, rate limiting and replay protection are handled before your code
runs, and the ingestion `dedupe_key` handles the provider's own retries. Between the two you
get exactly-once behaviour without writing either half.

## What Automations can see

Automations reacts to the **bridged LeadHub events**, not to raw source events. So an
automation can respond to the contact changes an ingestion causes, and there is no built-in
trigger for "any source event of type X".

Register `LeadHubSourceIngested` as a
[custom event trigger](/automations/extending#turning-an-application-event-into-a-trigger)
if you want one. One call, and the node appears with a generated config form.

## Requirements and limits

- **Eloquent driver only.** The module is relational; on the flat driver it is unavailable
  rather than degraded.
- **Ingestion is not fail-safe in the same way the form listener is.** The form path
  deliberately swallows its own errors so a submission never breaks; a direct
  `LeadHub::ingest()` call is your code, and an exception surfaces where you called it. Wrap
  it if the caller must not fail.
- **`data` is stored as a payload** and goes through the same redaction as a form submission.
  Do not put a password in it and expect the list to catch a field name it has never heard
  of.
