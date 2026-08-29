# Invoices

<AddonHeader />

An invoice for every payment: a number that is unique and continuous, VAT decided by the
buyer's country, and a document that never changes.

It sits on [Payments](/payments/). It writes invoices; it does not take money, and it does
not do bookkeeping.

## What it is for

`statamic-payments` can take money in Germany. It cannot, on its own, be *used* in Germany
to sell a digital product to a consumer, because that requires an invoice — with a gapless
number, the right VAT rate, and the sender's details on it.

This addon is that missing half.

## The rule it is built on

> **Never guess a rate.**

If no rule matches, **no invoice is written**. The payment stands — the money moved, nothing
about that is in doubt — and `invoices:pending` says which payments are waiting and why.

The alternative, falling back to the standard rate, is the failure this addon exists to
avoid: a wrong rate on a tax document looks like an answer. It is wrong quietly, it is
signed, and it is handed to a customer.

That applies to a missing buyer country too. Payments taken before `statamic-payments` 1.9
have none, and those get no invoice rather than one at the seller's own rate.

## What you get

- **A number from a locked counter**, one series per brand, restarting on a period you
  choose
- **VAT per line**, so 7% sheet music and a 19% course can sit on one document
- **Reverse charge, intra-community supply, export, outside scope, § 19** — each with the
  mandatory note the law wants, frozen as text
- **Immutability enforced on the model**, head and lines alike
- **Credit notes**, taking the next number and copying the original's figures
- **An HTML document**, the same one the preview shows
- **`invoices:pending`**, which lists paid payments with no invoice and says what is missing
- **Four figures for [Insights](/insights/what-the-family-reports#invoices)**, dated by
  invoice date and simply absent when that addon is not installed

## What it depends on, and why

`goldnead/statamic-payments` **^1.9**, and the floor is not arbitrary. Two facts arrived in
1.9.0, both recorded at checkout because neither can be reconstructed afterwards:

**The buyer's country** (`country`, `country_source`). The VAT rate on a digital sale to a
consumer in the EU depends on where the buyer is. A country not recorded at the time of the
payment is gone — the address may change, the record may be deleted, and the tax office does
not accept "we looked it up later".

**The discount per line** (`payment_items.discount_cent`). An invoice with two tax rates
cannot split a single discount figure across them: from the total alone, which part belonged
to the 7% line and which to the 19% one is unrecoverable. Not visibly wrong — *indeterminate*,
which is worse.

See [Tax facts and retention](/payments/tax-and-retention).

## The shortest useful path

1. `composer require goldnead/statamic-invoices`, publish the config, `php artisan migrate`.
2. Fill in `seller` — **before the first invoice goes out**. A document missing the sender's
   details is not a valid invoice, and it cannot be corrected, only reversed and reissued.
3. Say whether your catalogue prices are gross or net (`tax.prices_include_tax`).
4. Give every product a tax class in `tax.product_classes` and a `digital` key in
   `config/statamic-payments.php`.
5. Take a payment. The invoice writes itself.

## What it deliberately does not do

- **Bookkeeping, DATEV export, dunning.** Different job, different software.
- **PDF rendering.** It renders HTML — the same template the preview shows, so the two
  cannot drift. Turning that into a PDF is a decision about infrastructure (a print dialog,
  a headless browser, a queue worker) that an addon should not make for its host.
- **The OSS threshold.** Below €10,000 of annual turnover into other EU countries the
  seller's own rate applies; above it, the recipient's. That is a state over time and needs
  a turnover figure, which is a bookkeeping question rather than a per-line one. There is a
  switch and a named seam.
- **VIES lookups.** A VAT ID is checked for shape, never over the network: a tax calculation
  that depends on somebody else's server is one that fails at checkout when their server is
  down.
- **Send anything.** `InvoiceIssued` and `CreditNoteIssued` are where a site hangs its mail
  and its filing.
- **A Control Panel screen.** There is none yet.
- **Tax zones by state or postcode.** In the EU the country carries the rate; states and
  postcodes start to matter in the US.

## Next

- [Installation](/invoices/installation)
- [Configuration](/invoices/configuration)
- [The number](/invoices/numbering)
- [VAT, reverse charge, small business](/invoices/vat)
- [An invoice does not change](/invoices/immutability)
- [Credit notes and refunds](/invoices/credit-notes)
- [Delivery and storage](/invoices/delivery)
- [Reference](/invoices/reference) · [Troubleshooting](/invoices/troubleshooting)
