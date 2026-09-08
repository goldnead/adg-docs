# Contributing a metric

<AddonHeader />

This is what the addon is for. Insights owns the period, the comparison against the period
before, the chart, the splits, the formatting and the screens. It owns no data. Every
figure it shows was contributed by the package that knows how to count it, and yours can
be too — including one that is not part of this suite.

A registered metric appears on **every screen this addon has, present and future**, with
none of the surrounding machinery written by you.

## The contract

One interface, `Goldnead\StatamicInsights\Contracts\Metric`, and two optional ones.

```php
use Goldnead\StatamicInsights\Contracts\Metric;
use Goldnead\StatamicInsights\Support\{MetricQuery, Unit};
use Illuminate\Support\Facades\{DB, Schema};

class ActiveMembers implements Metric
{
    public function handle(): string { return 'memberships.active'; }
    public function label(): string  { return __('Active members'); }
    public function group(): string  { return __('Memberships'); }
    public function unit(): string   { return Unit::COUNT; }

    public function description(): ?string
    {
        return __('Memberships still standing at the end of the period.');
    }

    public function available(): bool
    {
        return Schema::hasTable('memberships');
    }

    /**
     * One number, or null when the question does not apply.
     *
     * This one is a stock — how many stand right now — so it ignores the
     * window it was handed. Say that in `description()`: the tile will show
     * the same figure for every period, and a reader is owed the reason.
     */
    public function value(MetricQuery $query): int|float|null
    {
        return DB::table('memberships')->whereNull('ended_at')->count();
    }

    /** The same number per bucket: ['2026-08-01' => 12, …]. No buckets, no chart. */
    public function series(MetricQuery $query): array
    {
        return [];
    }

    /** Anything the formatter needs that the unit does not carry. */
    public function meta(MetricQuery $query): array
    {
        return [];
    }
}
```

`handle()` is **semver-locked from the moment it is registered**. It goes into the URL of
the metric's detail view and therefore into bookmarks. Namespace it with your package's
name, as every metric in the suite does: `payments.revenue_net`, `booking.scheduled`.

`unit()` is one of `Unit::COUNT`, `Unit::CURRENCY`, `Unit::PERCENT`, `Unit::DURATION`. It
decides how the number is printed, not what it means. `CURRENCY` is minor units — an
integer of cents, never a float of euros — and requires `meta()` to return a `currency`
key with the ISO 4217 code.

`group()` is a **label**, not a handle: it is the heading the metric sits under, normally
your addon's own name, and an addon that wants two headings just returns two strings.
Groups are sorted by heading, so installing another addon never reshuffles yours.

### If your numbers live in a table

Then extend `TableMetric` instead and most of that disappears. It writes the part every
table-backed metric would otherwise write again: windowing a period, bucketing a timestamp
in three SQL dialects, splitting by a column without dropping the rows whose value is
null.

```php
use Goldnead\StatamicInsights\Support\{MetricQuery, TableMetric, Unit};

class NewMembers extends TableMetric
{
    protected function table(): string     { return 'memberships'; }
    protected function timestamp(): string { return 'started_at'; }

    public function handle(): string { return 'memberships.started'; }
    public function label(): string  { return __('New memberships'); }
    public function group(): string  { return __('Memberships'); }
    public function unit(): string   { return Unit::COUNT; }

    public function value(MetricQuery $q): int|float|null
    {
        return $this->inPeriod($q)->count();
    }

    public function series(MetricQuery $q): array
    {
        return $this->bucketed($this->inPeriod($q), $q, 'count(*)');
    }
}
```

It is offered, not required. A metric whose numbers come from a file store, an API or a
calculation implements `Metric` directly and ignores all of this.

`timestamp()` has **no default, on purpose**. The row was written when the software
noticed; the fact happened when it happened. A payment paid on the 30th and recorded on
the 1st belongs to the 30th, and a base class that guessed `created_at` would make that
mistake silently in every addon that never thought about it.

