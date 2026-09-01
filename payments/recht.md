# Consent, withdrawal and cancellation

<AddonHeader />

Three things German consumer law asks of a shop that sells digital goods to consumers
through a website, and what Payments does about each: it **records** the consent that ends
the right of withdrawal, it **ships** the withdrawal button of § 356a BGB, and it **ships** a
cancellation button under § 312k BGB that works without a login.

::: warning Not legal advice
Every decision on this page is written down so a lawyer can check it, not so you can skip
the lawyer. The statutory button labels are translation keys and must not be changed
without advice. Where the page says "decision of 1 September 2026", it names a choice the
addon made in the absence of case law, and you may need a different one.
:::

## Recording the consent (§ 356 Abs. 5 BGB)

For digital content delivered at once, the consumer's right of withdrawal ends only if they
expressly agreed to immediate delivery and acknowledged losing the right. A checkbox that is
validated and forgotten proves nothing afterwards, so the payment row carries two columns,
written in the same `INSERT` as the rest of the order:

| Column | Holds |
|---|---|
| `consent_at` | when the buyer agreed |
| `consent_text` | the full wording that stood next to the checkbox |

The wording itself is stored, not a version key: the text will change, and "agreed" without
the version agreed to is worthless. Both columns are **immutable** once set. A later save
that changes or erases either throws a `LogicException`; from `null` to a value works once.
Rows that predate the columns stay `null`, which is the honest state.

Hand both in through the details when starting a checkout — together or not at all:

```php
use Goldnead\StatamicPayments\Support\Checkout;

app(Checkout::class)->start('noten-paket', $buyer, null, null, [
    'consent_at' => now(),
    'consent_text' => __('statamic-payments::messages.order_consent'),
]);
```

`consent_at` accepts a Carbon, a `DateTimeInterface` or an ISO-8601 string and must not lie
in the future. `consent_text` must be non-empty and at most 4000 characters; a longer text is
refused rather than cut, because a cut record is a different record.

**A follow-up offer records its own consent.** `POST /!/statamic-payments/offer` takes the
wording from a hidden `consent_text` field (falling back to `messages.order_consent`) and
writes it onto the follow-up payment with the moment the form arrived. It does **not**
inherit the original order's consent: every purchase is its own contract.

**Without Funnels, the checkout page is yours.** Payments renders no checkout. The order
summary, the button label ("Zahlungspflichtig bestellen") and the consent sentence are the
host's to show, and the row can only record what the host hands it. Funnels does this for
you; a bespoke checkout passes `consent_at` and `consent_text` itself.

## The withdrawal button (§ 356a BGB)

In force since 19 June 2026. A shop concluding distance contracts with consumers through a
website has to offer an electronic withdrawal function: a button reading „Vertrag
widerrufen", permanently available and prominently placed during the withdrawal period; a
form for name, contract and contact details; a confirming button reading „Widerruf
bestätigen"; and an immediate acknowledgement of receipt stating the time.

Payments ships that shape, **public and without a login**. A login is permitted only where
the contract itself requires an account, and a shop that sells a download to a guest cannot
claim that.

```
GET  /!/statamic-payments/widerruf                      step 1
POST /!/statamic-payments/widerruf                      creates the declaration
GET  /!/statamic-payments/widerruf/{W-…}                step 2 for the declaring browser, step 3 for anyone
POST /!/statamic-payments/widerruf/{W-…}/bestaetigen    „Widerruf bestätigen"
```

### The three steps

1. **Declare.** Name, email address, order number or reference, how to be contacted
   (defaults to the address), an optional message. Nothing here is checked against the
   database.
2. **Confirm.** The details, once more, above a single button: „Widerruf bestätigen". This
   page is shown only to the browser that declared — it carries a name and an address.
3. **Acknowledge.** The reference (`W-` plus eight characters without 0, O, 1, I), the date,
   the time and the time zone. The same goes out by mail at once. This page shows nothing
   else and stays readable for anyone with the reference.

Confirming twice is one withdrawal: the moment is claimed with a conditional `UPDATE`, and a
second press shows the first time and sends no second mail.

### What the consumer is never told

**Whether an order exists.** Matching to a payment happens after confirmation, on the
server, and only on an unambiguous hit: the address compared case-insensitively, plus the
payment's own id or the provider's id. Two hits are none. The result reaches you in the
notification and on the Control Panel row; the consumer's acknowledgement is the same
whether a payment was found or not. A form that answered "no such order" would be an oracle
for which addresses have bought here, and a form that refused the declaration would take
from the consumer the timely receipt § 356a Abs. 5 guarantees.

