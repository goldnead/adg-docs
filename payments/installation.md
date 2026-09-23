# Installation

<AddonHeader />

<Requirements />

Plus a **Mollie account**. A test key from the dashboard starts with `test_` and moves no
money, which is what you want until the whole path has run once end to end.

```bash
composer require goldnead/statamic-payments
php artisan migrate
php artisan vendor:publish --tag=statamic-payments-config
```

No front-end build step: the addon ships its compiled Control Panel assets under `dist/`,
and Statamic publishes them on install.

<Figure
  src="payments-filters"
  alt="The listing with the filter menu open, offering status, fulfilment and date range"
  caption="Filters narrow the listing to the question you actually have: paid but not fulfilled, say." />

## What comes with it

| Package | Constraint | |
| --- | --- | --- |
| `mollie/mollie-api-php` | `^2.79 \|\| ^3.0` | The SDK. Installed automatically. |

That is the whole dependency list. The Mollie **Laravel** wrapper is deliberately not used:
it does not support Laravel 13, which Statamic 6 does, so the client is built in this
addon's own service provider instead.

Nothing here needs a `repositories` entry. Everything resolves from Packagist.

::: tip Brand Context is optional
Payments does not require [Brand Context](/brand-context/). Its rows carry a `brand_id`, `0`
on a single-brand install. With Brand Context installed, each brand gets its own settings on
the shared settings screen, the portal shows each brand only its own orders, and commands and
webhooks run each row's work under that row's brand (`Brands::runFor()`).
:::

## Two things in `.env`

```dotenv
MOLLIE_KEY=test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

That is the only required value. Everything else in
[Configuration](/payments/configuration) has a working default, except the catalogue, which
ships empty on purpose: an addon that carried prices would be wrong about every site that
installed it.

## Quick start

### 1. List what you sell

```php
// config/statamic-payments.php
'products' => [
    'noten-paket' => [
        'name' => 'Notenpaket „Frühling"',
        'amount_cent' => 1900,
    ],
],
```

`amount_cent` is an integer in minor units. Not a float: a float is how a cent goes missing
every thousand orders.

### 2. Start a checkout

```php
use Goldnead\StatamicPayments\Support\Checkout;

$checkout = app(Checkout::class)->start('noten-paket', [
    'email' => $request->input('email'),
    'name' => $request->input('name'),
]);

abort_if($checkout === null, 404);          // no such product

return redirect()->away($checkout->checkoutUrl);
```

### 3. React when it is paid

```php
use Goldnead\StatamicPayments\Events\PaymentPaid;

