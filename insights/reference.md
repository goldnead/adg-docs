# Reference

<AddonHeader />

## Console commands

**None.** Nothing is scheduled, nothing is queued, nothing is cached. Every figure is
computed when the screen is requested.

## Permissions

| Permission | |
| --- | --- |
| `view insights` | Every Insights screen and the navigation entries |

One permission, no children. The screens are read-only, so there is nothing on them to
grant separately.

## Configuration keys

| Key | Default | |
| --- | --- | --- |
| `statamic-insights.currency` | `null` | Falls back to `statamic-payments.currency`, then to the busiest currency in the data |
| `statamic-insights.default_period` | `30d` | `7d`, `30d`, `90d`, `12m`, `ytd`, `all` |

## Routes

| Route | |
| --- | --- |
| `cp_route('insights.index')` | `/cp/insights`. Redirects to the revenue screen and keeps the query string, so an old bookmark still lands on its period and currency. |
| `cp_route('insights.revenue')` | `/cp/insights/revenue`, the curated revenue screen. `?period=` and `?currency=` are read from the query string. |
| `cp_route('insights.subscriptions')` | `/cp/insights/subscriptions`, the [subscription figures](/insights/subscriptions). Same `?period=` and `?currency=`. |
| `cp_route('insights.metrics')` | Every registered metric, grouped by contributor. |
| `cp_route('insights.metrics.show', $handle)` | One metric: its chart, its comparison and any splits it offers. |
| `cp_route('insights.reports')` | Every registered report, available or not, grouped by heading. |
| `cp_route('insights.reports.show', $handle)` | One report as a table. `?period=` is read when the report uses a period; an unavailable report answers 200 with the package it needs, not 404. |

All seven are registered unconditionally, because a nav item resolves its target through
`cp_route()` while the navigation is built, on every Control Panel page. A conditionally
registered route behind an unconditional nav item takes the whole panel down with a
`RouteNotFoundException`.

## The registration API

```php
use Goldnead\StatamicInsights\Facades\Insights;

Insights::registerMetric(ActiveMembers::class, 'memberships.active');

Insights::metricHandles();          // every registered handle
Insights::metric('payments.orders'); // one metric, or null
Insights::metrics();                // handle => Metric, everything registered

Insights::registerReport(RevenueByMonth::class, 'payments.revenue_by_month');
Insights::reportHandles();
Insights::report('payments.revenue_by_month');
Insights::reports();                // handle => Report, available or not
```

Registration takes a class name, an instance or a closure, and is keyed by handle: the same
handle registered twice replaces the first rather than appearing twice.

Pass the handle as the second argument. It lets the registry list a metric without
constructing it, which is what keeps a screen from building fourteen addons' worth of
objects to draw a list. Omit it and the registry has to construct the class to ask; omit it
on a **closure** and there is nothing it can do but log and skip, because probing a closure
means calling it.

How to write the metric on the other end of that call, and why the registration is guarded
the way it is, is [Contributing a metric](/insights/contributing-a-metric).

## The contracts

| | |
| --- | --- |
| `Contracts\Metric` | The whole coupling: handle, label, description, group, unit, `available()`, `value()`, `series()`, `meta()` |
| `Contracts\HasBreakdowns` | Optional. `breakdowns()` and `breakdown()` |
| `Contracts\HasFilterOptions` | Optional. `filterOptions()` |
| `Support\TableMetric` | Optional base class for a metric over one table with a timestamp |
| `Support\MetricQuery` | What is being asked: a period, a bucket, free-form filters |
| `Support\Period` | `fromPreset()`, `between()`, `previous()`, `days()`, `toExclusive()`, `isOpenEnded()` |
| `Support\Unit` | `COUNT`, `CURRENCY`, `PERCENT`, `DURATION` |
| `Contracts\Report` | A table: handle, label, description, group, `available()`, `requires()`, `usesPeriod()`, `columns()`, `rows()` |
| `Support\TableReport` | Optional base class for a report over one table: window, month bucket, brand narrowing, `percent()` |
| `Support\Neighbours` | Whether `payments`, `offers` or `entitlements` is installed and migrated; `pretend()` for tests |

## Reports

Ten ship with the addon, registered from its own provider. Every one reads a sibling's
tables directly and is guarded by `Neighbours`: class existence and table existence, or
the report says what it would need.

