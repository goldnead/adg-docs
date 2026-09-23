# Commissions

<AddonHeader />

A commission is booked when [Payments](/payments/) dispatches `PaymentPaid` for a payment that
has a referral (see [Attribution](/affiliates/attribution)). Every write is keyed, so a payment
booked twice is booked once, and a refund applied twice takes back once.

## The rate

Per product under **Affiliates → Commission Rates**, otherwise the default from the settings
(`commissions.default`). A rate row names the product the way Payments does, for example
`offer:cw-stimmgruppe` or `cw-notenpaket`, and has:

| Field | |
| --- | --- |
| Type | A **percentage** of the net amount, or a **fixed amount** once per sale (not once per line). |
| Renewals | **None**, **the first *n***, or **all**, optionally with a percentage of their own. |
| Bumps | Whether an order bump of this product earns, with a percentage of its own if wanted. |
| Upsells | Whether an accepted follow-up offer of this product earns. |
| Active | An inactive row is ignored and the default applies. |

**Net** is the amount paid, less `commissions.vat_percent`. Leave that at `0` when your prices
carry no VAT.

**Which product's rate.** A bump earns at the bump product's rate, an upsell at the rate of the
product sold in the upsell. An upsell is a sale of its own.

### A partner's own percentage

A partner can carry a percentage of their own, set on the partner's edit screen. By default
(`commissions.partner_rate: main`) it replaces only the main rate of a sale and of an upsell.
Bump and renewal rates stay the product's: a better rate on the course is not a promise about
every add-on and every month after. `partner_rate: all` makes it replace every rate.

### Renewals

"The first *n*" counts paid renewals that were not refunded. A refunded renewal frees no money
and uses up none of the *n*. A plan switch in Payments earns within the commissioned period but
is no cycle, so it uses up none of them either.

### Own purchases

Partners do not earn on purchases made with their own address unless
`commissions.self_referral` is on. Own purchases also do not count as sales in the partner's
figures.

## Kinds

| Kind | Label | |
| --- | --- | --- |
| `sale` | Sale | The first payment. |
| `recurring` | Renewal | A subscription renewal or a plan switch. |
| `bump` | Bump | An order bump on the same payment. |
| `upsell` | Upsell | An accepted follow-up offer. |
| `jv` | JV share | A [joint venture](/affiliates/joint-ventures)'s share. |
| `clawback` | Clawback | A negative row: what a refund took back after the payout. Its rate reads "offset" and it has no base of its own. |

## From booked to paid

| Status | Shown as | |
| --- | --- | --- |
| `pending` | On hold | Booked, waiting `commissions.hold_days` (30). |
| `approved` | Payable | The hold period is over. Goes on the next payout list. |
| `paid` | Paid out | On a list marked as paid. |
| `reversed` | Reversed | Taken back in full by a refund, a chargeback or by hand. |

The move from on hold to payable is made by `affiliates:release`, and by the Commissions and
Payouts screens whenever they are opened. See
[Installation → The scheduler](/affiliates/installation#the-scheduler).

Each commission keeps the sale date (`sold_at`) apart from the booking date, the base it was
taken from and the rate that applied, so a figure can be traced back.

## Refunds and chargebacks

- **Before the payout**, a refund reverses the commission. A partial refund takes back the
  same share: half the payment refunded, half the commission gone.
- **On an open payout list**, the list is recomputed: it owes less now. A list that this drives
  to zero, below zero or below the minimum is dissolved, and its commissions wait for the next
  one.
- **After the payout**, the commission cannot change. What the refund takes back becomes a
  negative **clawback** row, and the next payout list deducts it. Only what went out comes back:
  a share already reversed before the payout, or taken by an earlier clawback, is not taken twice.

A chargeback in Payments is treated like a refund. A sale refunded in full is no sale in the
partner's figures.

## By hand

**Cancel** in a commission's row menu reverses it, for example for a sale you know was a
mistake. It is offered only for a commission on hold or payable that is not on a payout list,
and needs `manage affiliate payouts`.

## Mail

With `mail.commission` on, the partner gets a mail per commission, unless they switched it off
in their partner area. It goes out through the sender identity of the partner's brand and never
names the buyer.
