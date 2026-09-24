# Webhooks

<AddonHeader />

With [Webhook Manager](/webhook-manager/) installed, each of the [events](/offers/reference#events)
this addon fires is a trigger for outbound webhooks, with the source type `offers` and labels in
German and English. A seat accepted, an offer sold out, a coupon redeemed, a short link that
switched: a CRM, a spreadsheet or an n8n flow hears about it. New in Offers **1.13**.

Offering a trigger sends nothing. Data leaves only through an outbound webhook somebody creates.
The triggers appear with Webhook Manager 2.9 or later. **Webhook Manager 2.10** groups them in
the trigger picker and sends each body's `event_id` as the delivery's idempotency key.

## Switching them off

```php
// config/statamic-offers.php
'webhook_manager' => [
    'enabled' => env('STATAMIC_OFFERS_WEBHOOK_MANAGER', true),
],
```

`STATAMIC_OFFERS_WEBHOOK_MANAGER=false` switches the bridge off. Without Webhook Manager nothing
of it is loaded.

## What every body carries

The frame the suite addons share: `event` (the handle), `event_id`, `occurred_at` (when the
moment happened, ISO 8601 with offset), `brand` (`{id, handle}` or `null`), `subject_type` and
`subject_id`. The subject is the seat for seat events, the pool (`seat_pool`) for the pool
events, the coupon for a redemption, and the offer otherwise.

The blocks after the frame:

- `offer`: `id`, `handle`, `name`.
- `pool`: `id`, `product`, `seats`, `taken`, `owner` (`email`, `name`), `payment_id`,
  `closed_at`.
- `seat`: `id`, `email`, `name`, `status`, `invited_at`, `claimed_at`, `revoked_at`.
- `payment`: the same block [Payments sends in its own webhooks](/payments/webhooks#what-every-body-carries):
  amounts and discounts in cent, the buyer's `email`, `name` and `country`, `items[]`,
  `attribution`, timestamps. No card, mandate, customer reference or `meta`.

| Trigger | Fields after the frame |
| --- | --- |
| `offers.seat_pool_opened` | `offer`, `pool` |
| `offers.seat_invited` | `offer`, `pool`, `seat` |
| `offers.seat_accepted` | `offer`, `pool`, `seat` |
| `offers.seat_revoked` | `offer`, `pool`, `seat`, `previous_status`, `reason` |
| `offers.seat_pool_closed` | `offer`, `pool`, `reason` |
| `offers.sold_out` | `offer`, `quantity_limit`, `sold` |
| `offers.coupon_redeemed` | `coupon` (`id`, `code`, `name`, `percent`, `amount_cent`, `currency`), `discount_cent`, `currency`, `buyer` (`email`, `name`), `payment` |
| `offers.link_switched` | `offer`, `reason` (`date`, `sold_out`), `link` (`slug`, `target`, `fallback`, `switch_at`) |

## What never goes along

**Never a token.** Neither a seat's token nor the pool's `manage_token` is in any body: each of
them opens a seat page as that person, and a webhook body ends up in logs and third-party tools.

## Brand

A hook fires in the event's brand: the brand of the pool, the offer or the payment. An event
whose brand no longer exists sends nothing and is logged, rather than reaching the hooks of
whichever brand is current.

## Duplicates and order

- **After the commit.** A moment is sent after its database transaction commits, and not at all
  if it is rolled back.
- **`event_id`** is `sha1(handle|<type>:<id>|<time the row records>)`, the recipe of every suite
  addon. For a coupon it is keyed on the payment (`coupon:<id>|payment:<id>|<paid_at>`), so a
  "paid" that Payments delivers again carries the same id. Webhook Manager 2.10 sends it as
  `X-Webhook-Id`, and as `Idempotency-Key` where the hook has that switch on.
- **Order is not guaranteed** (retries, queues). Sort by `occurred_at`, deduplicate by
  `event_id`.

When each moment fires, and why "sold out" and the short link's switch can come in either
order, is on [Reference → Events](/offers/reference#events).
