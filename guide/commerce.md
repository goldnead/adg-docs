---
title: The commerce suite
description: Eight packages that turn a Statamic site into its own checkout, invoicing and fulfilment stack. Running in production on one site, not yet sold. This page exists to find out whether anyone wants it.
---

# The commerce suite

Eight of the twenty-two packages form one chain: **someone buys, and everything
that has to happen afterwards happens.** Payment, licence-free invoice numbering
under German law, access granted, follow-up sent, all on the site you already
run.

[Payments](/payments/) · [Offers](/offers/) · [Invoices](/invoices/) ·
[Funnels](/funnels/) · [Entitlements](/entitlements/) · [LeadHub](/leadhub/) ·
[Marketing](/marketing/) · [Automations](/automations/)

::: tip This page is a question, not an offer
The chain runs in production on one site and has done for months. It has never
been sold to anyone. Before building the parts a second site would need, it is
worth finding out whether a second site exists. **If you would use this, say so**
— that is the whole purpose of the page.
:::

## Why you might want it

The alternative for a German Statamic site today is a hosted cart. The numbers
are the argument, not the feature list.

CopeCart's advertised fee is 4.9% + €1, charged on the **gross** amount. Their own
worked example: €1,190 gross, €59.31 fee. That is **5.93% of net**. On €100,000 of
revenue it is roughly **€5,900 a year**, every year, on top of losing the customer
relationship, the invoice layout and the data.

ThriveCart and SamCart are software rather than resellers, so you stay the
merchant — but neither issues an invoice that satisfies German requirements, and
neither has a §312k cancellation button on your own site.

## What is actually built

Checked against the code, not the roadmap:

- **Invoice numbering that holds up.** Numbers come from a locked counter row in
  the same transaction as the invoice, never from `MAX()+1`. Gapless and unique
  are both concurrency properties, and both are tested against MySQL rather than
  SQLite. Corrections are cancellation invoices that copy the tax rather than
  recompute it.
- **No guessed tax rate.** If the rule, the country, the `digital` flag, the
  sender details or (over €250, §33 UStDV) the recipient address is missing, **no
  invoice is created at all** and `invoices:pending` tells you which field is
  missing. Nine machine-readable reasons, no silent fallback.
- **Multi-brand for real.** Separate number series per brand, fail-closed
  isolation, and a brand that would collide on its prefix is rejected rather than
  guessed.
- **CRM and newsletter in the same house.** A contact, their timeline, their
  consent and the campaign that reached them are one system, not three with a Zap
  between them.
- **A visual automation builder** with eighteen built-in triggers plus the ones
  each addon above contributes, and its own action and logic nodes. The full list
  is on the [Automations nodes page](/automations/nodes).
- **An invoice PDF that is the same file twice.** The document prints from the
  same Blade template the preview shows, through pure-PHP dompdf, so installing
  the addon does not install a headless browser. Creation date and document ID
  are derived from the invoice rather than the wall clock, so re-rendering the
  same invoice in nine years produces a byte-identical file. It is delivered on
  `InvoiceIssued` through the brand's own sender identity. See
  [Delivery](/invoices/delivery).
- **A customer portal.** Buyers reach their own orders, invoices,
  subscriptions and payment methods over a magic link, with the § 312k
  cancellation button on your site rather than a reseller's.
- **A revenue screen.** [`statamic-insights`](https://github.com/goldnead/statamic-insights)
  reports over what the other addons already record, and answers which campaign
  sold anything. It is not yet documented on this site.
- **0% revenue share.** Nothing phones home to count your orders.

## What is missing

Stated plainly, because a page that hides this would waste your time and mine.

| Gap | Where it stands |
| --- | --- |
| **Stripe** | Not built. Mollie is the only gateway adapter. The seam for a second one exists and is unbound. |
| **Dunning** | Not built. A failed charge mirrors Mollie's status and stops there. |

None of these is unknown or unplanned. They are the reason this page asks a
question instead of quoting a price.

Four further gaps — revenue reporting, revenue per campaign, the invoice PDF and
the customer portal — were on this list when the page went up on 29 August 2026
and closed within the day, with
[`statamic-insights`](https://github.com/goldnead/statamic-insights) 1.0.0, the
LeadHub bridge in Payments, Invoices 1.2.1 and Payments 1.14.0. The list above is
what is left.

## What it would cost

An intention, not an offer, and it will move if the answers below say it should:

- **Per site**, roughly the price of two hosted-cart months, one payment,
  including a year of updates.
- **A yearly renewal** at a fraction of that, for updates only. **The site keeps
  working if you never renew** — you simply stop receiving new versions. A client
  site outlives the retainer that built it, and a licence that can switch it off
  is not one you should accept.
- **An agency tier** for unlimited client sites.

## If you want this

Email **[info@adriangoldner.com](mailto:info@adriangoldner.com?subject=Statamic%20commerce%20suite)**
with whatever of this you can answer:

1. What are you selling, and what are you selling it through today?
2. Which of the missing pieces above would block you?
3. One site or many?

No list, no sequence, no follow-up unless you ask for one. The mail goes to a
person.
