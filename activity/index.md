# Activity

<AddonHeader />

An immutable, brand-scoped activity ledger: the append-only record of **what happened**, for Statamic
applications.

It is deliberately **not** an analytics product. It stores facts; it computes nothing. Metrics, funnels,
cohorts and dashboards belong in a separate layer that reads from here — mixing the two is how a ledger
quietly turns into a reporting tool with no schema discipline, and then neither job is done well.

```php
use Goldnead\Activity\Facades\Activity;

Activity::record('commerce.purchase_completed', [
    'actor' => $user,                       // anything IdentityContext can resolve
    'subject' => $order,                    // any Eloquent model
    'dedupe_key' => 'mollie:'.$payment->id, // the fact's fingerprint
    'properties' => ['amount' => 4900, 'currency' => 'EUR', 'product' => 'kurs'],
]);
```

Everything except the event type is optional. Brand, actor, source and request context are filled in
automatically.

## What it is for

Domain addons each grow their own event log: a CRM timeline, a lesson-progress table, a webhook receipt
log. Each solves its own problem and **none of them can answer a cross-domain question**.

This package is the one place a fact is recorded in a shape every consumer can read.

## Three guarantees

**Recording never breaks the caller.** A ledger failure is reported and swallowed. A broken `activities`
table must never roll back the purchase that produced the event.

**Recording an existing fact writes nothing** and returns the original row. A producer may be as noisy as
it likes. Two independent idempotency keys make that true — see
[Recording](/activity/recording#two-idempotency-keys).

**The table is append-only.** Updating or deleting a row throws `ImmutableActivity`. Correct a wrong fact
by recording a correcting one.

## Privacy, by construction

- **No raw user agent, ever.** Only a coarse category: `mobile`, `desktop`, `tablet`, `bot`.
- **No IP addresses.** Derive a country upstream and pass it explicitly if you need one.
- **A sanitizer runs on every write.** Secret-shaped keys are redacted at any depth; oversized payloads get
  a visible marker rather than silent truncation.
- **Whole event types can be blocked** — the enforcement point for "this domain never mirrors into a
  central store".

See [Privacy & retention](/activity/privacy).

## Bundled producers

Two ship with the package and attach themselves **only when the sibling addon is installed**:

| Producer | Records |
| --- | --- |
| Marketing | `marketing.subscription_pending | subscription_confirmed | unsubscribed`, `campaign_sending | campaign_sent`, `email_sent | email_opened | email_clicked | email_bounced | email_complained` |
| LeadHub | `crm.contact_created | contact_updated | status_changed | score_changed | segment_entered | opportunity_won | task_completed | …` |

Event type names follow the platform catalogue rather than PHP class names, so consumers survive a class
rename.

::: tip `leadhub_events` is not replaced
That table is the CRM's own contact timeline and stays untouched. The ledger records the same facts for a
different purpose, and the two are allowed to overlap. See
[Boundaries](/guide/boundaries#crm-timeline-vs-activity-ledger).
:::

## The Control Panel

A **read-only inspector** at **Tools → Activity**: filter by event type, contact, user, source and date
range; open a single fact to read its properties and context.

No counts, no charts, no aggregates. That is the design, not a gap.

<Figure
  src="activity-inspector"
  alt="The activity ledger listing facts with their event type, actor, source and timestamp"
  caption="Facts only. Actors appear as join keys rather than names, which is what lets `activity:anonymize` remove the person without removing the fact." />

## Next

- [Installation](/activity/installation)
- [Configuration](/activity/configuration)
- [Concepts](/activity/concepts)
- [Recording facts](/activity/recording) — including the two idempotency keys
- [Producers](/activity/producers) — map your domain events onto the ledger
- [Querying](/activity/querying)
- [Privacy & retention](/activity/privacy)
