# Affiliates

<AddonHeader />

A partner programme for Statamic 6. Partners send buyers through a link or their own coupon
code and earn a commission per product: on the first payment, on subscription renewals, on
order bumps and on upsells. A refund takes the commission back, a hold period keeps it until
the withdrawal period is over, and a payout list says who is owed what. Joint-venture
contracts share the revenue of chosen products with a partner without any link at all.

<Figure
  src="affiliates-commissions"
  alt="The Commissions listing with sale date, partner, kind (sale, bump, JV share), product, base, rate, amount and a status of paid out or on hold"
  caption="Commissions in the demo. Each row keeps the base it was taken from and the rate that applied, so a figure can be traced back to the sale." />

## What it is

- **Partners** who sign up on your site or are invited from the Control Panel. Sign-ups wait
  for approval or are active at once. See [The partner area](/affiliates/partner-area).
- **Attribution from two places, never from a request field**: a tracking link, remembered in
  a cookie only with the visitor's consent, and a coupon code that belongs to a partner. See
  [Attribution](/affiliates/attribution).
- **Commissions per product**: a percentage of the net amount or a fixed amount, renewals
  (none, the first *n*, all), bumps and upsells, a partner's own percentage. See
  [Commissions](/affiliates/commissions).
- **A hold period and reversals.** A refund inside the hold period reverses the commission, a
  partial refund the same share. After a payout it becomes a negative row the next list
  deducts.
- **Joint-venture contracts**: a share of the net revenue of chosen products, with a term. See
  [Joint ventures](/affiliates/joint-ventures).
- **Payout lists** per partner and currency, with a minimum, a CSV export and "mark as paid".
  See [Payouts](/affiliates/payouts).
- **Screens in the Control Panel** for partners, commissions, payouts, rates and JV contracts,
  and a tab on the suite's settings screen. See [The Control Panel](/affiliates/control-panel).

## What it is not

- **Not a payment system.** The addon moves no money. It keeps the books; you pay by bank
  transfer or PayPal from the CSV and mark the list as paid.
- **Not useful without [Payments](/payments/).** Commissions come from Payments' events. The
  addon installs without it, but nothing is ever attributed.
- **Not a click tracker.** A click is counted once per visit, with the landing path only: no
  IP address, no user agent.

## How it fits

```
?ref={code} on any page            coupon code on the order
/!/affiliates/go/{code}?to=/path   (statamic-offers, owned by a partner)
  → cookie (with consent)            │
    or the visit's session           │
  → checkout creates the payment:    │
    referral written against it      │
                                     ▼
PaymentPaid ───────────────► commission, "on hold"
                              (renewals and follow-ups inherit
                               the referral of the first payment)
hold_days later ───────────► payable  (affiliates:release, or any screen)
PaymentRefunded / ChargedBack → reversed, or a claw-back row after payout
Create Payout List ─────────► CSV → you pay → mark as paid
```

## Next

- [Installation](/affiliates/installation)
- [Configuration](/affiliates/configuration)
- [Attribution](/affiliates/attribution): link, cookie, consent, coupon
- [Commissions](/affiliates/commissions): rates, renewals, bumps, refunds
- [Joint ventures](/affiliates/joint-ventures)
- [Payouts](/affiliates/payouts)
- [The partner area](/affiliates/partner-area): tags, sign-up, promotional material
- [The Control Panel](/affiliates/control-panel)
- [Webhooks](/affiliates/webhooks): the four triggers for Webhook Manager, payload, brand, `event_id`
- [Reference](/affiliates/reference): commands, events, routes, permissions, tables
- [Troubleshooting](/affiliates/troubleshooting)
