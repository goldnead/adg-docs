# Reference

<AddonHeader />

## Console commands

**None.** Nothing is scheduled, nothing is queued, nothing is cached. Every figure is
computed when the screen is requested.

## Permissions

| Permission | |
| --- | --- |
| `view insights` | The revenue screen and its navigation entry |

## Configuration keys

| Key | Default | |
| --- | --- | --- |
| `statamic-insights.currency` | `null` | Falls back to `statamic-payments.currency`, then to the busiest currency in the data |
| `statamic-insights.default_period` | `30d` | `7d`, `30d`, `90d`, `12m`, `ytd`, `all` |

## Routes

| Route | |
| --- | --- |
| `cp_route('insights.revenue')` | The screen. `?period=` and `?currency=` are read from the query string. |

## Classes you may use

The addon is a screen, not a library, so the surface is small and it is not a facade.

```php
use Goldnead\StatamicInsights\Support\Period;
use Goldnead\StatamicInsights\Support\RevenueReport;

$period = Period::fromPreset('90d');        // an unknown preset falls back to 30d
$period->previous();                        // same length, ending where this one begins
$period->days();                            // calendar days, inclusive of both ends

$report = new RevenueReport($period, 'EUR');

RevenueReport::available();                 // are the payments tables even there
RevenueReport::currencies();                // every currency ever taken, busiest first

$report->totals();                          // gross, refunded, net, orders, buyers, average, rate, previous
$report->byCampaign(20);                    // [{ campaign, source, orders, gross_cent }]
$report->byProduct(20);                     // [{ handle, name, orders, quantity, gross_cent }]
$report->overTime();                        // [{ bucket, gross_cent }], every bucket in range
$report->productSumCent();                  // what the product rows add up to
$report->otherCurrencies();                 // taken in this period, not in this figure
```

`totals()['refund_rate']` is **`null`**, not `0`, when nothing came in. A rate against zero
is a question that does not apply, and printing `0 %` beside a refund amount would be a
statement contradicted by the figure next to it.

## What it reads

Straight from the payments tables with SQL aggregates — an aggregate is a read, not a call,
and hydrating ten thousand rows to add up a column would be slower and no more correct.

| Table | Columns |
| --- | --- |
| `payments` | `status`, `currency`, `amount_cent`, `paid_at`, `email`, `product`, `refunded_cent`, `refunded_at`, `utm_campaign`, `utm_source` |
| `payment_items` | `payment_id`, `product`, `amount_cent`, `quantity`, `discount_cent` |

Product *names* are the exception: those go through Payments' catalogue, because a handle
only becomes a product there and an offer's handle resolves nowhere else.

## Database support

The time buckets are the only dialect-specific SQL, and all three are written out:
`strftime` on SQLite, `date_format` on MySQL and MariaDB, `to_char` on PostgreSQL.

::: warning Verified on SQLite
The test suite runs on SQLite. The MySQL and PostgreSQL expressions are correct by the
documentation but have no automated run behind them yet. If you are the first to run this
on either, the chart is where a problem would appear.
:::
