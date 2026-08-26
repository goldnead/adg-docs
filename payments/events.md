# Reacting to a payment

<AddonHeader />

What a payment *means* belongs to your site. This addon takes money and says so; granting
access, sending a file, notifying somebody — all of that hangs off an event.

```php
use Goldnead\StatamicPayments\Events\PaymentPaid;

Event::listen(PaymentPaid::class, function (PaymentPaid $event) {
    $event->payment->product;      // what was bought
    $event->payment->items;        // every line, if there was more than one
    $event->payment->email;        // by whom
    $event->payment->amount_cent;  // what they actually paid
});
```

## Only the provider decides

A webhook posts an id and nothing else worth reading. The status is fetched **from Mollie**
by that id, so the worst a forged call can do is make the server ask about a payment that
is not paid.

That is a stronger position than a shared secret, because it does not depend on the secret
staying secret, and it is the only design that survives somebody replaying a genuine
delivery. See [Reference](/payments/reference#the-webhook) for what the endpoint does in
each case.

The browser coming back to your thank-you page is not evidence of anything.

## Dispatched once

`PaymentPaid` fires **once per payment**, and that is guaranteed by a conditional `UPDATE`
on `fulfilled_at`, not by reading first and then writing. Two simultaneous deliveries cannot
both win the claim, and a read-then-write guard loses exactly that race — which is what a
redelivery arriving twice within milliseconds is.

The claim stands **in the database before any listener runs**. So a listener may grant
access without carrying its own idempotency for the ordinary cases: a redelivery, a
duplicated request, two deliveries landing together.

`PaymentFailed` works the same way, on its own column (`failed_notified_at`).
`CheckoutAbandoned` on `abandoned_notified_at`.

### The one case a listener must still think about

**Its own exception.** If a listener throws:

1. the claim is released,
2. the exception reaches the caller,
3. the webhook answers non-2xx,
4. the provider delivers again — and *every* listener on the event runs a second time.

That is deliberate. The alternative is keeping the claim, and the failure mode of that is a
customer who paid, got nothing, and no retry ever comes, silently, because the row says
fulfilled. **Given the choice, this package repeats rather than loses.**

So: make irreversible work in a listener idempotent, or queue it.

## The events

| Event | Carries | When |
| --- | --- | --- |
| `PaymentPaid` | `$payment` | The provider confirmed the money. Once per payment. |
| `PaymentFailed` | `$payment` | A final unpaid status. Once per payment. Never for one already fulfilled. |
| `PaymentRefunded` | `$payment`, `$amountCent`, `$isFull` | Money went back. See [Refunds](/payments/refunds). |
| `CheckoutAbandoned` | `$payment` | Started and left unpaid past the waiting period. See [Abandoned checkouts](/payments/abandoned). |
| `SubscriptionStarted` | `$subscription`, `$payment` | An agreement exists and its first payment is behind it. |
| `SubscriptionRenewed` | `$subscription`, `$payment` | A cycle was charged and paid. |
| `SubscriptionCancelled` | `$subscription` | Somebody stopped it and the provider agreed. |
| `SubscriptionEnded` | `$subscription` | A payment plan paid its last instalment. |
| `SubscriptionStartFailed` | `$payment`, `$reason` | The first payment was taken and no agreement was created. |

`PaymentFailed` is **not** dispatched for a payment that was already fulfilled: an
unfamiliar provider status must not revoke what somebody paid for.

## Every cycle is an ordinary payment

A subscription's monthly charge arrives as a plain `Payment` with the subscription's id on
it, and it fulfils through the ordinary path — same claim, same `PaymentPaid`.

A listener that grants access per payment therefore keeps a subscriber's access in step
**without knowing that subscriptions exist**. That is the point of doing it this way.

`SubscriptionStarted` is the right place for "welcome, here is what happens next". It is
the wrong place for granting access: that already happened, on `PaymentPaid`, and will
happen again on every cycle.

## Entitlements (optional)

The one exception to "this addon decides nothing". With
[`goldnead/statamic-entitlements`](/entitlements/) installed:

```php
// config/statamic-payments.php
'entitlements' => ['enabled' => true],

'products' => [
    'noten-paket' => [
        'name' => '…',
        'amount_cent' => 1900,
        'grants' => 'noten-fruehling',
    ],
],
```

Off unless all three are true: the sibling installed, the flag on, and the product carrying
`grants`. **Every paid line is granted**, not only the first — a bump the buyer ticked and
paid for is as bought as the thing they came for.

A failure in the sibling is **logged and swallowed**. The money was taken and the row says
so; an entitlements outage must not release the fulfilment claim and send the whole webhook
round again.

The bridge also follows subscriptions and refunds:

| Event | What the bridge does |
| --- | --- |
| `PaymentPaid` | Grants what each line's product declares |
| `SubscriptionRenewed` | **Renews** the existing window to the provider's own `next_payment_at` |
| `SubscriptionCancelled` · `SubscriptionEnded` | Closes an open-ended grant at the end of the paid period |
| `PaymentRefunded`, full | Revokes every product line, with a reason |

Each of those is deliberately not the obvious thing — see
[Subscriptions](/payments/subscriptions#the-access-a-subscription-pays-for) and
[Refunds](/payments/refunds).

## Automations (optional)

With [`goldnead/statamic-automations`](/automations/) installed, three triggers appear under
**Payments** in the flow builder and need no code:

| Trigger | Handle |
| --- | --- |
| **Payment Paid** | `payments.paid` |
| **Payment Failed** | `payments.failed` |
| **Checkout Abandoned** | `payments.checkout_abandoned` |

Each can be narrowed to one product handle, and each hands the flow the payment's id,
product, `amount_cent`, currency, `discount_code`, status, email, name and provider.

::: warning One place per concern
An automation on `payments.paid` and a hand-written listener on `PaymentPaid` will both
run. Both configurations are individually correct, which is what makes the double-send hard
to spot. See [Boundaries](/guide/boundaries).
:::
