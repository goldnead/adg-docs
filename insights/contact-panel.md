# On the contact screen

<AddonHeader />

With [LeadHub](/leadhub/) installed, every contact who has paid gets a **Revenue** panel on
their own screen.

<Figure
  src="insights-contact-revenue"
  alt="A Revenue panel on a contact screen: lifetime revenue, purchases, refunded with a badge, first and last purchase"
  caption="Five rows, and none of them computed here." />

| Row | |
| --- | --- |
| Lifetime revenue | Paid minus refunded, never below zero |
| Purchases | How many, refunds included — a refund is not an un-purchase |
| Refunded | Only when there is something to show, with a badge |
| First purchase | |
| Last purchase | |

A contact who has never paid gets **no panel at all**. An empty card on every contact
screen is noise that makes the ones with numbers harder to find, and LeadHub's registry
treats `null` as a legitimate "nothing to say" for exactly this case.

## Where the numbers come from

Not from here. LeadHub keeps a revenue ledger of its own —
`leadhub_contact_revenue`, one row per contributed fact — and caches the totals on the
contact so a segment can compare them and a listing can sort by them.

Payments writes into that ledger when a purchase settles. This addon only asks for the
totals and arranges them. **Nothing on this panel is computed here.**

That means the panel is only as complete as the ledger. If the bridge between Payments and
LeadHub was switched on after sales had already happened, run
`payments:leadhub-backfill` — it is safe to repeat.

## Why it is contributed rather than read

LeadHub requires nobody. Insights may require LeadHub, but not the other way round —
reversing that for one panel would make an optional sibling a hard dependency of the CRM.

So the panel is **registered from this side** through LeadHub's own panel registry:

```php
LeadHub::registerContactPanel('insights.revenue', fn ($contact) => [
    'heading' => 'Revenue',
    'rows' => [ /* label / meta / badge */ ],
]);
```

The shape is deliberately dumb — a heading and rows of label, meta and badge — not a
component name. A registry that accepted markup would make every contributor's JavaScript
build a dependency of the contact screen, and the first broken bundle would take the page
with it.

Two consequences worth knowing:

- **The panel formats its own money, in PHP.** The contract carries strings, so the
  browser cannot do it the way it does on this addon's own screen.
- **A panel that throws is logged and skipped, never propagated.** A sibling mid-upgrade
  must not be able to 500 a page somebody opened to read a phone number.

## Segments

The totals LeadHub caches are real columns, not custom fields, which means a segment can
compare them:

| Field | |
| --- | --- |
| `revenue_cent` | Lifetime revenue, in minor units |
| `revenue_refunded_cent` | |
| `purchase_count` | |
| `first_purchase_at` / `last_purchase_at` | |

So "has paid more than 100 €" or "last bought over a year ago" is a rule, not a report.
That is a LeadHub feature; this addon just puts the same numbers on a screen.
