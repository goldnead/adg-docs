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

Unlike the form path, which requires an email, ingestion can deduplicate on **phone** too.
That is what makes it usable for a booking system or a phone-order flow where an address is
optional.

A contact resolved by phone with no email is a real contact with a real timeline. It simply
cannot be a [Marketing](/marketing/) subscriber, because consent needs an address.

## Backfilling history

Two commands exist for the migration case, and both are idempotent:

```bash
php artisan crm:backfill-leadhub --dry-run
php artisan crm:backfill-leadhub --source=orders
```

The backfill replays historical rows from registered sources through the normal ingestion
path, with notifications and CRM sync muted so a replay does not email your team about
three-year-old leads.

Run the dry run first, always. Then the real run. A second run is a no-op, which is the point
of the dedupe keys.

::: warning A source with no natural dedupe key
Some sources have nothing stable to key on — a `users` table with no per-event identity, for
example. Those need a guard in the command itself rather than relying on `dedupe_key`, and
re-running without one duplicates.
:::

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
