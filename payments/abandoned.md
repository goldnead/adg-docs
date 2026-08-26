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

## Not the same as pruning

`payments:sweep-abandoned` **announces**; `payments:prune-unpaid` **deletes**. The second
leaves anything inside a running reminder sequence alone, precisely so that an automation
whose trigger vanishes underneath it does not fail halfway through. See
[Tax facts and retention](/payments/tax-and-retention#deleting-checkouts-that-were-never-paid).
