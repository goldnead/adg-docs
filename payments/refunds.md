# Refunds

<AddonHeader />

**This addon does not make refunds.** That happens in the provider's dashboard, where
somebody with the authority to move money does it, and where the audit trail is complete. A
button for it behind a Control Panel permission would be a way to refund a customer by
misclicking.

What it does is **take note**, so everything downstream can react: access withdrawn, a
credit note written, a report that does not count repaid money as revenue.

```php
use Goldnead\StatamicPayments\Support\Refunds;

app(Refunds::class)->record($payment, 3000, 're_provider_id');   // bool
```

## An amount and a time, never a status

An order half repaid is still a paid order — the money moved and the thing was delivered —
and a status forced to choose between "paid" and "refunded" would be wrong about the other
half. So a refund is a third axis beside status and fulfilment, the same way `fulfilled_at`
is one:

| Column | |
| --- | --- |
| `refunded_cent` | the running total, unsigned |
| `refunded_at` | when the last one was noted |

## It is idempotent per refund id

Pass the provider's own id for the refund and a re-announced refund is not booked twice.
The ids are kept in `meta.refunds`.

"The customer was refunded three times" is the kind of number that ends up in an annual
return.

Without a reference, `record()` cannot tell a redelivery from a second refund and will book
both. Pass one whenever you have one.

## It never books more than came in

The amount is clamped to what is still unrefunded. An overpayment is a mistake at the
provider or in the caller, and letting it through here would produce an order with negative
revenue that quietly falsifies every report.

`record()` returns `false` when nothing was booked: a non-positive amount, a reference
already seen, or nothing left to refund.

## The event

```php
use Goldnead\StatamicPayments\Events\PaymentRefunded;

Event::listen(PaymentRefunded::class, function (PaymentRefunded $event) {
    $event->amountCent;   // what came back this time
    $event->isFull;       // whether everything has now been repaid
});
```

Both, because they answer different questions: a listener deciding whether to withdraw
access needs to know whether everything has been repaid, while an accounting listener needs
the individual movement.

## A full refund takes the access with it

With the [Entitlements](/entitlements/) bridge on, a **full** refund revokes every product
line of the order, with a reason.

This is the one place in the bridge that revokes. A cancelled subscription keeps its paid
period, because it *was* paid for; a refund is the opposite fact.

A **partial** refund leaves access alone. Half the money back is not half a course, and
there is no honest way to withdraw half an access — so it is recorded and left to a person.

## A full refund writes a credit note

With [Invoices](/invoices/) installed, `PaymentRefunded` with `isFull` writes the credit
note by itself. A partial refund does not: which lines came back is a question only a person
can answer, and guessing it would put a wrong figure on a tax document. See
[Credit notes and refunds](/invoices/credit-notes).

## Wiring it to the provider

Nothing announces a Mollie refund to this addon on its own — a refund created in the
dashboard is not something the payment webhook reports as a payment status. `record()` is
the seam, and where you call it from is your decision: a Mollie webhook subscription of your
own, a nightly reconciliation, or a person in the Control Panel of your own site who has
just refunded somebody and notes it.

The one thing that matters is passing the provider's refund id, so that whichever of those
paths ends up calling twice does not book twice.