Event::listen(PaymentPaid::class, function (PaymentPaid $event) {
    $event->payment->product;
    $event->payment->email;
    $event->payment->amount_cent;
});
```

### 4. Look at the screen

**Utilities → Payments.** When, what, how much, paid or not, **fulfilled or not**, and who
bought it. The filter *Paid, not fulfilled* is the one worth knowing: Mollie can tell you
the money arrived, only the site knows whether the buyer got anything for it.

## The webhook, in development

Mollie checks that a webhook URL is reachable **from its side** before it will create a
payment, and refuses `localhost` outright — so on a development machine a checkout fails
with a 422 before the buyer sees anything.

Point it at a tunnel:

```dotenv
STATAMIC_PAYMENTS_WEBHOOK_URL=https://something.ngrok-free.app/!/statamic-payments/webhook
```

Or set `webhook_url` to `false` in the config, which omits it entirely. Then nothing is
pushed and the status has to be pulled by hand:

```php
app(Fulfilment::class)->handle($providerId);   // what the webhook route calls
```

Fine for a demo, **wrong for production**: a buyer who closes the tab is never followed up.

## A queue worker

Not required. Nothing in this addon queues by default — fulfilment runs inside the webhook
request, which is what makes the once-only claim meaningful. If a listener of yours does
slow work, queue **that listener**, not the fulfilment.

## The scheduler

None of the commands is registered automatically. Add the ones you use, each with
`withoutOverlapping()`:

```php
// routes/console.php
Schedule::command('payments:resume-paused')->daily()->withoutOverlapping();
Schedule::command('payments:reminders')->dailyAt('09:00')->withoutOverlapping();
Schedule::command('payments:dunning')->daily()->withoutOverlapping();
Schedule::command('payments:sweep-abandoned')->hourly()->withoutOverlapping();
Schedule::command('payments:prune-unpaid')->daily()->withoutOverlapping();
Schedule::command('payments:prune-legal-drafts')->daily()->withoutOverlapping();
```

| Command | Needs | Without it |
| --- | --- | --- |
| `payments:resume-paused` | subscriptions that can be paused, switched or cancelled | dated pauses never resume, and a row a dead process left in `pausing`, `resuming`, `switching` or `cancelling` stays there. See [the clean-up run](/payments/subscription-changes#the-clean-up-run) |
| `payments:reminders` | one of the `reminders.*` switches | no reminder before a charge or a card expiry goes out. See [Reminders](/payments/reminders) |
| `payments:dunning` | `dunning.enabled` | failed renewals are not followed up |
| `payments:sweep-abandoned` | `abandoned.enabled` | `CheckoutAbandoned` never fires |
| `payments:prune-unpaid` | `prune_unpaid_after_days` above `0` | unpaid checkouts are kept for ever |
| `payments:prune-legal-drafts` | | unconfirmed withdrawal and cancellation drafts are kept for ever |

See [Abandoned checkouts](/payments/abandoned) and
[Tax facts and retention](/payments/tax-and-retention#deleting-checkouts-that-were-never-paid).

## Permissions

| Permission | Grants |
| --- | --- |
| `access payments utility` | The Payments screen (registered by core with the screen) |
| `access subscriptions utility` | The Subscriptions screen, read-only (registered by core with the screen) |
| `manage payment subscriptions` | Pausing, resuming, switching **and cancelling** a subscription. **1.25** |
| `handle payment withdrawals` | Marking a withdrawal as handled |
| `handle payment cancellations` | Marking a cancellation as handled |
| `manage payments settings` | The Payments section of the shared settings screen |

"May read the till" is not the same authority as "may change what somebody pays".

## Upgrading to 1.25 {#upgrading-to-1-25}

Read this before you update. Five steps, and the first one fails silently if you skip it.

1. **Give roles the new permission.** Pausing, resuming, switching **and cancelling** in the
   Control Panel now need `manage payment subscriptions` on top of
   `access subscriptions utility`. A role that could cancel until now loses the action without an
   error: the menu entry is simply gone. Super users are not affected.
2. **`php artisan migrate`.** One additive migration: `subscriptions.paused_at`, `resumes_at`,
   `card_expires_at`, `card_checked_at`, and the table `payment_subscription_notices`.
3. **Abandoned checkouts need consent now.** `abandoned.capture` defaults to `consent`: with
   `abandoned.enabled` on, only checkouts whose form passed `meta.reminder_consent = true` are
   announced. Pass the consent from the form, or set `always` for the old behaviour. See
   [Abandoned checkouts](/payments/abandoned#whose-address-may-be-used-abandoned-capture).
4. **Behind Cloudflare or another proxy, set up TrustProxies.** The new checkout brake is on by
   default and counts per IP. See
   [Checkout protection](/payments/checkout-protection#the-brake).
5. **Schedule `payments:resume-paused`** wherever subscriptions are paused, switched or cancelled.

If you published the portal views, publish them again (see
[The customer portal](/payments/portal#updating-the-views)).

## Verifying the install

Take one real payment with a test key and watch three things happen in order: a row appears
in **Utilities → Payments** with the status `open`, the status turns `paid`, and the
`Fulfilled` column fills in. If the first two happen and the third does not, a listener
threw — see [Troubleshooting](/payments/troubleshooting).

## Licence

Commercial: `composer.json` says `proprietary`. See [Licensing](/guide/licensing) for how
the commercial addons in the suite resolve their licence.
