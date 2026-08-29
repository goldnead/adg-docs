# What the family reports

<AddonHeader />

Fourteen addons register **fifty-eight figures** between them. This page lists all of
them: the handle, what the screen calls it, how it is formatted, and what it actually
counts.

Nothing here is computed by Insights. Every row is a query living in the addon that owns
the table. The last column paraphrases what each metric says about itself on screen; where
the wording matters, the tile's own sentence is the one to trust.

::: tip Handles are semver-locked
A handle is fixed from the moment it is registered. It ends up in the URL of a metric's
detail view, which means it ends up in bookmarks and in links people paste to each other.
Refer to a figure by its handle, not by its label: the label is translated and can be
reworded, the handle cannot.
:::

## Reading the tables

**Unit** is a formatting rule and not a meaning. `count` prints with thousands
separators, `currency` is minor units of the metric's own currency, `percent` is a number
between 0 and 100 that the metric divided itself, `duration` is whole seconds.

**Splits** are the dimensions a figure can be broken down by on its detail view. Most
figures have none, which is not an omission: most numbers are just a number.

The sections are in the order the Metrics screen puts them, which is alphabetical by
heading. Three headings are not the addon's name at all: LeadHub files under *CRM*,
Marketing under *Newsletter*, Webhook Manager under *Webhooks*. A heading is what a reader
calls the subject, not what the package is called.

<Figure
  src="insights-metrics"
  alt="The Metrics screen: figures grouped by contributing addon, each tile showing a number, its change against the previous period and a sentence explaining what it counts"
  caption="Every group on this screen comes from a different addon. Remove one and its group is the only thing that disappears." />

## Automations

