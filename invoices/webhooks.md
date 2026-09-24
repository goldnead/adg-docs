# Webhooks

<AddonHeader />

With [Webhook Manager](/webhook-manager/) installed, the three [events](/invoices/reference)
appear there as triggers for outbound webhooks: "Invoices: invoice issued", in German
"Rechnungen: Rechnung ausgestellt". Hand an invoice to bookkeeping software or a CRM the moment
it exists. New in Invoices **2.3**.

Offering a trigger sends nothing. Data leaves only through an outbound webhook somebody creates.
The triggers appear with Webhook Manager 2.9 or later. **Webhook Manager 2.10** groups them in
the trigger picker and sends each body's `event_id` as the delivery's idempotency key.

## Switching them off

```php
// config/invoices.php
'webhook_manager' => [
    'enabled' => env('INVOICES_WEBHOOK_MANAGER', true),
],
```

`INVOICES_WEBHOOK_MANAGER=false` hides the triggers. Without Webhook Manager nothing of the
bridge is loaded.

## What every body carries

```json
{
  "event": "invoices.issued",
  "event_id": "9b2e61c0d4a7f3e8b1c6d0a9e4f7b2c5d8a1e3f6",
  "occurred_at": "2026-09-24T10:12:03+02:00",
  "brand": { "id": 2, "handle": "nordlicht" },
  "subject_type": "invoice",
  "subject_id": 17,
  "invoice": { "...": "see below" }
}
```

| Trigger | Besides the common keys |
| --- | --- |
| `invoices.issued` | `invoice` |
| `invoices.credit_note_issued` | `credit_note` (the same shape as `invoice`), `reverses` (`id`, `number`) |
| `invoices.delivered` | `invoice`, `to` (the address it was mailed to) |

**`invoice`**: `id`, `number`, `kind` (`invoice`, `credit_note`), `payment_id`,
`reverses_invoice_id`, `issued_at`, `currency`, `net_cent`, `tax_cent`, `gross_cent`,
`tax_zone`, `buyer_name`, `buyer_email`, `buyer_country`, `buyer_vat_id`, `items[]` (`product`,
`name`, `quantity`, `unit_net_cent`, `discount_cent`, `net_cent`, `tax_rate_bp`, `tax_cent`,
`gross_cent`).

Money is always `*_cent` next to `currency`. `tax_rate_bp` is the rate in basis points, 1900
for 19 %. Times are ISO 8601. `brand` is `null` where Brand Context cannot name one.

## What never goes along

- the postal address;
- the seller block;
- the record of the VAT ID check: the service, the status, the authority's reference;
- `meta`;
- a link to the PDF.

A receiver that needs the document fetches it from your site under its own permission, not from
the webhook.

## Brand

Each moment is delivered in the brand of the document, not the brand that happens to be
current: an invoice is written from a payment webhook, where none is. A document naming a brand
that cannot be set is **not delivered** and is logged, rather than sent through the current
brand's hooks.

## Duplicates and order

- **After the commit.** A moment inside a database transaction goes out after the commit, never
  after a rollback.
- **`event_id`** is the `sha1` of the handle, the document and its own time. It is the same
  every time the same moment is told again, so a receiver can drop the repeat. Webhook Manager
  2.10 sends it as `X-Webhook-Id`, and as `Idempotency-Key` where the hook has that switch on.
- **`occurred_at`** is the document's `issued_at` for `invoices.issued` and
  `invoices.credit_note_issued`, not the time of sending.
- **`invoices.delivered` has no time of its own** on the row, since a mail is not recorded on
  the invoice. Its time is the minute it went out, and its `event_id` is built from that
  minute, the document and the address. Two deliveries of the same document to the same
  address within the same minute therefore count as one.
- **Order is not guaranteed.** `invoices.delivered` can reach a receiver before
  `invoices.issued`, because the mail goes out from a listener of the same event. Sort by
  `occurred_at`, deduplicate by `event_id`.
