# Insights

<AddonHeader />

The suite's reporting layer. Fourteen addons contribute **fifty-eight figures** between
them; this addon owns the period, the comparison against the period before, the chart, the
splits, the formatting and the screens.

It owns no data at all. Every number on it is a query living in the addon that owns the
table.

<Figure
  src="insights-metrics"
  alt="The Metrics screen: figures grouped by contributing addon, each tile showing a number, its change against the previous period and a sentence explaining what it counts"
  caption="One group per contributing addon, sorted by heading so that installing one never reshuffles the others." />

## Two screens

**Revenue** is the curated one: the report you open with a question in mind, laid out to
answer it. **Metrics** lists everything anybody registered, grouped by contributor, each
with a detail view carrying its chart and any splits it offers.

The difference is editorial, not technical. Both are assembled from the same registered
metrics, and a figure contributed tomorrow appears on the second one without a line of this
addon changing.

| | |
| --- | --- |
| [Revenue](/insights/reading-the-numbers) | Net revenue, paid, orders, average order, over time, by campaign, by product |
| [Metrics](/insights/what-the-family-reports) | All fifty-eight, in fourteen groups |

<Figure
  src="insights-revenue"
  alt="The revenue screen: net revenue, paid, orders and average order over a bar chart, with revenue by campaign and by product below"
  caption="The curated screen. Four figures, each beside the same figure for the period before, because a revenue number on its own says nothing." />

## What it owns, and what it does not

| Insights owns | The contributing addon owns |
| --- | --- |
| The period, and the comparison against the one before it | The query |
| The chart, including the buckets that had nothing in them | The timestamp a row is dated on |
| The splits, once a metric says which it offers | Which brand a row belongs to |
| Formatting: counts, money in minor units, percentages, durations | Whether the figure applies at all |
| The screens, present and future | What the number means, in one sentence |

The consequence worth stating: money is computed in
[Payments](/payments/), invoiced totals in [Invoices](/invoices/), delivery rates in
[Webhook Manager](/webhook-manager/). This addon adds nothing up that somebody else has not
already added up, which is why a figure here agrees with the listing it came from.

## The coupling is optional in both directions

Neither side names the other in `require`. It is a class name and a method probe.

- **Without a contributing addon**, its group is the only thing missing. Nothing errors,
  and the rest of the screen is unaffected.
- **Without Insights**, nothing is missing from the contributing addons. Their metric
  classes are never loaded, because the `class_exists` guard in each service provider stops
  PHP before it reaches the file.

A failure is contained per metric as well: a contributor mid-upgrade costs its own tile and
a line in the log, never the page.

Adding your own figure — from an addon of the suite or from your own package — is
[Contributing a metric](/insights/contributing-a-metric).

## The three decisions the revenue screen states out loud

Every figure on a revenue report is the answer to a question that could be asked three
ways. The screen names which way it chose, rather than leaving a surprised reader to
suspect a bug.

> **A sale counts on the day it was paid. A refund counts on the day the money went back.**

So a period can carry a refund for a sale it never contained, and net revenue can fall
below zero. When it does, the screen says why. The alternative — crediting a refund against
its sale — means a closed month changes after it was read, and a reported number that moves
is worse than one that is merely inconvenient.

> **Two currencies are never added together.**

100 EUR plus 100 CHF is a number with no meaning. The report shows one currency and puts
the others on screen by name.

> **Missing is missing.**

A sale with no campaign is grouped under *no campaign*, never dropped. A report that
quietly excludes rows is the hardest kind of wrong to notice: the total and the table
disagree, and nothing says why.

The full set is in [Reading the numbers](/insights/reading-the-numbers).

<Figure
  src="insights-attribution"
  alt="Two lists side by side: revenue by campaign with source and order count, revenue by product with quantity"
  caption="A sale with no campaign is grouped, never dropped. Percentages are shares of the total, not of the biggest row." />

## With LeadHub

Every contact who has paid gets a **Revenue** panel on their own screen: lifetime revenue
and how many purchases, plus refunds and the first and last purchase where there is
anything to show. See [On the contact screen](/insights/contact-panel).

The numbers are the CRM's own ledger. This addon arranges them where somebody is already
looking; it does not compute them, and LeadHub never learns that this addon exists.

<Figure
  src="insights-contact-revenue"
  alt="A Revenue panel on a LeadHub contact screen showing lifetime revenue, purchases, refunded amount and the first and last purchase dates"
  caption="Contributed through LeadHub's own panel registry. A contact who never paid gets no panel at all." />

## What it deliberately does not do

- **It stores nothing.** No tables, no migrations, no cache, no scheduled job. Every figure
  is computed when the screen is requested, from rows another addon already wrote. There is
  no second copy of anything to fall out of step.
- **It computes no money.** The arithmetic lives with the data. An analytics addon reading
  another addon's operational tables directly is the coupling this whole design exists to
  avoid, and the version of this addon that did it lasted one day.
- **No forecasting.** Every number here happened, or — where a metric says so — is
  scheduled to. Nothing is projected, smoothed or extrapolated.
- **No export scheduler and no e-mailed report.** The period and the currency live in the
  query string, so a view can be bookmarked, pasted into a message or printed by the
  browser. Nothing is delivered on a timer.
- **No per-visitor analysis.** Where people click, how long they stayed, who came back —
  none of that is here. It is a different set of facts, and it lives over
  [Activity](/activity/)'s event ledger.

::: tip Funnels are the exception worth naming
This page used to say "no funnels". That stopped being true when
[Funnels](/funnels/) began contributing its own figures: entries, completions and a
completion rate now appear here like any other group.

The distinction that survives is the one that mattered all along. A contributing addon may
report *anything it can count*, funnel steps included. What this addon does is not count.
:::