**Whether the right has expired.** Where the matched payment carries a recorded consent
under § 356 Abs. 5, the row gets `right_expired_hint` and your notification says so. The
consumer is not told beforehand, and the declaration is not refused. Likewise a declaration
arriving after `withdrawal.days` (default 14) from the payment is flagged to you only.
Whether the period has actually run is a question for a person with the file in front of
them.

### The footer link

§ 356a Abs. 1 wants the button „während des Laufs der Widerrufsfrist auf der
Online-Benutzeroberfläche ständig verfügbar, hervorgehoben platziert und für den Verbraucher
leicht zugänglich". A footer that is on every page is where that holds. Label it with
`withdrawal.button` („Vertrag widerrufen"):

```antlers
<a href="{{ payments:withdrawal_url }}">{{ trans key="statamic-payments::withdrawal.button" }}</a>
```

In PHP, `Goldnead\StatamicPayments\Legal\Links::withdrawal()` returns the URL or `null` when
the flow is switched off; the route is `statamic-payments.withdrawal.form`.

Your withdrawal instruction (Widerrufsbelehrung) is not part of the addon. Put its URL in
`withdrawal.policy_url` and the form links to it.

### In the Control Panel

Utilities → Withdrawals lists confirmed declarations: reference, time of receipt, address,
order reference, the matched payment (linked into the Payments listing), the hints, and
whether somebody has handled it. „Mark as handled" is a row and bulk action that takes a
note; it needs `handle payment withdrawals` on top of `access withdrawals utility`, so that
reading the list and closing a case are two rights. Refunds themselves happen at Mollie, as
every refund does.

### Configuration

```php
'withdrawal' => [
    'enabled' => true,
    'prefix' => '!/statamic-payments/widerruf',
    'throttle' => '6,10',          // POSTs per IP: six in ten minutes
    'notify' => null,              // falls back to portal.from, then mail.from
    'policy_url' => null,          // your Widerrufsbelehrung
    'days' => 14,                  // only ever a hint to you
],
```

## The cancellation button without a login (§ 312k BGB)

The [customer portal](/payments/subscriptions#cancelling) already cancels a subscription
behind a mailed link. Under the prevailing reading of § 312k the *declaration* must be
possible without an identification step, so Payments offers a second way in, built like the
withdrawal:

```
GET  /!/statamic-payments/kuendigung                    „Verträge hier kündigen"
POST /!/statamic-payments/kuendigung
GET  /!/statamic-payments/kuendigung/{K-…}              confirmation page / acknowledgement
POST /!/statamic-payments/kuendigung/{K-…}/bestaetigen  „jetzt kündigen"
```

The confirmation page carries what § 312k Abs. 2 Nr. 1 names — the type of cancellation
(ordinary, or extraordinary with its reason), the contract identification, the requested
date — under a button reading „jetzt kündigen". Confirming acknowledges at once, by mail
and on the page, with date, time and the requested date, and notifies you.

### What happens to the subscription

Where the declaration names **one running** subscription unambiguously (address plus
`subscriptions.id` or the provider's id), it is cancelled at the provider immediately through
`Subscriptions::cancel()` — provider first, row second, exactly as the portal does — and the
declaration gets `provider_cancelled_at`. Where the match is ambiguous, the subscription is
no longer running, or the provider will not confirm, nothing is written to the subscription
and your notification says which. The consumer receives the acknowledgement in every case,
because the declaration has reached you either way.

**A requested date in the future does not hold the provider-side cancellation back.**
Decision of 1 September 2026: what the provider cancels is the next charge, and a charge
after a received cancellation is the harm the button exists to prevent. The date is recorded
and reported so you can carry the service to it where it is owed.

### Footer link and Control Panel

`{{ payments:cancellation_url }}`, `Legal\Links::cancellation()`, route
`statamic-payments.cancellation.form`; label with `cancellation.button` („Verträge hier
kündigen"). Utilities → Cancellations lists the declarations with the matched subscription
and whether it was cancelled at the provider; permissions `access cancellations utility` and
`handle payment cancellations`. Cancellations made in the portal are not listed here — they
are visible on the subscription itself.

Configuration mirrors the withdrawal block under `statamic-payments.cancellation`, without
`days`.

## Wording

Every word the consumer reads in either flow is in `lang/*/withdrawal.php` and
`lang/*/cancellation.php`, publishable with

```bash
php artisan vendor:publish --tag=statamic-payments-translations
```

The English files keep the German statutory wording in the button keys on purpose: the
statute prescribes German words, and a shop serving German consumers through an English
interface still owes them those words.
