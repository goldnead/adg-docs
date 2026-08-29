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

## There is no chart, but there are totals

Expected in two cases.

**The range has only one bucket.** A single bar is not a chart, it is the number above it
stretched, so none is drawn. Widen the period.

**Nothing was measured in any bucket.** A bucket that earned nothing gets no bar at all —
never a short one, which would draw activity on a quiet day.

## The breadcrumb says "Revenue" while you are on the Metrics screen

Statamic caches the list of URLs its Control Panel navigation knows about. Upgrading
from 1.0 adds a second child page, and until that cache is rebuilt the breadcrumb still
resolves to the only child it knew — so the page heading, the sidebar and the breadcrumb
disagree with each other.

Nothing is wrong with the data, and clearing the cache is the whole fix:

```
php artisan cache:clear
```

It applies to any addon that adds a nav item during an upgrade, not only this one.

## A group is missing from the Metrics screen

The addon that contributes it is not installed, or it is too old to register metrics, or
its own tables have not been migrated. A metric that cannot answer is left out rather than
shown as zero: *nothing to measure* and *measured nothing* are different statements.

An unresolved brand is **not** one of the causes. On a multi-brand install with no brand
picked, the tiles stay and read zero — see
[which figures narrow by brand](/insights/reading-the-numbers#a-figure-over-a-brand-scoped-table-counts-the-current-brand).

## One tile is missing while the rest of its group is there

That metric threw. Failures are contained per metric on purpose, so a contributor
mid-upgrade costs its own tile and a line in `laravel.log`, never the page. The log entry
names the handle.
