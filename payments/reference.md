# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `payments:sweep-abandoned` | Announce checkouts left unpaid past the waiting period, once each. Needs `abandoned.enabled`. |
| `payments:prune-unpaid [--dry-run]` | Delete checkouts that were started and never paid. Needs `prune_unpaid_after_days` above `0`. |
| `payments:prune-legal-drafts [--days=7] [--dry-run]` | Delete withdrawal and cancellation declarations that were begun and never confirmed. Confirmed ones are never touched. |
| `payments:dunning [--dry-run]` | Follow up failed renewals in stages, then end the agreement. Needs `dunning.enabled`. |
| `payments:resume-paused` | Resume pauses whose date has come, and settle rows a dead process left in `pausing`, `resuming`, `switching` or `cancelling` for more than ten minutes. **1.25.** See [the clean-up run](/payments/subscription-changes#the-clean-up-run). |
| `payments:reminders` | Send the reminders before a charge and before and after a card expires, once per agreement and date. **1.25.** See [Reminders](/payments/reminders). |
| `payments:brand-backfill [--dry-run]` · `payments:subscription-brand-backfill [--apply]` · `payments:leadhub-backfill` | One-off backfills for older rows. |

**None is scheduled for you** — register them in `routes/console.php` yourself, each with
`->withoutOverlapping()`. The suggested plan is on
[Installation → The scheduler](/payments/installation#the-scheduler).

## Classes you call

There is no facade. Everything is resolved from the container, which is what makes the
gateway swappable and the whole surface testable without the network.

| Class | Method | Returns |
| --- | --- | --- |
| `Support\Checkout` | `start($products, $buyer = [], $returnUrl = null, $discount = null)` | `CheckoutResult` or `null` |
| `Support\Subscriptions` | `start($product, $buyer = [], $returnUrl = null)` | `CheckoutResult` or `null` |
| | `cancel($subscription)` | `bool` |
| | `available()` | `bool` — can this provider run subscriptions |
| | `planFor($handle)` | the rhythm a product declares, or `null` |
| | `refresh($subscription)` | the row after asking the provider, or `null` |
| `Support\FollowUp` | `accept($original, $productHandle, $context = [])` | the new `Payment`, or `null` |
| | `eligible($payment)` · `available()` · `alreadyTaken($payment, $handle)` | `bool` |
| `Support\Refunds` | `record($payment, $amountCent, $reference = null)` | `bool` |
| `Support\Fulfilment` | `handle($providerId)` | the `Payment`, or `null`. What the webhook route calls. |
| `Support\Abandonment` | `sweep()` | how many were announced |
| `Support\Checkout` | `resume($payment, $returnUrl = null)` | a new `CheckoutResult` with the same lines, or `null` |
| `Support\PaymentMethods` | `configured()` · `canHoldMandate($methods)` · `chargesAutomatically($method)` | see [Payment methods](/payments/payment-methods) |
| `Facades\PaymentLog` | `mail($payment, $kind, $to, $subject = null, $status = 'sent', $meta = [], $reference = null)` · `note()` · `record()` · `for()` | the [communication log](/payments/communications); the one facade in the package |
| `Support\Catalogue` | `find($handle)` · `all()` | the product array, or `null` |
| | `Catalogue::extend($resolver)` (static) | `void` |

`CheckoutResult` is a readonly pair: `->payment` and `->checkoutUrl`.

`Support\Discount` is a readonly value object: `new Discount(code: 'X', amountCent: 500,
label: null)`, with `against($totalCent)` returning what is actually taken off.

`Support\Money::format($minorUnits, $currency)` and `Money::decimals($currency)` know the
zero- and three-decimal currencies. Everything else is two.

## Events

```php
namespace Goldnead\StatamicPayments\Events;
```

| Event | Properties |
| --- | --- |
| `PaymentPaid` | `$payment` |
| `PaymentFailed` | `$payment` |
| `PaymentRefunded` | `$payment`, `$amountCent`, `$isFull` |
| `CheckoutAbandoned` | `$payment` |
| `SubscriptionStarted` | `$subscription`, `$payment` |
| `SubscriptionRenewed` | `$subscription`, `$payment` |
| `SubscriptionCancelled` | `$subscription` |
| `SubscriptionEnded` | `$subscription` |
| `SubscriptionStartFailed` | `$payment`, `$reason` |
| `SubscriptionCycleFailed` | `$subscription`, `$payment`, `$status` |
| `PaymentChargedBack` | `$payment`, `$reference`, `$amountCent`, `$reason` |
| `PaymentCommunicationLogged` | `$communication` |
| `SubscriptionPaused` | `$subscription`, `$resumesAt`, `$by` — **1.25** |
| `SubscriptionResumed` | `$subscription`, `$by` — **1.25** |
| `SubscriptionChanged` | `$subscription`, `$fromProduct`, `$toProduct`, `$fromAmountCent`, `$toAmountCent`, `$prorationCent`, `$prorationPayment`, `$immediate`, `$by` — **1.25** |
| `SubscriptionReplaced` | `$replaced`, `$purchase`, `$replacement`, `$creditCent`, `$creditDays` — **1.25** |
| `SubscriptionPaymentUpcoming` | `$subscription`, `$dueAt`, `$daysBefore` — **1.25** |
| `SubscriptionCardExpiring` | `$subscription`, `$expiresAt` — **1.25** |
| `SubscriptionCardExpired` | `$subscription`, `$expiredAt` — **1.25** |
| `SubscriptionAttemptFailed` | `$subscription`, `$payment`, `$attempt` — **1.25** |
| `SubscriptionPlanCompleted` | `$subscription`, `$payment` — **1.25** |
| `CheckoutBlocked` | `$reason`, `$email`, `$ip`, `$message` — **1.25** |

Twenty-two, and that is the complete list. What each one means is on
[Reacting to a payment](/payments/events#the-events). `PaymentPaid`, `PaymentFailed` and `CheckoutAbandoned`
are each dispatched **once per payment**, claimed by a conditional `UPDATE` on their own
column. See [Reacting to a payment](/payments/events#dispatched-once).

## Contracts

| Contract | Implement to |
| --- | --- |
| `Contracts\PaymentGateway` | add a provider: `createPayment()`, `fetch()`, `provider()` |
| `Contracts\FollowUpGateway` | *extends the above* — `supportsFollowUp()`, `rememberBuyer()`, `chargeAgain()` |
| `Contracts\SubscriptionGateway` | *extends FollowUpGateway* — `supportsSubscriptions()`, `createSubscription()`, `cancelSubscription()`, `fetchSubscription()` |
| `Contracts\PausesSubscriptions` | pause natively: `pauseSubscription()`, `resumeSubscription()`. Stripe has it; without it a pause ends the agreement and a resume starts a new one. **1.25** |
| `Contracts\UpdatesSubscriptions` | change the amount of a running agreement: `updateSubscription()`. Used by switches and coupons that run out. **1.25** |
| `Contracts\ListsSubscriptions` | `subscriptionsFor()`, so the clean-up run can find an agreement a dead resume started. **1.25** |
| `Contracts\ReadsCardExpiry` | `cardExpiry()`, for the card reminders. **1.25** |

Mollie and Stripe implement all four new ones except that Mollie has no native pause.

Three interfaces rather than one fat one, because a provider that cannot do the later two
should not have to declare stubs that throw, and a site should be able to **ask** rather
than find out at the till.

`fetch()` is the one that matters: it exists because a webhook may not be believed. An
implementation that returned the caller's claim would defeat the entire design.

Bind your own in a service provider:

```php
$this->app->bind(PaymentGateway::class, MyGateway::class);
```

Every subscription method takes the customer reference as well as the subscription id. That
is not decoration: passing both means a mixed-up id cannot reach into somebody else's
account.

## Routes

| Method | URI | Name | Middleware |
| --- | --- | --- | --- |
| `POST` | `/!/statamic-payments/webhook` | `statamic-payments.webhook` | throttle `rate_limit`,1 — **CSRF dropped** |
| `POST` | `/!/statamic-payments/offer` | `statamic-payments.offer.accept` | `web`, throttle 10,1 — **CSRF kept** |
| `GET` | `/!/statamic-payments/danke/{payment}` | `statamic-payments.thanks` | `web`, throttle 30,1; signed, checked by the controller so a late link gets a page, not a 403. Only used with `thanks.expires_minutes`. **1.25** |
| `GET`, `POST` | `{portal.prefix}/abo/{subscription}/pausieren` | `statamic-payments.portal.pause.confirm`, `….pause.run` | portal session; the `POST` throttled 10,1. **1.25** |
| `POST` | `{portal.prefix}/abo/{subscription}/fortsetzen` | `statamic-payments.portal.resume.run` | portal session, throttle 10,1. **1.25** |
| `GET`, `POST` | `{portal.prefix}/abo/{subscription}/wechseln` | `statamic-payments.portal.switch.confirm`, `….switch.run` | portal session; the `POST` throttled 10,1. **1.25** |

The other portal, withdrawal and cancellation routes are listed on
[The customer portal](/payments/portal) and
[Consent, withdrawal and cancellation](/payments/recht).

### The webhook

CSRF is dropped because the caller is the provider's server, not a browser. It is safe
without a token because the endpoint trusts nothing in the request:

- **The status is fetched from the provider** by the posted id. A forged "paid" call is a
  request to re-check a payment that is not paid.
- **An id this site never issued creates nothing**, even if it really is paid at Mollie. An
  id we did not issue is not evidence of an order here.
- **The endpoint answers identically for known and unknown ids**, and asks Mollie in both
  cases. Asking only about known ids would answer, in the response time, the question the
  flat `200` refuses: which payment ids this site has seen.
- **A payment nobody can match is logged, loudly.** The addon sends its own row id along as
  metadata and recovers the payment from it; if even that fails, `Log::warning` says so
  instead of a silent `200`.

The one payment the site legitimately never created is a **cycle** the provider charged on
an agreement the site *did* create. The evidence there is the agreement, and the
subscription id comes from the provider's own answer rather than from the caller.

## Antlers tags

```antlers
{{ payments:offer payment="{payment_id}" product="begleit-cd" }} … {{ /payments:offer }}
```

Yields `payment_id`, `product`, `name`, `amount`, `amount_cent`, `currency`, `action` — and
yields **nothing** unless follow-ups are on, the payment is paid, a mandate exists and the
offer has not already been taken. See
[Bumps and follow-up offers](/payments/bumps#in-a-template).

| Tag | |
| --- | --- |
| `{{ payments:thanks }}…{{ /payments:thanks }}` | `valid`, `paid`, `pending`, `payment_id`, `expires_at` for an expiring thank-you page. **1.25.** See [The thank-you link](/payments/checkout-protection#the-thank-you-link). |
| `{{ payments:captcha }}` | The captcha widget for a checkout form; empty when no captcha is configured. **1.25** |
| `{{ payments:withdrawal_url }}` · `{{ payments:cancellation_url }}` | The statutory withdrawal and cancellation pages. See [Consent, withdrawal and cancellation](/payments/recht). |

## Control Panel

| Screen | Permission | |
| --- | --- | --- |
| **Utilities → Payments** | `access payments utility` | Read-only listing of orders |
| **Utilities → Subscriptions** | `access subscriptions utility` | Agreements and a read-only detail |
| row actions on Subscriptions | `manage payment subscriptions` (**1.25**) | Pause, Resume, Switch, Cancel, Release switch |

Deliberately separate: "may read the till" is not the same authority as "may change what
somebody pays". The permission `manage payment subscriptions` is new in 1.25, and cancelling
needs it too; see [Upgrading to 1.25](/payments/installation#upgrading-to-1-25).

The Payments screen filters on **Status** and **Fulfilment**, the latter with the entry
*Paid, not fulfilled* — the one case worth chasing. The Subscriptions screen filters on
**Status** and **Still running**. Both are real Statamic filters, so they show a badge,
survive sorting and paging, and can be saved as a view.

The cancel action is marked dangerous and offered only on an agreement that is still live, or
on a row stuck in a claim.

## Tables

### `payments`

| Column | |
| --- | --- |
| `provider` · `provider_id` | unique together. `provider` is `free` for a zero-priced order |
| `product` | the primary line's handle, also kept on the payment so a report need not join |
| `amount_cent` · `currency` | the total actually charged, in minor units |
| `discount_code` · `discount_cent` | why the total is lower than the lines |
| `refunded_cent` · `refunded_at` | money that went back. Never a status |
| `status` | `initiated` · `open` · `paid` · `failed` · `expired` · `canceled` |
| `email` · `name` | as the buyer typed them; never overwritten from the provider's account |
| `country` · `country_source` | ISO 3166-1 alpha-2, frozen at checkout. **1.9.0** |
| `paid_at` · `fulfilled_at` · `failed_notified_at` · `abandoned_notified_at` | timestamps, not booleans: "when" answers "whether" and one more question besides |
| `recovered_at` | a reminded checkout that was paid after all, itself or through a restarted one |
| `customer_reference` | the stored mandate, or null |
| `parent_payment_id` | which order a follow-up grew out of |
| `subscription_id` | which agreement this payment is a cycle of |
| `meta` | JSON. Holds `refunds`, `subscription_intent`, `vat_id`, `address` |

`initiated` is deliberately not `open`: until the provider has acknowledged it, a checkout
that died mid-flight is not an order in flight.

### `payment_items`

One row per thing bought, unique per `(payment_id, product)` — a bump ticked twice is a
quantity, not a second row.

| Column | |
| --- | --- |
| `product` · `name` | the name **as it was at the time of sale** |
| `amount_cent` · `quantity` | per unit. `line_total` is not stored: a stored copy is a second truth |
| `discount_cent` | the share of the payment's discount that fell on this line. **1.9.0** |
| `kind` | `primary` · `bump` · `upsell` |
| `meta` | JSON |

### `subscriptions`

| Column | |
| --- | --- |
| `provider` · `provider_id` | unique together |
| `customer_reference` | the mandate it runs on |
| `product` · `amount_cent` · `currency` | looked up once and kept, so a price change does not re-price a running agreement |
| `interval` | the provider's own vocabulary, unparsed |
| `times` · `times_charged` | `times` null means "until cancelled"; a number makes it a payment plan |
| `status` | `initiated` · `pending` · `active` · `suspended` · `paused` · `cancelled` · `completed`, and while a change is in flight `pausing` · `resuming` · `switching` · `cancelling` |
| `starts_at` · `next_payment_at` · `cancelled_at` · `ended_at` | |
| `paused_at` · `resumes_at` | a pause, and the date it resumes by itself. **1.25** |
| `card_expires_at` · `card_checked_at` | the card on file's expiry, cached, and when it was last asked. **1.25** |
| `email` · `name` · `meta` | `meta` also holds a running `coupon`, `previous_provider_ids` after a resume or switch, and the pause and switch history |

### `payment_subscription_notices`

**1.25.** One row per reminder sent: `subscription_id`, `kind` (`upcoming`, `card_expiring`,
`card_expired`), `reference` (the date it was about), `created_at`. The unique index over the
three is what makes each reminder go out once however often `payments:reminders` runs.

Deleting a payment deletes its lines, in the model as well as by cascade — SQLite quietly
does not enforce the foreign key, and orphaned lines would count towards every revenue
report ever run.

## Automations triggers

Registered by [Automations](/automations/) when both addons are installed. Group: **Payments**.

| Label | Handle |
| --- | --- |
| Payment Paid | `payments.paid` |
| Payment Failed | `payments.failed` |
| Checkout Abandoned | `payments.checkout_abandoned` |

Each takes an optional `product` filter and hands the flow `id`, `product`, `amount_cent`,
`currency`, `discount_code`, `status`, `email`, `name`, `provider`.

## Publish tags

| Tag | |
| --- | --- |
| `statamic-payments-config` | `config/statamic-payments.php` |
| `statamic-payments-migrations` | the migrations, if you want them in your own repo |
| `statamic-payments-views` | the Blade views: portal, reminder, dunning and abandoned mails, thank-you and withdrawal pages. Publish again with `--force` after updating to 1.25, or merge the new portal pages into your copies. |
| `statamic-payments-translations` | the language files, including every statutory wording |

## Multi-site and multi-brand

Payments are not site-scoped. A payment is a transaction, not content.

`payments.brand_id` and `subscriptions.brand_id` carry the brand a row was created in, `0` on
a single-brand install. With [Brand Context](/brand-context/) in multi-brand mode the portal
shows each brand only its own orders. From 1.25, `payments:reminders`,
`payments:resume-paused` (clean-up included), the Mollie and Stripe webhooks, and Stripe refunds
and disputes run each row's work and its events under that row's brand through
`Brands::runFor()`, so brand-aware listeners hear the right brand. A row on brand `0`, or an
install without Brand Context, runs unchanged.
