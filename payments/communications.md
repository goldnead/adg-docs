# The payment detail page and the communication log

<AddonHeader />

Utilities → Payments → click a row, or **Details** in its menu: `cp/utilities/payments/{id}`.
One payment, whole — and underneath it the answer to the question that used to live in
nobody's memory: *did the invoice actually go out?*

## What the page shows

The head carries the amount, the status and the four timestamps (started, paid, fulfilled,
provider id). Below it, panels the way a publish form groups its fields:

| Panel | From |
| --- | --- |
| **Lines** | `payment_items`: kind (primary, bump, follow-up), quantity, unit price, line total, and the offer the line was sold through (`offer`) |
| **Buyer** | `email`, `name`, `country` with its source, the address from `meta.address`, the VAT ID from `meta.vat_id`, the stored mandate reference |
| **Consent (§ 356 (5) BGB)** | `consent_at`, the exact `consent_text`, and the version of the withdrawal instruction from `meta.withdrawal.version` |
| **Access window** | `meta.access` — `starts_at`, `days`, and the end computed from the two |
| **Origin** | the UTM columns, referrer, landing page |
| **Payment method** | `card_label`, `card_last4` |
| **Refunds** | `refunded_cent`, `refunded_at`, the provider references in `meta.refunds` |
| **Related** | the original order a follow-up grew out of, follow-ups, the subscription, the invoice (with [Invoices](/invoices/) installed), withdrawals and cancellations that matched this payment |
| **Communication** | the log below, newest first — "Nothing sent yet" until there is a line |
| **Webhook deliveries** | only with [Webhook Manager](/webhook-manager/) installed: `WebhookLog::forSubject('payment', $id)` |

Same permission as the listing (`access payments utility`). On a multi-brand install with a
brand selected, a payment of another brand is a **404**, not a 403 — "does not exist" gives
away less than "exists, not yours".

Read-only, like the listing. Refunds happen at Mollie.

## The communication log

`payment_communications` keeps one line per event, append-only:

| Column | |
| --- | --- |
| `payment_id` · `brand_id` | whose |
| `channel` | `mail` · `webhook` · `export` · `note` |
| `kind` | what, 64 characters, yours: `invoice`, `purchase_confirmation`, `access`, `receipt`, … |
| `recipient` · `subject` | where it went and what it said |
| `status` | `sent` · `failed` · `queued` |
| `reference` | what the channel returned: a message id, a delivery uuid |
| `meta` | JSON, anything else worth keeping |
| `happened_at` | when |

### What the addon writes itself

| Line | When |
| --- | --- |
| `portal_link` | a customer-portal link was mailed — logged on the address's **latest** paid order |
| `withdrawal_receipt` | the § 356a acknowledgement went out **and** a payment matched |
| `cancellation_receipt` | the § 312k acknowledgement went out and a subscription matched — logged on that subscription's latest payment |
| `cancellation_confirmation` | the portal's cancellation confirmation, same rule |
| `abandoned` | the [reminder mail](/payments/abandoned#the-reminder-mail) went out (`failed` if it did not) |
| `abandoned_suppressed` (note) | the reminder was withheld because the address is on the suppression list |
| `invoice` | written by [Invoices](/invoices/) when it delivers the PDF |

### Writing your own

```php
use Goldnead\StatamicPayments\Facades\PaymentLog;

// A mail. $payment may be the model or its id.
PaymentLog::mail($payment, 'purchase_confirmation', $to, $subject);

// A mail that did not go out.
PaymentLog::mail($payment, 'access', $to, $subject, 'failed', ['error' => $e->getMessage()]);

// A note — from support, from a script.
PaymentLog::note($payment, 'support', 'Zugang von Hand verlängert bis 31.12.');

// Any channel.
PaymentLog::record($payment, 'export', 'datev', ['reference' => $batchId, 'status' => 'sent']);

// Reading, newest first.
PaymentLog::for($payment);
```

Every write dispatches `Goldnead\StatamicPayments\Events\PaymentCommunicationLogged` with the
row, for a CRM that wants the line on the contact's timeline as well.

The screen translates the kinds it knows and shows the rest as written, so a kind of your own
needs no translation to appear.

::: tip A write that fails never throws
A missing table, a lost connection — the mail is out either way, and a checkout must not fail
because its diary did. The failure is logged as a **warning**, so a gap in the log is never
mistaken for "nothing was sent". `PaymentLog::mail()` returns the row, or `null` when it could
not be written.
:::

## Where a host puts the call

Wherever the mail is sent, after it was sent:

```php
Mail::to($payment->email)->send($mailable = new WelcomeMail($payment));

PaymentLog::mail($payment, 'purchase_confirmation', $payment->email, $mailable->envelope()->subject);
```

A queued mail is honest as `queued` at dispatch time and `sent` from the job that sends it —
or simply `sent` from the job alone, which is the line most people want to see.
