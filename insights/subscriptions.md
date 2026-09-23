# Subscription figures

<AddonHeader />

A screen of its own, **Tools → Insights → Subscriptions**, and four reports in a
**Subscriptions** group on the Reports screen. Both read the `subscriptions` table of
[Payments](/payments/) and the charges made on it.

<Figure
  src="insights-subscriptions"
  alt="The Subscriptions screen: eight tiles for MRR, ARR, running and new subscriptions, customer and revenue churn per month, charges due in 30 days and a twelve-month forecast, above a bar chart of MRR over the last twelve months"
  caption="Eight figures, each with the sentence that says what it counts, and MRR at the end of every month below them. One currency at a time." />

## What the screen shows

| Tile | What it counts |
| --- | --- |
| Monthly recurring revenue (MRR) | What all running subscriptions bring in per month. Quarterly and yearly ones pro rata, without payment plans and trials. |
| Annualised (ARR) | MRR times twelve. |
| Running subscriptions | Subscriptions paying today. Trials, pauses and payment plans are not in it; trials are named underneath. |
| New subscriptions | Started in the period, counted from the first charge. |
| Customers cancelling per month | The share of paying customers who cancelled, as a monthly rate. |
| Subscription revenue lost per month | Cancelled and reduced MRR against the MRR at the start of the month. Pauses do not count. |
| Due in 30 days | Every charge of running subscriptions and payment plans in the next 30 days, at today's price. |
| Forecast 12 months | What running subscriptions and payment plans will charge in the next twelve months if nothing changes. |

Below the tiles: MRR at the end of each month, the change in the period broken into its
movements, where subscriptions stand now (running, trial, paused, suspended, cancelled,
running payment plans), the charges due in the next 30 days and the forecast by month.
**Month by month** in the header opens the movements report.

The period and the currency live in the query string, like on the revenue screen:
`/cp/insights/subscriptions?period=12m&currency=CHF`. Every figure is narrowed to the
current brand.

## The four reports

| Handle | Rows |
| --- | --- |
| `payments.mrr_movements` | Recurring revenue by month: start, new, reactivated, expansion, contraction, churned, paused, change, end |
| `payments.subscription_cohorts` | Retention by start month: subscriptions started, and the share still running after 1, 2, 3, 6 and 12 months |
| `payments.upcoming_charges` | Every charge due in the next 30 days, subscription or instalment |
| `payments.subscription_forecast` | The next twelve months, charges of subscriptions and of payment plans, and the total |

Each shows **one currency at a time**, with a switch above the table rather than a currency
column. Without Payments, or without its `subscriptions` table, the reports stay on the
list and name the package they need, like the other six.

## The rules

These were fixed before the figures were built. A figure whose rule changes with the
implementation is not a figure.

> **MRR is the cycle price times the rhythm's monthly factor.**

A quarterly subscription counts a third, a yearly one a twelfth, a weekly one 52/12.
The sum is rounded once, so three weekly subscriptions do not lose a cent each. A rhythm
that cannot be read counts as one month, the same fallback Payments uses when it schedules
the next charge.

> **Payment plans and trials are not MRR.**

A plan ends by design. Its instalments appear in the charges due and in the forecast, on a
line of their own. A trial counts from its first charge; a subscription the provider never
confirmed (`initiated`) never counts.

> **The price at a moment is what the latest renewal charged.**

Not the checkout: the first payment can carry an order bump, a setup fee or a first-payment
discount, so before the first renewal the price is that renewal's. With no renewal yet, the
price on the subscription row. A charge marked `meta.proration`, the settling-up when a
customer switches plans, is not a price and is skipped.

::: tip A coupon that ends shows up as expansion
A coupon limited to the first few payments lowers those renewals. When it runs out, the next
renewal charges the full price, and the difference appears as **expansion** in that month.
Nobody upgraded; the discount ended. The same rule is what makes a real price change show up
at all.
:::

> **A subscription starts at its first paid charge.**

The first charge that cost something, or `starts_at` when nothing has been paid yet.
Payments sets `starts_at` one rhythm after the checkout, and counting from there would start
every subscription a month late.

> **Two currencies are never added.**

There is no exchange rate anywhere in the suite, and which day's rate turns last March's
francs into euros has no right answer for a trend line. Every figure is asked for one
currency; the switch offers every currency a subscription runs in, the busiest first.

> **A pause is not churn.**

A paused subscription, one suspended after a failed payment, and one in a status this addon
does not know are **held**: they leave MRR as their own movement, *Paused or suspended*, and
count as retained. Only an ended subscription is churn. When a pause ends, the amount comes
back in the same column with a plus, never as new revenue.

An unknown status word is counted as paused rather than as cancelled, and the screen names
it: *Counted as paused, because this addon does not know the status: …*. Counted as churn,
a new status in Payments would read as a wave of cancellations on the day it ships.

Pauses a subscription came back from are read from `meta.pauses`, which Payments writes on
resuming, one `{paused_at, resumed_at}` per pause. Inside such a window the subscription is
held, not active. A subscription cancelled during a pause stopped paying when the pause
began (`paused_at`).

> **Movements are summed month by month.**

Compared end to end, a subscription that started in March and went up in June would be one
"new" at the June price and no expansion at all. So the window is cut at every month
boundary and the movements of each piece are added up. The table reconciles by
construction: start + new + reactivated + expansion − contraction − churned − paused = end.

A second subscription of the same person is new MRR. A person who had left and comes back on
a new subscription is **reactivated**.

> **Churn is a rate per month.**

Customer churn: of the people paying at the start of a month, the share paying nothing at
its end and holding nothing either. Customers are counted by e-mail address. Revenue churn:
churned plus contracted MRR over the MRR at the start of the month.

Over a window of several months the figure is the day-weighted mean of the months. A window
shorter than its month is compounded up to the month, `1 − (1 − r)^(days of month / days
covered)`, so a rate can never pass 100 %. Linear scaling would treat the people who already
left as still there to leave again.

> **Nothing is read at the database's clock.**

The database only selects rows; every date is compared in PHP. The figures are the same on
SQLite, MySQL and PostgreSQL, and the subscription tests run against all three.

## Limits worth knowing

- All subscriptions of one brand are loaded into memory to be reconstructed. That is fine
  into the thousands.
- The table records a subscription's present, not its history. A subscription that came
  back from a **suspension** carries no record of the gap; it is treated as having run
  through.
- *plus n paused or suspended* under customer churn counts moves into a pause or a failed
  card during the period, month by month, including subscriptions that have come back since.
  It is a count of events, not of people held today; *Where subscriptions stand* has those.
- MRR and ARR are not on the Metrics screen. The metric contract has no currency, and these
  figures are nothing without one.
