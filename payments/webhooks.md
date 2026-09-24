# Webhooks

<AddonHeader />

With [Webhook Manager](/webhook-manager/) installed, every payment and subscription moment
appears there as a trigger for outbound webhooks: "Payments: subscription paused", in German
"Zahlungen: Abo pausiert". Pick one on an outbound webhook and a Zapier zap, an n8n flow or a
CRM hears about it. New in Payments **1.26**.

Offering a trigger sends nothing. Data leaves only through an outbound webhook somebody creates.
The triggers appear with Webhook Manager 2.9 or later. **Webhook Manager 2.10** groups them in
the trigger picker and sends each body's `event_id` as the delivery's idempotency key.

The handles are the ones [Automations](/automations/suite-triggers) uses for the same moments.
Two public events are not offered, as in Automations: `SubscriptionCycleFailed` (the raw
provider status behind `subscription_attempt_failed` and `failed`) and
`PaymentCommunicationLogged` (a line in this addon's mail log).

## Switching them off

```php
// config/statamic-payments.php
'webhook_manager' => [
    'enabled' => env('STATAMIC_PAYMENTS_WEBHOOK_MANAGER', true),
],
```

`STATAMIC_PAYMENTS_WEBHOOK_MANAGER=false` hides the triggers. Without Webhook Manager nothing of
the bridge is loaded: the manager's classes are checked by name before anything that implements
its interface.

## What every body carries

```json
{
  "event": "payments.subscription_paused",
  "event_id": "5f1c0e4a9d2b7c3e8a1f6b0d4c9e2a7f3b8d1c6e",
  "occurred_at": "2026-09-24T10:12:03+02:00",
  "brand": { "id": 2, "handle": "nordlicht" },
  "subject_type": "subscription",
  "subject_id": 41,
  "subscription": { "...": "see below" },
  "resumes_at": "2026-10-24T00:00:00+02:00",
  "by": "portal"
}
```

Money is always `*_cent` (an integer in minor units) next to `currency`. Times are ISO 8601 or
`null`. `brand` is `null` without [Brand Context](/brand-context/). `subject_type` and
`subject_id` name the object the moment is about, so the manager's delivery log files it under
that payment or subscription.

**`payment`**: `id`, `provider`, `provider_id` (`null` until the provider knows the payment),
`status`, `product`, `amount_cent`, `currency`, `discount_code`, `discount_cent`,
`refunded_cent`, `email`, `name`, `country`, `subscription_id`, `parent_payment_id`, `items[]`
(`product`, `offer`, `name`, `kind`, `quantity`, `amount_cent`, `discount_cent`), `attribution`
(`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`), `created_at`,
`paid_at`, `refunded_at`, `charged_back_at`.

**`subscription`**: `id`, `provider`, `provider_id`, `status`, `product`, `amount_cent`,
`currency`, `interval`, `times`, `times_charged`, `email`, `name`, `starts_at`,
`next_payment_at`, `paused_at`, `resumes_at`, `cancelled_at`, `ended_at`, `created_at`.

## Triggers

| Trigger | Besides the common keys |
| --- | --- |
| `payments.paid` | `payment` |
| `payments.failed` | `payment` |
| `payments.refunded` | `payment`, `refund` (`amount_cent`, `currency`, `full`) |
| `payments.charged_back` | `payment`, `chargeback` (`reference`, `amount_cent`, `currency`, `reason`) |
| `payments.checkout_abandoned` | `payment` |
| `payments.checkout_blocked` | `blocked` (`reason`, `email` as typed, `ip_prefix`: the /24 or /48 network) |
| `payments.subscription_started` | `subscription`, `payment` |
| `payments.subscription_start_failed` | `payment`, `reason` |
| `payments.subscription_renewed` | `subscription`, `payment` |
| `payments.subscription_attempt_failed` | `subscription`, `payment`, `attempt` |
| `payments.subscription_payment_upcoming` | `subscription`, `due_at`, `days_before` |
| `payments.subscription_card_expiring` | `subscription`, `expires_at` |
| `payments.subscription_card_expired` | `subscription`, `expired_at` |
| `payments.subscription_paused` | `subscription`, `resumes_at`, `by` (`cp`, `portal`) |
| `payments.subscription_resumed` | `subscription`, `by` (`cp`, `portal`, `schedule`) |
| `payments.subscription_changed` | `subscription`, `change` (`from_product`, `to_product`, `from_amount_cent`, `to_amount_cent`, `currency`, `direction` up/down/same, `proration_cent`, `immediate`, `by`), `proration_payment` |
| `payments.subscription_replaced` | `subscription` (the ended one), `purchase` (the payment), `replacement` (a subscription or `null`), `credit` (`amount_cent`, `currency`, `days`) |
| `payments.subscription_plan_completed` | `subscription`, `payment` |
| `payments.subscription_cancelled` | `subscription` |
| `payments.subscription_ended` | `subscription` |

`subscription_plan_completed` and `subscription_ended` fire at the same moment for a paid-off
instalment plan. Hook one of them, not both.

## What never goes along

The bodies are lists of chosen fields, never a model. Never in a body:

- card digits and card label, and the mandate;
- the provider's customer reference and provider responses;
- `meta`, which holds the thank-you token, and the portal link;
- consent text;
- referrer and landing page, because a URL can carry a token;
- the full IP address. A blocked checkout carries only its network.

`payments.subscription_card_expiring` and `…_expired` carry the date the card expires, never a
digit of the card.

## Brand

Each moment is delivered in the brand of the row it is about, not the brand that happens to be
current: a provider webhook and the reminder command have none. A multi-brand install therefore
sends a brand's renewals through that brand's hooks only. `checkout_blocked` has no row and uses
the visitor's brand.

A row naming a brand that cannot be set (deleted, a bad backfill) is **not delivered** and is
logged as a warning, rather than sent through the current brand's hooks.

## Duplicates and order

- **After the commit.** A moment that fires inside a database transaction is handed to the
  manager once that transaction commits, and never if it rolls back. The dunning run ends a
  subscription inside one.
- **`event_id`** is the `sha1` of the handle and what makes the moment unique: the object and its
  own time or reference. It is the same every time the same moment is told again, a redelivered
  provider webhook or a repeated command, so a receiver can drop the second one. Webhook Manager
  2.10 sends it as `X-Webhook-Id`, and as `Idempotency-Key` where the hook has that switch on.
- **`occurred_at`** is when the moment happened according to the rows (`paid_at`,
  `refunded_at`, `ended_at` …), not when it was sent.
- **Order is not guaranteed.** `affiliates.commission_reversed` can reach a receiver before
  `payments.refunded`, and a retried delivery arrives late. Sort by `occurred_at`, deduplicate
  by `event_id`.
