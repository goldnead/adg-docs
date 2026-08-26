# Credit notes and refunds

<AddonHeader />

A correction is a second document. `creditNoteFor()` is the right way to do the thing the
model refuses.

```php
use Goldnead\Invoices\Facades\Invoices;

Invoices::creditNoteFor($payment);   // Invoice|null
```

<Figure
  src="invoices-credit-note"
  alt="A rendered credit note referencing the invoice it reverses, with the same two VAT rates"
  caption="A refund is not a correction. It is a second document that names the first." />

## What it writes

A second invoice row with `kind = credit_note`, pointing at the original through
`reverses_invoice_id`, and carrying `meta.reverses_number` so the document can name it in
words.

- **It takes the next number in the series.** A credit note is a document like any other and
  belongs in the same sequence.
- **The figures are the original's**, negated in meaning rather than in sign. The columns
  stay unsigned and the document says what it is: a credit note with a minus in front of
  every figure reads as arithmetic, while *"Stornorechnung zu RE2026-08-004"* reads as a
  fact.
- **Every line is copied**, including its rate, its discount and its own totals.

## The tax is copied, not recalculated

The rate that applied is the rate that applied. Looking it up again a month later could
produce a different one — a config change, a new zone, a corrected product class — and then
the two documents would not cancel out.

That is also why the split rounds mirror-symmetrically: the credit note gives back exactly
the cent the original took.

## Automatic on a full refund

With [Payments](/payments/refunds) 1.10+ and `auto_issue` on, `PaymentRefunded` writes the
credit note by itself.

**Only on a full refund.** A partial one is not: which lines came back is a question only a
person can answer, and guessing it would put a wrong figure on a tax document. The refund is
recorded either way by the payment addon; the paperwork for a partial one is a decision.

## Once per payment

`unique(payment_id, kind)` allows exactly one invoice and exactly one credit note per
payment. The second delivery of the same refund creates nothing, and `creditNoteFor()`
returns `null` rather than throwing.

It also returns `null` when there is no original invoice to reverse — a payment that never
got one, because a rate was undetermined or the addon was installed later, has nothing to
credit.

## A failure does not undo the refund

The listener catches `InvoiceNotWritten` and logs it. The refund happened, the access was
withdrawn correctly, and what is missing is a piece of paper — letting the exception escape
would drag down work that already went right.

## Reissuing

There is no "correct and reissue" verb, because there are only two steps and both already
exist:

1. `Invoices::creditNoteFor($payment)` — the original is reversed.
2. Fix whatever was wrong (the tax class, the seller block, the recipient's address), then
   write a new invoice.

Step 2 is where the design pushes back: the unique index allows one invoice per payment, so
a *second* invoice for the same payment is not possible. In practice a correction that needs
a new document is a new payment or a manual document — which is the honest boundary of an
addon that refuses to let anything be edited.

## Partial refunds, in practice

`PaymentRefunded` fires with `$amountCent` and `$isFull`. For a partial refund:

```php
Event::listen(PaymentRefunded::class, function ($event) {
    if ($event->isFull) {
        return;                       // the addon has this one
    }

    // Tell somebody. The paperwork is theirs.
});
```

The payment carries `refunded_cent` as a running total, so a report can always say how much
of an order came back, whether or not a document exists for it.