| Handle | Reads | Rows | Period |
| --- | --- | --- | --- |
| `payments.revenue_by_month` | `payments` | month × currency: gross, payments, average order | yes, on `paid_at` |
| `payments.revenue_by_product` | `payment_items` ⋈ `payments` | product × currency: sold, orders, gross | yes, on `paid_at` |
| `payments.by_country` | `payments` | country × currency: payments, gross; no country is its own row | yes, on `paid_at` |
| `payments.abandonment` | `payments` | month opened: paid, open + expired, rate over those rows | yes, on `created_at` |
| `offers.upsells` | `offers`, plus `payment_items` when payments is there | bump or post-purchase offer: shown, accepted, conversion, revenue | revenue only; the counters are lifetime |
| `entitlements.access_by_product` | `entitlements` | access slug: active, in grace, expired; revoked in none | no — a snapshot |
| `payments.mrr_movements` | `subscriptions`, `payments` | month: start, new, reactivated, expansion, contraction, churned, paused, change, end; one currency at a time | yes |
| `payments.subscription_cohorts` | `subscriptions`, `payments` | start month: started, share running after 1, 2, 3, 6 and 12 months; one currency at a time | no — every cohort since the first subscription |
| `payments.upcoming_charges` | `subscriptions`, `payments` | every charge in the next 30 days; one currency at a time | no — always the next 30 days |
| `payments.subscription_forecast` | `subscriptions`, `payments` | the next twelve months: subscriptions, instalments, total; one currency at a time | no — always the next twelve months |

The last four are the [subscription figures](/insights/subscriptions). They take their
currency as a filter through `HasFilterOptions` rather than a currency column, and the
report screen draws a switch for every filter that has more than one option. Any report may
offer filters that way.

Column units are `count`, `currency`, `percent`, `text`, `code`, `month` and `date`. A
currency cell reads the row's own `currency`, which is why two currencies are two rows and
never one sum. `null` in a cell prints as a dash: a rate over nothing has no answer.

```php
use Goldnead\StatamicInsights\Support\{MetricQuery, Period};

$period = Period::fromPreset('90d');   // an unknown preset falls back to 30d
$period->previous();                   // same length, ending where this one begins
$period->days();                       // calendar days, null when open-ended
$period->toExclusive();                // the upper bound as `< midnight`, never `<= 23:59:59`

$query = new MetricQuery($period, MetricQuery::bucketFor($period));
$query->with('currency', 'CHF');       // the same question, one filter changed
```

::: warning `Support\RevenueReport` is gone
It was removed in 1.1.0, one day after it shipped. It read the `payments` tables directly,
which meant two packages computed the same money — and which is the coupling an analytics
addon must not have. Its arithmetic moved to `statamic-payments`, where it is tested
against the real tables.

If you were reaching for it, the seven `payments.*` metrics
[replace it](/insights/what-the-family-reports#payments) and are reachable through
`Insights::metric()`.
:::

## What it reads

**No tables of its own.** Every figure on the Revenue and Metrics screens is a query living
in the contributing addon. The reports and the subscription figures are the exception: they
read a sibling's tables directly, select only, and name the package when it is missing. This package holds a registry, a reader that catches what a metric
throws, and the screens.

`Support\RevenueView::HANDLES` maps the screen's own slots onto the seven handles it is
built from:

```php
[
    'net'         => 'payments.revenue_net',
    'gross'       => 'payments.revenue_gross',
    'refunded'    => 'payments.refunded',
    'orders'      => 'payments.orders',
    'buyers'      => 'payments.buyers',
    'average'     => 'payments.average_order',
    'refund_rate' => 'payments.refund_rate',
]
```

Missing handles are simply absent. The absence of `payments.revenue_gross` in particular is
what the screen distinguishes as "no payments addon" rather than "no sales yet" — two
different sentences, because a zero for the first is the quiet kind of wrong.

## Failure containment

A metric that throws costs its own tile and a line in the log, never the page. A
contributor mid-upgrade, a table half-migrated, a query that is wrong on one engine: all of
them degrade to one missing figure.

## Database support

The time buckets are the only dialect-specific SQL, and `TableMetric` writes all three:
`strftime` on SQLite, `date_format` on MySQL and MariaDB, `to_char` on PostgreSQL. A metric
that builds its own bucket expression has to do the same — written for one engine, a chart
is green on SQLite in the test suite and a 500 on the first production install running
MySQL.

::: warning Verified on SQLite
The test suites run on SQLite. The MySQL and PostgreSQL expressions are correct by the
documentation but have no automated run behind them yet. If you are the first to run this
on either, the chart is where a problem would appear.
:::