Override `inPeriod()` to add the conditions that decide whether a row counts at all — a
status, a soft delete. Put them there and they apply to the figure, the chart and every
split at once, where none of the three can be the one that forgot. Extend it, never
rewrite it: three separate defects have been fixed in that method, and each reached only
the metrics that had called `parent::inPeriod()`.

## `brandColumn()`

One line, and the figure, the chart and every split narrow to the current brand together.

```php
protected function brandColumn(): ?string
{
    return 'brand_id';
}
```

That is the whole opt-in. `TableMetric` then applies
[Brand Context](/brand-context/scoping)'s own rules — transcribed from its scope rather
than reinvented, in the same order: bypass, then single-brand, then the unresolved case,
then the filter. A figure that filtered by its own rules would disagree with every listing
beside it.

Return `null` if your table has no brands, or if the figure deliberately spans all of them
— and in the second case **say so in `description()`**. A screen where one tile counts one
brand and its neighbour counts four, with neither saying which, is worse than a screen that
knows no brands at all.

::: danger A join does not see this
`brandColumn()` is applied inside `inPeriod()`. A query that starts at a secondary table
and joins back to yours never passes through it, so it carries no brand condition at all
and quietly reports the whole installation.

Call `brandScoped()` on such a query yourself. It qualifies the column with `table()`,
which is the side of the join the brand lives on:

```php
use Illuminate\Database\Query\Builder;

protected function itemsInPeriod(MetricQuery $query): Builder
{
    $from = $query->period->from;
    $to = $query->period->toExclusive();

    $rows = DB::table('invoice_items')
        ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
        ->when($from, fn ($r) => $r->where('invoices.issued_at', '>=', $from))
        ->when($to, fn ($r) => $r->where('invoices.issued_at', '<', $to));

    return $this->brandScoped($rows);
}
```

Invoices splits money over `invoice_items` exactly like this. Payments does the same over
`payment_items`, though it does not extend `TableMetric` at all and carries its own copy of
the scope, taking the table to qualify as an argument. Three more addons build a stock
figure ("how many at the end of the period") that never goes through `inPeriod()` either,
and call `brandScoped()` directly for the same reason: Entitlements, LeadHub and
Marketing.

The failure is invisible on a single-brand install and on the machine of whoever wrote the
metric. On a multi-brand one it showed as four invoices belonging to three other brands,
beside a correctly empty CRM, with nothing on the screen saying which tile to believe.
:::

## `zone()`

Which clock the timestamp column was written on.

```php
protected function zone(): ?string
{
    return 'UTC';
}
```

`null`, the default, means the application's own timezone. Say `'UTC'` if your columns are
stored in UTC regardless of where the site runs — [Entitlements](/entitlements/) does, and
so does the one Lead Magnets figure that counts on an entitlement's column rather than on
its own.

This matters for one thing and matters absolutely: `untilNow()` compares a stored
wall-clock against the current one, and the two have to be read off the same clock. A table
storing UTC under a site running on another zone was clamped against the wrong one — hours
of the newest rows lost on a host behind UTC, hours of the future counted on a host ahead
of it. Always silently, and never on the machine of whoever set the metric up, because on a
UTC site the two clocks agree.

Two addons had answered this by writing their own `untilNow()`. That is how the earlier
defects in that class reached only half the family; one line here instead.

## `untilNow()`

Opt-in, and named rather than done for you, because it is a decision only the metric can
make.

An open-ended period has no upper bound, and these tables are full of the future: a
pre-order starting next month, a licence expiring next year, a campaign scheduled for
Friday, an appointment on Monday. Counted without a clamp, the widest range reports all of
it as though it had already happened.

| | |
| --- | --- |
| **Clamp** with `untilNow()` when the figure answers **what happened** | sales, cancellations, confirmations, bounces, deliveries |
| **Do not clamp** when it answers **what is scheduled** | upcoming dates, due tasks, pending retries |

```php
public function value(MetricQuery $q): int|float|null
{
    return $this->untilNow($q)->count();   // "what happened"
}
```