From [Automations](/automations/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `automations.runs` | Runs | count | Automation runs that started in the period. Test runs are not counted. |
| `automations.failures` | Failed runs | count | Runs that ended with an error. A run a stop node ended left the flow and is not a failure. |
| `automations.success_rate` | Success rate | percent | Of the runs that reached a verdict, the share that succeeded. |
| `automations.duration_p50` | Run time (median) | duration | The run in the middle, in seconds. Always an actual run, never an interpolated value. |
| `automations.opt_outs` | Series opt-outs | count | People who left a single automation without unsubscribing from anything else. |

Splits: runs by status, trigger and automation; failed runs by automation and trigger.

## Bookings

From [Booking](/booking/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `booking.scheduled` | Appointments | count | Appointments that fall into the period, counted on the day they take place. |
| `booking.cancelled` | Cancellations | count | Bookings that were called off, counted on the day the cancellation arrived. |
| `booking.cancellation_rate` | Cancellation rate | percent | Of the appointments falling in this period, the share that fell through, whenever the cancellation was made. |
| `booking.hours_booked` | Hours booked | duration | How much time the period's appointments take up. Cancelled ones do not count. |

Splits: appointments by status and endpoint.

The rate is deliberately **not** "cancellations divided by appointments". The two tiles
are dated differently — one on the day of the appointment, the other on the day the
cancellation arrived — so dividing them would compare two different sets of bookings.

## Consent

From [Consent](/consent/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `consent.decisions` | Decisions | count | Cookie decisions made in the period. The decision is counted, not the person. |

Splits: by the consent version the decision was recorded under, by how it was given, by site.

## CRM

From [LeadHub](/leadhub/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `leadhub.contacts_created` | New contacts | count | Contacts created in the period, by the day they entered the CRM. |
| `leadhub.contacts_active` | Active contacts | count | Contacts on the list at the end of the period, archived and merged records excluded. A stock, not an event. |
| `leadhub.opportunities_won` | Deals won | count | Opportunities that closed as a win, counted on the day they were won. |
| `leadhub.opportunity_value_won` | Value won | currency | Estimated value of the deals won in the period. An estimate entered by hand, not revenue taken. |
| `leadhub.tasks_completed` | Tasks completed | count | Tasks ticked off in the period, by the day they were finished. |
| `leadhub.score_changes` | Score changes | count | How often a contact's engagement score moved in the period. |

Splits: new contacts by status, source, `utm_source` and `utm_campaign`.

**Value won is not revenue.** It is what somebody typed into the opportunity, and it will
not agree with [Payments](#payments) — deliberately, because a pipeline forecast and a
bank statement are different claims.

## Entitlements

From [Entitlements](/entitlements/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `entitlements.granted` | Access granted | count | Grants whose access window began in the period. A grant still awaiting confirmation has no beginning and counts once it is confirmed. |
| `entitlements.revoked` | Access revoked | count | Grants withdrawn in the period, counted on the day of the revocation. |
| `entitlements.expired` | Access expired | count | Grants whose expiry fell inside the period and which were not revoked before it. |
| `entitlements.active` | Active grants | count | The holding at the end of the period: begun, not expired, not revoked. A stock, not an event. |

Splits: grants by product and source; revocations by reason.

## Events

From [Events](/events/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `events.published` | Published events | count | Events that became visible in this period. Drafts are not counted: an event nobody can see has not happened. |
| `events.occurrences` | Dates | count | Dates that fall in this period, cancelled ones included, counted by when they take place. |
| `events.cancelled` | Cancelled dates | count | Dates called off in this period, counted on the day the cancellation went out rather than the day they would have been. |

Splits: published events by type; dates by status.

`events.occurrences` is dated on when a date takes place, so its chart points into the
future whenever the period does. See [the exceptions](#three-exceptions-that-are-decisions)
below.

## Funnels

From [Funnels](/funnels/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `funnels.visits` | Funnel visits | count | Walks that began in the period, one per visitor and funnel. |
| `funnels.completed` | Funnels completed | count | Walks that reached the end, counted on the day they finished. |
| `funnels.completion_rate` | Completion rate | percent | Of the walks that began in the period, the share that reached the end. |
| `funnels.step_events` | Step events | count | Every recorded step of a walk: entered, submitted, accepted, declined, completed. |

Splits: visits by funnel; step events by kind of event.

The completion rate is a cohort of the walks that *started* in the window, so a walk begun
in the period and finished after it still counts as a completion. Funnels' own
[Where people stop](/funnels/analytics) screen answers the per-step question this figure
does not.

## Invoices

From [Invoices](/invoices/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `invoices.issued` | Documents issued | count | Invoices and credit notes dated into this period. A count of documents, so a credit note counts as one of them. |
| `invoices.net` | Net invoiced | currency | Net amounts dated into this period, less what credit notes took back. |
| `invoices.gross` | Gross invoiced | currency | Gross amounts dated into this period, less what credit notes took back. |
| `invoices.tax` | VAT invoiced | currency | The tax shown on this period's documents, less what credit notes took back. |

Splits: documents by kind; the money figures by buyer country, and VAT also by tax rate.
All four take a currency filter.

Dated by **invoice date**, which is not the day the money arrived. A figure here and the
matching one under [Payments](#payments) answer different questions and are expected to
differ.

## Lead magnets

From [Lead Magnets](/lead-magnets/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `lead_magnets.requested` | Requested | count | Freebies last requested in the period. A second request from the same address for the same resource replaces the first: one row per address and resource. |
| `lead_magnets.confirmed` | Confirmed | count | Confirmations in the period, counted at the moment access opened. Not every confirmation belongs to a request from the same period. |
| `lead_magnets.downloads` | Downloads | count | Files handed over in the period. Somebody who downloads twice counts twice. |
| `lead_magnets.confirm_rate` | Confirmation rate | percent | Confirmations against the period's requests. With no requests there is no value. |

Splits: requests by resource.

## Newsletter

From [Marketing](/marketing/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `marketing.subscribed` | Confirmed sign-ups | count | Subscriptions confirmed in the period, by the day consent was given. |
| `marketing.unsubscribed` | Unsubscribes | count | Subscriptions ended in the period, by the day the person left. |
| `marketing.subscribers_active` | Subscribers | count | Confirmed subscriptions still standing at the end of the period. A stock, not an event. |
| `marketing.mails_sent` | Mails sent | count | Individual mails handed to the relay. Ten thousand recipients of one newsletter are ten thousand mails. |
| `marketing.open_rate` | Open rate | percent | How many of the mails sent were opened by a person. Machine opens do not count. |
| `marketing.click_rate` | Click rate | percent | How many of the mails sent had a link followed. |

Splits: sign-ups and unsubscribes by list; mails sent by campaign.

## Notifications

From [Notifications](/notifications/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `notifications.sent` | Sent | count | Notifications that went out in this period. |
| `notifications.read` | Read | count | Reading that happened in this period, including on older notifications. |
| `notifications.read_rate` | Read rate | percent | Of what went out in this period, the share that has since been read. |
| `notifications.digests` | Digests | count | Digest e-mails that actually went out. A run recorded but never sent is not counted. |

Splits: sent by notification type.

**Read is not the numerator of the read rate**, and the two will not divide into each
other. *Read* is dated on the reading and includes older notifications; the rate is a
cohort of what was sent in the window.

## Payments

From [Payments](/payments/). These seven are also what the curated
[Revenue screen](/insights/) is assembled from.

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `payments.revenue_gross` | Revenue | currency | What came in during the period, counted on the day of payment, before refunds. |
| `payments.revenue_net` | Net revenue | currency | The period's revenue less the period's refunds. A refund counts on the day the money went back, even when the purchase is older. |
| `payments.refunded` | Refunds | currency | What was paid back during the period, counted on the day of the refund. |
| `payments.refund_rate` | Refund rate | percent | Refunds against the period's revenue. With no revenue there is no value. |
| `payments.orders` | Orders | count | Confirmed payments in the period. An order bump in the same checkout is one order, not a second. |
| `payments.buyers` | Buyers | count | Distinct addresses that bought during the period. Somebody who bought twice counts once. |
| `payments.average_order` | Average order value | currency | Revenue divided by orders. With no orders there is no value. |

Splits: revenue by campaign, source, product and country; orders by campaign and product.
All seven take a currency filter, and two currencies are never added together.

Why a refund is dated on the refund and not on the sale it undoes is the longest answer in
[Reading the numbers](/insights/reading-the-numbers#a-refund-counts-on-the-day-it-went-back).

## Suppression

From [Suppression](/suppression/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `suppression.events` | Suppression events | count | What happened in the period: blocks, releases, soft bounces, re-blocks, imports. Counted at the provider's moment, not at the moment it was stored. |
| `suppression.active` | Blocked addresses | count | Addresses that could not be mailed at the end of the period: blocked, not released, not expired. A stock, not an event. |

Splits: events by event type, reason and source.

Both figures count **across every brand**. See [below](#three-exceptions-that-are-decisions).

## Webhooks

From [Webhook Manager](/webhook-manager/).

| Handle | Figure | Unit | What it counts |
| --- | --- | --- | --- |
| `webhooks.deliveries` | Deliveries | count | Events that had to go out in this period, dated by when the event happened rather than by when it was last retried. |
| `webhooks.failures` | Failed deliveries | count | Deliveries that gave up for good. One still waiting for a retry is not counted, and neither is one somebody cancelled. |
| `webhooks.success_rate` | Success rate | percent | Of the deliveries that reached a verdict, the share that arrived. |
| `webhooks.latency_avg` | Response time (average) | duration | How long a delivery took on average. |

Splits: deliveries by status.

The metric returns seconds to one decimal, and the screen rounds: an average under half a
second reads `0 s`. The exact milliseconds and the p50/p95/p99 percentiles are on Webhook
Manager's [own insights screen](/webhook-manager/deliveries#insights), which is a different
screen with a different job.

## Three exceptions that are decisions

Three places where a figure does not do what the rest of the screen does, on purpose. Each
is stated in the metric's own description, so a reader of the tile sees it without coming
here — but they belong together in one place, because they are the figures that will not
add up the way you would expect.

The rules they depart from are in
[Contributing a metric](/insights/contributing-a-metric#six-house-rules).

### Suppression counts across every brand

Every figure whose table carries a brand is narrowed to the one in the switcher. The
`suppressions` tables carry one and are not narrowed anyway, so both figures are the whole
installation's.

`brand_id = 0` in that addon does not mean *no brand*, it means *every brand*, and that is
how a hard bounce is recorded: an address that does not exist does not exist for any of
them, and the send path refuses it for all of them. The suppression models read
`brand_id in (0, current)` for exactly that reason.

`brandColumn()` cannot express that. It offers a column and an equality, not a set, so
declaring it would compare `brand_id = current` and drop every global row — the hard
bounces, which are the bulk of any real list — leaving a figure that reads low and looks
fine. The alternative, transcribing the brand manager's decision ladder into that package a
second time, is the copying that left these metrics three repairs behind the window they
inherited.

So the two figures stay unfiltered until the base class can express a set, and both say so
in their own description. It is not a leak: a suppressed address is a fact about the
address rather than about a brand's data.

### Events does not clamp the future

A figure that answers *what happened* clamps its window at this moment, so that an
open-ended period cannot reach past it. A licence that expires next year has not expired,
and a chart that drew it as though it had would be lying. Eight of the fourteen
contributors clamp somewhere; the rest count on columns that cannot hold a future date.

Events clamps nothing, and `events.occurrences` is why. It counts dates by when they take
place, and the question a calendar is read for is *what is coming*. Clamped, the widest
range would show an empty next month for a season already sold out. So the figure runs to
the end of the period it was given, and its chart points into the future whenever the
period does — which its own description says out loud.

`booking.scheduled` is dated the same way, on the appointment rather than on the booking,
and points forwards for the same reason. Both are the deliberate case the base class names:
do not clamp when the figure answers *what is scheduled*.

### Two success rates leave the undecided out of the denominator

`automations.success_rate` and `webhooks.success_rate` are shares of the runs and
deliveries that **reached a verdict**. A run still waiting in a delay, or a delivery
queued for a retry, is neither a success nor a failure, and putting it in the denominator
would report a rate that climbs on its own overnight as the queue drains.

The consequence to know: `failures ÷ deliveries` will not give you `1 − success_rate`.
The tiles count everything; the rate counts what has been decided.
