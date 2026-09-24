# Webhooks

<AddonHeader />

With [Webhook Manager](/webhook-manager/) installed, the four partner moments are triggers an
outbound webhook can listen to (source type `affiliates`). From Webhook Manager 2.10 they sit
under the heading **Partners** in the trigger picker, labelled in German and English
("Affiliates: commission earned", "Partner: Provision verdient"). The handles are the ones [Automations](/automations/suite-triggers) uses. New in
Affiliates **0.2**.

Offering a trigger sends nothing. Data leaves only through an outbound webhook somebody creates
for it. Webhook Manager 2.10 or later sends the payload's `event_id` as the delivery's
idempotency key (`X-Webhook-Id`, and `Idempotency-Key` where the hook asks for it); see
[Outbound webhooks](/webhook-manager/outbound).

## Switching it off

| Key | Default | |
| --- | --- | --- |
| `webhook_manager.enabled` | `true`, env `AFFILIATES_WEBHOOK_MANAGER` | Off, the four triggers are not offered. |

Without Webhook Manager nothing of it is loaded; the coupling is a Composer `suggest`.

## The triggers

| Handle | Subject | Blocks after the frame |
| --- | --- | --- |
| `affiliates.commission_earned` | `commission` | `commission`, `partner` |
| `affiliates.commission_reversed` | `commission` | `commission`, `partner` |
| `affiliates.partner_applied` | `partner` | `partner`, with the applicant's `message` |
| `affiliates.partner_approved` | `partner` | `partner` |

`commission_earned` fires once per commission row, joint-venture shares included (`kind: jv`).
`commission_reversed` fires for a refund, a chargeback or a cancellation in the Control Panel;
for a commission already paid out, the `commission` block is the negative clawback row. A
further partial reversal is a new moment.

## The payload

Every body starts with the frame all suite addons share:

```json
{
  "event": "affiliates.commission_earned",
  "event_id": "3c7a1e9f0b4d2a8c6e1f5b9d3a7c0e4f8b2d6a1c",
  "occurred_at": "2026-09-24T10:12:03+02:00",
  "brand": { "id": 2, "handle": "nordlicht" },
  "subject_type": "commission",
  "subject_id": 9,
  "commission": { "...": "below" },
  "partner": { "...": "below" }
}
```

**`commission`**: `id`, `kind` (`sale`, `recurring`, `bump`, `upsell`, `jv`, `clawback`),
`status`, `product`, `cycle`, `base_cent`, `amount_cent`, `reversed_cent`, `currency`, `rate`,
`payment_id`, `reverses_id`, `reason`, `sold_at`, `available_at`, `approved_at`, `reversed_at`,
`created_at`.

**`partner`**: `id`, `name`, `email`, `code`, `status`, `commission_percent`, `website`,
`created_at`, `approved_at`. On `partner_applied` also `message`, what the applicant wrote,
because that is what the operator decides on.

Money is always `*_cent` next to `currency`. Times are ISO 8601 with offset, or `null`.

## What never goes along

The body is a chosen list of fields, never the row. Not in any payload:

- the payout method and payout details (IBAN, PayPal address);
- the invitation token;
- the operator's notes on the partner;
- the linked user account.

The commission payload names the partner, never the buyer: the buyer is in the Payments
webhook for the same payment (`payment_id`).

## Brand

A commission is booked while a Payments webhook is handled, where no brand is current. Each
moment is therefore handed over in the **brand of the row**, so the hooks of that brand get
it. `brand` is `{id, handle}`, or `null` without [Brand Context](/brand-context/).

A row naming a brand that cannot be set (deleted, a bad backfill) is **not delivered** and
logged, rather than sent through the hooks of whichever brand is current.

## Duplicates and order

- **`event_id`** is `sha1` of the handle, the row and the row's own time, and for a reversal
  also the amount taken back so far. The same moment told twice has the same id; deduplicate on
  it.
- **`occurred_at`** is the row's own time (`created_at`, `reversed_at`, `approved_at`), not the
  time of sending.
- **Order is not guaranteed.** `affiliates.commission_reversed` can reach a receiver before the
  `payments.refunded` that caused it. Sort by `occurred_at`.
- A moment inside a database transaction (the ledger reverses in one) is handed over after the
  commit, never after a rollback.

A failure in Webhook Manager is logged and never breaks the booking.