Do not clamp *and mean it*. `events.occurrences` counts dates by when they take place, and
its chart points into the future whenever the period does — that is the whole reason a
calendar is read, and a screen that hid it would be lying by omission instead. It says so
in its own `description()`, which is what makes the difference between a decision and a
bug.

## Six house rules

The contract relies on these. They are what makes a dozen figures from a dozen packages
mean the same kind of thing on one screen.

### Null is not zero

Return `null` where the question does not apply. A refund rate in a period that took
nothing in has no answer, and `0 %` printed beside a refund amount is a statement its own
neighbour contradicts. An empty denominator is `null`, never zero.

### `available()` decides existence, not the value

A metric whose table is missing must say so there rather than return zero. *Nothing to
measure* and *measured nothing* are different statements.

It is **not** the place to answer a question about the data. An empty table, a filter that
matches nothing, a brand nobody has picked yet — all of those are answers, and their
answer is a number. Two addons once put the unresolved brand here and took twelve tiles
off the screen with it. A reader can make sense of a zero; he cannot notice something that
is not there.

### Do not fill your own gaps

`series()` returns only the buckets you have. Insights fills the rest with zero, for every
metric at once, so nobody has to remember that a chart built from the days with data draws
a bad month as a good one.

A bucket may be `null`, and that is not the same as leaving it out. Omitted means *nothing
happened here* and becomes a zero. `null` means *the question does not apply here* — a
rate on a day with no denominator — and stays null all the way to the screen, which draws
no bar rather than a bar of nothing.

### Ignore filters you do not understand

`MetricQuery::$filters` is free-form and a screen passes the same set to every metric on
it. One counting bookings has to shrug at a currency rather than fail.

### Say which brand you counted

Declare `brandColumn()`, or state in `description()` that the figure spans all brands.
Those are the two acceptable answers where the table has a brand at all; a table with no
`brand_id` has nothing to declare and nothing to leak. The unacceptable answer is a tile
whose table carries a brand, counts one or all of them, and does not say which.

### A rate is a cohort

Numerator and denominator both come from the rows the window selected — not from whatever
happened during the window.

> Of the sign-ups in these two weeks, how many confirmed?

Counted on the sign-up date, even when the confirmation arrived later. Measure the period's
traffic instead and a rate can exceed 100 %, which is a number nobody trusts twice.

There are exactly **two defensible departures**, and both have to be named in the metric's
own `description()` rather than left for the reader to work out:

1. **Leaving rows with no verdict yet out of the denominator.** A delivery still queued
   for a retry is neither a success nor a failure. Both `automations.success_rate` and
   `webhooks.success_rate` do this.
2. **Measuring a period's traffic on purpose**, where the cohort is genuinely not what
   anybody wants to know.

What is not defensible is a third answer arrived at by accident.

## The two optional interfaces

```php
interface HasBreakdowns    // "split this by campaign, by product, …"
interface HasFilterOptions // "these are the currencies you may filter me by"
```

Separate interfaces rather than methods on `Metric`, because most numbers are just a
number. A contract that demanded a breakdown from everybody would be answered with empty
arrays, and an empty array reads as *no data* rather than *not applicable*.

```php
public function breakdowns(): array
{
    return ['status' => __('Status')];   // keys are handles and go in URLs
}

public function breakdown(MetricQuery $query, string $dimension, int $limit = 20): array
{
    if ($dimension !== 'status') {
        return [];
    }

    $rows = $this->splitByColumn(
        $this->inPeriod($query), $query, 'status', 'count(*)', $limit,
    );

    return $this->labelled($rows, 'status');
}
```

`splitByColumn()` keeps the rows whose value is null, and `labelled()` gives them the words
you supply in `missingLabel()`. **A row whose value is null is a row.** A sale with no
campaign, a booking with no source: grouping them under one heading is honest, dropping
them makes the split disagree with the total and nothing on the screen says why.

Override `missingLabel()` per dimension. *No campaign* and *no source* read differently,
and a shared dash tells a reader nothing.

## Registering it

From your own service provider, guarded so that PHP never loads your metric classes when
Insights is absent. This is the shape all fourteen contributors share, written out on its own
rather than copied from one of them: no package's method is exactly this, because each carries
the part of its own wrapping that the next one does not need.

