# Abandoned checkouts

<AddonHeader />

Somebody started a checkout and did not finish it. The whole feature is one question asked
on a schedule: is this payment still unpaid, and has it been unpaid for long enough that
the person is not simply still typing?

Everything difficult about it is in the words *long enough* and *once*.

## Off by default, and not out of caution about the code

> The address on an unfinished checkout was given to complete a purchase, not to receive
> advertising. Whether a reminder may go out is a question of consent, not of
> configuration — and the suppression list belongs in front of the send either way.

That is why this ships switched off, and why `CheckoutAbandoned` is deliberately **not**
permission to send mail. `Payment::$email` is on the event because the listener needs it to
*ask*.

## Switching it on

```php
// config/statamic-payments.php
'abandoned' => [
    'enabled' => true,
    'after_minutes' => 60,
],
```

```php
// routes/console.php
Schedule::command('payments:sweep-abandoned')->hourly();
```

The sweep is not scheduled for you. Without the schedule the flag does nothing.

`after_minutes` is in minutes rather than hours because the line between "still typing" and
"gone" is not the same on a nine-euro download as on a course that costs two thousand.

## What counts as abandoned

| Status | Abandoned? |
| --- | --- |
| `initiated` | yes — a row written before the provider was asked |
| `open` | yes — the provider knows about it and nobody paid |
| `failed` · `expired` · `canceled` | **no** |
| anything fulfilled | no |

The three final ones already have `PaymentFailed`. Announcing both would mean two mails
about one thing.

## Once each

The claim is a conditional update on `abandoned_notified_at`, the same shape as
`fulfilled_at` and `failed_notified_at`. The sweep runs on a schedule and may overlap
itself; without a claim in the table, two runs both read `open` and both announce — and the
visible result is a customer getting the same reminder twice.

A payment that arrives afterwards **clears the claim**, so a sequence can end on
`PaymentPaid`, which is the honest signal that they bought it.

The sweep works in chunks and is indexed on `(status, abandoned_notified_at)`, because the
first run on an existing installation meets every old open payment at once, and this is the
one table that only grows.

## Reacting to it

```php
use Goldnead\StatamicPayments\Events\CheckoutAbandoned;

Event::listen(CheckoutAbandoned::class, function (CheckoutAbandoned $event) {
    $event->payment->email;
    $event->payment->items;
});
```

With [Automations](/automations/) installed, the trigger **Checkout Abandoned**
(`payments.checkout_abandoned`) appears under Payments and needs no code at all.

::: warning Before you build a mail step on this
Ask the consent question first, and put your suppression list in front of the send. The
sweep tells you a checkout was left; it does not tell you that you may write to the person
who left it.
:::

## Running it by hand

```bash
php artisan payments:sweep-abandoned
```

Announces every checkout past the cut-off and reports how many. Safe to run repeatedly —
the claim is what makes it safe.

## The reminder mail

Once the consent question is answered, the addon can send the reminder itself instead of
leaving it to a sequence:

```php
'abandoned' => [
    'enabled' => true,
    'after_minutes' => 60,
    'mail' => [
        'enabled' => true,
        'template' => 'warenkorb-erinnerung',   // an email-templates slug, or null
        'subject' => null,                       // null: the built-in subject
        'resume_url' => null,                    // null: a signed link that restarts the checkout
        'resume_days' => 14,
    ],
],
```

One mail per announced checkout, to the address on it, from the listener
`SendAbandonedCheckoutMail` on `CheckoutAbandoned`. Its own switch, deliberately: announcing
an abandoned checkout and mailing the person are two decisions.

### The suppression list

With [Suppression](/suppression/) installed, the address is asked first
(`SuppressionGate::isSuppressed($email, $brandId)`). A suppressed address gets no mail and a
note (`abandoned_suppressed`) in the payment's [communication log](/payments/communications)
instead. A list that does not answer counts as suppressed — one mail too many to somebody who
opted out is the dearer mistake.

Without that addon there is no list to ask. Put your own in front, or leave this off.

### The template

With [Email Templates](/email-templates/) installed and `template` naming an existing slug,
that template goes out exactly as its preview shows, with these variables:

| Variable | |
| --- | --- |
| `{{ buyer.email }}` · `{{ buyer.name }}` | the address on the checkout, and the name if there was one |
| `{{ order.lines }}` | an HTML list of the lines: quantity, name, amount |
| `{{ order.total }}` · `{{ order.currency }}` | what the checkout would charge |
| `{{ order.id }}` · `{{ order.product }}` | the payment id and the primary handle |
| `{{ resume_url }}` | where the button goes, see below |

The template's own subject wins over `subject`. Without the addon, or with a slug that
resolves to nothing, a plain built-in mail goes out — German and English, no images,
publishable under `views/vendor/statamic-payments/abandoned/mail` and worded in
`lang/vendor/statamic-payments/{de,en}/abandoned.php`. Either way the line lands in the
communication log as `abandoned`, `sent` or `failed`.

### Where the button goes

The provider's original checkout URL expires within minutes for cards, so a reminder cannot
point back at it. `resume_url` left `null` builds a **signed, expiring link**
(`/!/statamic-payments/weiter/{id}`, valid `resume_days`) that runs `Checkout::resume()`: the
same lines in the same order, the same buyer, origin, discount and the recorded consent, as a
**new** payment whose `meta.resumed_from` points back at the reminded one. Following the link
redirects to Mollie; nothing is charged by following it. A payment that was paid meanwhile, or
whose lines no longer resolve, answers with a one-sentence page (HTTP 410) instead of a 404.

Your own URL may carry `{payment}`: `'resume_url' => '/kasse/weiter?zahlung={payment}'`.

::: tip The consent travels with the restart
`consent_at` and `consent_text` are copied onto the resumed payment: the same person declared
them for the same goods on the same order, and the restart changes the payment, not the
declaration. A legal decision taken on 02.09.2026 and recorded for review, not legal advice.
:::

### Recovered revenue

When a reminded payment is paid after all — itself, or through the restarted checkout —
`payments.recovered_at` is set on the **reminded** row. `abandoned_notified_at` is still
cleared as before, so nothing that read it changes; `recovered_at` is what a report sums.

```php
Payment::whereNotNull('recovered_at')->sum('amount_cent');
```

## Not the same as pruning

`payments:sweep-abandoned` **announces**; `payments:prune-unpaid` **deletes**. The second
leaves anything inside a running reminder sequence alone, precisely so that an automation
whose trigger vanishes underneath it does not fail halfway through. See
[Tax facts and retention](/payments/tax-and-retention#deleting-checkouts-that-were-never-paid).
