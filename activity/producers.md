# Producers

<AddonHeader />

A producer maps one of your domain events onto the ledger **without the ledger knowing your code**.

```php
Activity::registerProducer(OrderPaid::class, fn (OrderPaid $event) => [
    'actor' => $event->customer,
    'dedupe_key' => 'order:'.$event->order->id,
    'properties' => ['amount' => $event->order->total],
], 'commerce.purchase_completed');
```

Register from a service provider's `boot()`.

## The mapper

Return an array of the same keys `record()` takes. Two special returns:

| Return | Effect |
| --- | --- |
| `null` | **Skip this occurrence.** Nothing is recorded. |
| an `event_type` key | Override the type for this occurrence |

```php
Activity::registerProducer(OrderStatusChanged::class, function ($event) {
    if ($event->status === 'draft') {
        return null;   // not a fact worth recording
    }

    return [
        'event_type' => 'commerce.order_'.$event->status,   // per-occurrence type
        'subject' => $event->order,
        'dedupe_key' => 'order:'.$event->order->id.':'.$event->status,
    ];
});
```

Returning `null` is the right way to filter. Registering a producer and then guarding inside it is clearer
than a conditional registration, because the mapping stays in one place.

## Registering replaces, it never adds

::: warning Registering the same event class again **replaces** the mapper
It never adds a second listener. That is deliberate: two listeners on one event would produce two rows for
one fact, which is the exact problem the dedupe key exists to prevent — and relying on the key to clean up
after a duplicate registration is a worse design than not registering twice.

The practical consequence: if a bundled producer already covers an event, your registration takes over.
That is how you override one.
:::

## Registering several at once

`Activity::producers()` returns the `ProducerRegistry`, which takes a whole map in one call:

```php
use Goldnead\Activity\Facades\Activity;

Activity::producers()->registerMany([
    // event class => [event type, mapper]
    OrderPaid::class => ['commerce.purchase_completed', fn (OrderPaid $e) => [
        'actor' => $e->customer,
        'dedupe_key' => 'order:'.$e->order->id,
    ]],

    // or just a mapper, when the mapper returns its own `event_type`
    OrderRefunded::class => fn (OrderRefunded $e) => [
        'event_type' => 'commerce.order_refunded',
        'subject' => $e->order,
    ],
]);
```

Each entry is either a `[string $eventType, Closure $mapper]` pair or a bare `Closure`. Every entry goes
through `register()`, so the replace-never-add rule above applies unchanged.

This is worth reaching for once a service provider registers more than two or three producers: the shape of
the whole mapping is then readable in one place instead of spread over a column of calls.

The registry also exposes `has(string $eventClass)`, `registered()` (the registered event class names) and
`forget()` (clears everything — useful in tests, not in application code).

## Bundled producers

Two ship with the package and attach themselves **only when the sibling addon is installed**:

**Marketing**

```
marketing.subscription_pending | subscription_confirmed | unsubscribed
marketing.campaign_sending | campaign_sent
marketing.email_sent | email_opened | email_clicked | email_bounced | email_complained
```

**LeadHub**

```
crm.contact_created | contact_updated | status_changed | score_changed
crm.segment_entered | opportunity_won | task_completed | …
```

Toggle them:

```php
'producers' => [
    'marketing' => env('ACTIVITY_PRODUCER_MARKETING', true),
    'leadhub' => env('ACTIVITY_PRODUCER_LEADHUB', true),
],
```

Setting one to `false` is reasonable if the sibling's own log is sufficient and you would rather not double
the write volume. `marketing.email_opened` in particular will dominate the table on a site sending to a
large list.

## Event type names are a catalogue, not class names

`crm.status_changed`, not `LeadHubStatusChanged`.

Following a platform catalogue is what lets **consumers survive a class rename**. If you name your types
after PHP classes, the first refactor breaks every query anybody wrote against the ledger.

Use a namespace prefix, and pick it for the domain rather than for the addon: `commerce.`, `crm.`,
`marketing.`, `lms.`.

## `leadhub_events` is not replaced

That table is the CRM's own contact timeline and stays untouched. The ledger records the same facts for a
**different purpose** — cross-domain questions no single addon's log can answer — and the two are allowed to
overlap.

Installing Activity migrates nothing. Do not try to make one authoritative over the other. See
[Boundaries](/guide/boundaries#crm-timeline-vs-activity-ledger).

## Writing a good producer

**Dedupe state transitions, not repeatable facts.** A purchase gets a key; an email open does not. See
[Recording](/activity/recording#two-idempotency-keys).

**Never write an empty-but-present dedupe key.** Write `null`. An empty string is a value, and
`(brand_id, dedupe_key)` being unique means every event of that type in the brand would collapse onto one
row.

**Keep the mapper cheap.** It runs synchronously in the event dispatch unless queueing is on. A mapper that
issues three queries turns every purchase into four.

**Keep it total.** A mapper that throws for an unusual event shape means a lost fact — recording is
fail-safe, so the exception is swallowed and logged. Guard and return `null` instead.

```php
Activity::registerProducer(OrderPaid::class, function ($event) {
    if (! $event->order?->id) {
        return null;      // better than letting it throw
    }
    // …
});
```

## The sanitizer, as an extension point

Beyond `strip_keys` and `blocked_event_types`, bind your own:

```php
use Goldnead\Activity\Contracts\ActivitySanitizer;

$this->app->bind(ActivitySanitizer::class, MySanitizer::class);
```

Returning `null` from it **drops the activity entirely**, which makes it the enforcement point for a rule
config cannot express — "never record anything about a contact in this jurisdiction", say.

It runs on every write, so keep it cheap and total for the same reasons as a mapper.

## Multi-brand

A producer runs wherever the event was dispatched, so in an HTTP request the current brand is stamped
automatically.

In a console command or a queue worker there is no session and therefore no brand. Wrap the work:

```php
BrandContext::runFor($handle, fn () => /* dispatch the events */);
```

Dedupe keys are per brand, so two brands may legitimately record the same fact independently.