What they genuinely share is the body: guard on the facade, resolve the root, walk
`INSIGHTS_METRICS`, and swallow a failure into the log.

**The method's name and return type are not load-bearing.** Nothing reads either. Eleven write
the body as an anonymous `function (): void` inside `$this->app->booted(...)` and return
nothing at all; the bool below matters only to the three that retry.

**Where it is called from does matter.** Eleven call it straight out of
`$this->app->booted()`. Three cannot, and use the retry described further down: Events,
Entitlements, and Lead Magnets, which nests one `booted()` inside another to the same end.
Those three return a bool because the retry has to know whether it is done, and they keep the
flag this page insists on further below.

```php
$this->app->booted(fn () => $this->offerMetricsToInsights());
```

```php
protected function offerMetricsToInsights(): bool
{
    $facade = '\Goldnead\StatamicInsights\Facades\Insights';

    if (! class_exists($facade)) {
        return false;
    }

    try {
        $manager = $facade::getFacadeRoot();

        if (! is_object($manager) || ! method_exists($manager, 'registerMetric')) {
            return false;
        }

        foreach (self::INSIGHTS_METRICS as $class => $handle) {
            $manager->registerMetric($class, $handle);
        }

        return true;
    } catch (Throwable $e) {
        Log::warning('my-addon: the insights metrics could not be registered.', [
            'exception' => $e->getMessage(),
        ]);

        return false;
    }
}
```

Four things in it are deliberate.

**`class_exists` on the facade, not on your metric class.** This is the whole of what keeps
the coupling optional in your direction: your metric classes name Insights' contract in
their `extends` and their type hints, so PHP must never reach the file when the sibling is
absent. The guard is what prevents it. Put Insights in `suggest`, never in `require` — a
calendar on an artist's website installs without a dashboard.

**`method_exists` on the facade *root*, not on the facade.** A facade forwards through
`__callStatic` and declares none of what it forwards, so `method_exists($facade, …)` is
always false and the probe would silently never register anything. Ask the object.

**Deferred to `$this->app->booted()`.** Insights' own container bindings only exist once
its provider has booted, and a sibling that registers earlier registers into nothing.

**Wrapped in a `try`, and returning a bool rather than throwing.** A contributor
mid-upgrade should cost its own tiles and a line in the log, never the page. Insights
contains failures per metric on the reading side for the same reason.

::: warning If your provider runs inside `Statamic::booted()`
`Application::booted()` fires a callback **immediately** when the application has already
booted. A registration deferred that way then runs at once — before the thing it was
waiting for — and registers into nothing, silently, which is the worst shape this failure
could take.

Three contributors carry a defence against it. `statamic-events` and
`statamic-entitlements` use the shape below; `statamic-lead-magnets` nests one `booted()`
inside another and keeps the same flag. The trigger is the same in each case: Statamic
invokes an addon's `bootAddon()` from inside a `Statamic::booted()` callback. The answer is
to attempt directly first, then hang the same attempt on both later moments, and to
remember on the provider whether it has succeeded so the repetition is free:

```php
protected bool $insightsMetricsRegistered = false;

protected function registerInsightsMetrics(): self
{
    if ($this->offerMetricsToInsights()) {
        return $this;
    }

    $this->app->booted(fn () => $this->offerMetricsToInsights());
    Statamic::booted(fn () => $this->offerMetricsToInsights());

    return $this;
}
```

Keep the flag on the provider. Without it the attempt is not idempotent, and under Octane a
worker that registered once can spend the rest of its life registering nothing.
:::

## What happens if Insights is not installed

Nothing. Your addon boots, the guard returns false, and your metric classes are never
loaded. Nothing in your Control Panel changes and no feature of yours depends on the
sibling being there.

The reverse holds too. Remove your addon from an install that has Insights and the only
thing that disappears is your group on the Metrics screen. The coupling is `suggest` in
both directions, and it is a class name and a method probe — never a Composer requirement.
