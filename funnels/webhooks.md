# Webhooks

<AddonHeader />

With [Webhook Manager](/webhook-manager/) installed, every funnel event is a trigger an outbound
webhook can listen to (source type `funnels`). From Webhook Manager 2.10 they sit under the
heading **Funnels** in the trigger picker, labelled in German and English. The handles are the
ones [Automations](/automations/suite-triggers) uses. New in Funnels **1.18**.

Offering a trigger sends nothing. Data leaves only through an outbound webhook somebody creates
for it. Webhook Manager 2.10 or later sends the payload's `event_id` as the delivery's
idempotency key (`X-Webhook-Id`, and `Idempotency-Key` where the hook asks for it).

::: warning `funnels.form_submitted` carries what the visitor typed
Its `values` block holds the form fields as entered on the capture step, which is personal data.
Whoever points a hook at this trigger hands that data to the receiving service (a CRM, Zapier,
n8n, a mailing tool). The receiver then processes it on your behalf, which under the GDPR makes
it a processor: you need a data processing agreement with it (Art. 28 GDPR), as with any other
processor, and it belongs in your privacy notice. See [what `values` holds](#values).
:::

## Switching it off

| Key | Default | |
| --- | --- | --- |
| `webhook_manager.enabled` | `true`, env `STATAMIC_FUNNELS_WEBHOOK_MANAGER` | Off, the funnel triggers are not offered. |

In `config/statamic-funnels.php`. Without Webhook Manager nothing of it is loaded.

## The triggers

| Handle | Blocks after the frame |
| --- | --- |
| `funnels.step_entered` | `funnel`, `step`, `visit` |
| `funnels.form_submitted` | `funnel`, `step`, `visit`, `form` (handle or `null`), `values` |
| `funnels.offer_accepted` | `funnel`, `step`, `visit`, `offer {handle}`, `payment` |
| `funnels.offer_declined` | `funnel`, `step`, `visit`, `offer {handle}`; every "no" |
| `funnels.upsell_declined` | `funnel`, `step`, `visit`, `offer {handle}` (the one declined), `bought` (the payment before it, or `null`); fires together with `offer_declined` |
| `funnels.completed` | `funnel`, `visit`, `completed_at` |
| `funnels.funnel_saved` | `funnel` (with `published`), `steps` (the number of steps) |

`offer_accepted` means paid: it fires when the payment addon's webhook says the money arrived,
never on the click. See [The checkout step](/funnels/checkout).

## The payload

Every body starts with the frame all suite addons share: `event` (the handle), `event_id`,
`occurred_at` (when the moment happened, ISO 8601 with offset), `brand` (`{id, handle}` or
`null`), `subject_type` (`funnel`) and `subject_id` (the funnel's id). Then:

- **`funnel`**: `{id, handle, title}`.
- **`step`**: `{key, type, label, slug}`.
- **`visit`**: `{id, email, name}`. **Never the visit token**: it is the visitor's cookie, and
  with it anyone could continue the walk.
- **`payment`**: the same block [Payments](/payments/) sends in its own webhooks: `id`,
  `provider`, `provider_id`, `status`, `product`, `amount_cent`, `currency`, discount and refund
  in cents, the buyer's `email` and `name`, `country`, `items[]`, `attribution {utm_*}` and the
  timestamps. No card, no mandate, no customer reference, no `meta`.

### `values` {#values}

What the visitor typed on the capture step, under the field keys: `email`, `name`, the billing
address (`street`, `postal_code`, `city`, `country`), `phone`, `company`, `vat_id`, the newsletter
checkbox, and every field the offer's checkout field library defines.

Held back are only framework fields (keys starting with `_`) and fields whose key contains, in
any case, `password`, `passwort`, `token`, `secret`, `iban`, `bic`, `card`, `kredit`, `karte`,
`cvc` or `cvv`. The match is on the key, as a substring: a field called `discard_reason` is held
back too, and a field called `account_no` is not. Anything else a form asks for goes along. If a field should not leave the
site, do not put it on a funnel form, or do not wire `form_submitted` to a hook.

## Brand

A funnel has no brand of its own; what it sold does. A hook fires in the **brand of the
payment**, else in the brand of the request, which the funnel's controllers set from the offer
on the step. So a purchase confirmed by the provider's webhook, where no brand is current, still
reaches the hooks of the brand that sold it.

A payment whose brand no longer exists sends nothing (logged), rather than reaching the hooks of
whichever brand is current. An event with neither a payment nor a current brand is sent without
a brand; on a multi-brand site Webhook Manager then finds no hook for it.

## Duplicates and order

- **`event_id`** is `sha1(handle|visit:<id>|step:<key>|…|<the row's time>)`. The same moment
  told twice has the same id; deduplicate on it. A form submission is counted
  (`submission:<n>`), so two submissions in the same second are two moments.
- **Order is not guaranteed** (retries, queues). Sort by `occurred_at`, which is the moment's
  time, not the time of sending.
- A moment is sent after its database transaction commits, and not at all if it is rolled back.

A failure in Webhook Manager is logged and never breaks the funnel.
