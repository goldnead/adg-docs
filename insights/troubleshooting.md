# Troubleshooting

<AddonHeader />

## The screen says the payments addon is not installed

It is not, or its tables have not been migrated. This is a deliberate state with its own
wording, not an error page — the addon reads another package's tables and says so plainly
when they are absent.

```bash
composer require goldnead/statamic-payments
php artisan migrate
```

## Everything is under "no campaign"

Expected on any payment taken before Payments started freezing the UTM values, and expected
forever on payments where the host never handed them in.

The addon reads no request and invents nothing. The freezing happens in
`Checkout::start()`, and the host passes the values as caller details — see
[Payments → Starting a checkout](/payments/checkout). Read from the success redirect they
are already gone.

## Net revenue is negative

Correct, and the screen says why: more went back than came in during that period. A refund
counts on the day the money went back, so a quiet month that repaid an earlier sale shows a
negative net. See [Reading the numbers](/insights/reading-the-numbers).

## The refund line shows no percentage

Also correct. Nothing came in during the period, so there is nothing to be a percentage
**of**. A `0 %` there would be contradicted by the refund amount printed beside it.

## The product rows do not add up to what was charged

The screen says so when it happens, with the difference named.

The payment's own `amount_cent` is authoritative — it is what was charged. The line items
are a split of it. When the split does not add up, rows were written **past the checkout**:
an importer, a seeder, a migration that inserted into `payment_items` directly.

Find them with:

```sql
select p.id, p.amount_cent,
       (select sum(i.amount_cent * i.quantity - i.discount_cent)
          from payment_items i where i.payment_id = p.id) as lines
from payments p
where p.status = 'paid'
having lines is not null and lines <> p.amount_cent;
```

## A currency is missing from the figures

By design. Two currencies are never summed. The ones left out are named on screen; switch
with the control in the header, or `?currency=CHF`.

## The revenue panel is missing from a contact

Three possibilities, in the order worth checking:

1. **The contact has never paid.** No panel is drawn at all — an empty card on every screen
   is noise.
2. **LeadHub is older than 2.8**, so it has no revenue ledger. The addon probes for the
   method and stays quiet rather than erroring once per contact screen.
3. **The purchases predate the Payments–LeadHub bridge.** Run
   `payments:leadhub-backfill`; it is safe to repeat.

## The totals on a contact look wrong

They are a cache of `leadhub_contact_revenue`, recomputed after every write. When cache and
rows disagree, the rows are right:

```php
app(\Goldnead\Leadhub\Services\RevenueService::class)->recalculate($contact);
```

That is LeadHub's repair, not this addon's — nothing here writes money.

## The chart is empty but the totals are not

Only possible if the period is open-ended and no payment carries a `paid_at`. Every other
combination draws a bar per bucket, including zero-height ones for the days that earned
nothing.
