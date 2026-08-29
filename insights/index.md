# Insights

<AddonHeader />

One screen that answers the question a shop owner actually asks: **which campaign sold
anything?**

It reads what [Payments](/payments/) already records. No migrations, no second copy of
anything, no export.

<Figure
  src="insights-revenue"
  alt="The revenue screen: net revenue, paid, orders and average order over a bar chart, with revenue by campaign and by product below"
  caption="Four figures, each beside the same figure for the period before. A revenue number on its own says nothing." />

## What it is for

The addon family writes down a great deal and adds up none of it. Payments knows every
amount, every product, every campaign — and until this addon there was not a single sum
query anywhere in its Control Panel. Revenue lived in a listing you scrolled.

Insights is the missing arithmetic, and nothing else. It computes no money and stores no
money; it groups rows that already exist.

## The three decisions it states out loud

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

## What it shows

| | |
| --- | --- |
| **Net revenue** | Paid minus refunded, in the period |
| **Paid** | What came in, before refunds |
| **Orders** | How many, and how many distinct buyers |
| **Average order** | Paid divided by orders |

Each with the same figure for the period immediately before it, because a revenue number
alone says nothing.

Then **over time** — one bar per day, or per month over long ranges, including the days
that earned nothing. **By campaign**, which is the reason the addon exists. And **by
product**, split across line items so an order bump is credited to itself and not to the
product it was attached to.

<Figure
  src="insights-attribution"
  alt="Two lists side by side: revenue by campaign with source and order count, revenue by product with quantity"
  caption="A sale with no campaign is grouped, never dropped. Percentages are shares of the total, not of the biggest row." />

## With LeadHub

Every contact who has paid gets a **Revenue** panel on their own screen: lifetime revenue,
purchases, refunds, first and last purchase. See [On the contact screen](/insights/contact-panel).

The numbers are the CRM's own ledger. This addon arranges them where somebody is already
looking; it does not compute them, and LeadHub never learns that this addon exists.

<Figure
  src="insights-contact-revenue"
  alt="A Revenue panel on a LeadHub contact screen showing lifetime revenue, purchases, refunded amount and the first and last purchase dates"
  caption="Contributed through LeadHub's own panel registry. A contact who never paid gets no panel at all." />

## What it deliberately does not do

- **No funnels, cohorts or retention.** Those belong over [Activity](/activity/)'s
  event ledger, which is a different set of facts. This addon reports money.
- **No forecasting.** Every number here happened.
- **No export scheduler.** The period and currency live in the URL; a browser can print.
