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

## What comes with it

| Package | Constraint | |
| --- | --- | --- |
| `mollie/mollie-api-php` | `^2.79 \|\| ^3.0` | The SDK. Installed automatically. |

That is the whole dependency list. The Mollie **Laravel** wrapper is deliberately not used:
it does not support Laravel 13, which Statamic 6 does, so the client is built in this
addon's own service provider instead.

Nothing here needs a `repositories` entry. Everything resolves from Packagist.

::: tip There is no Brand Context dependency
Payments is not brand-scoped. A payment is a transaction, not content, and it belongs to
the installation rather than to a brand. [Invoices](/invoices/numbering) is where brands
start to matter, because a number series does belong to one.
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

Two commands exist, and neither is registered automatically. Add the ones you switch on:

```php
// routes/console.php
Schedule::command('payments:sweep-abandoned')->hourly();
Schedule::command('payments:prune-unpaid')->daily();
```

| Command | Needs | Without it |
| --- | --- | --- |
| `payments:sweep-abandoned` | `abandoned.enabled` | `CheckoutAbandoned` never fires |
| `payments:prune-unpaid` | `prune_unpaid_after_days` above `0` | unpaid checkouts are kept for ever |

Both are off by default. See [Abandoned checkouts](/payments/abandoned) and
[Tax facts and retention](/payments/tax-and-retention#deleting-checkouts-that-were-never-paid).

## Permissions

Two, registered by core along with the screens they belong to:

| Permission | Grants |
| --- | --- |
| `access payments utility` | The Payments screen |
| `access subscriptions utility` | The Subscriptions screen, **and cancelling** |

They are separate on purpose. "May read the till" is not the same authority as "may end
somebody's agreement".

## Verifying the install

Take one real payment with a test key and watch three things happen in order: a row appears
in **Utilities → Payments** with the status `open`, the status turns `paid`, and the
`Fulfilled` column fills in. If the first two happen and the third does not, a listener
threw — see [Troubleshooting](/payments/troubleshooting).

## Licence

Commercial: `composer.json` says `proprietary`. See [Licensing](/guide/licensing) for how
the commercial addons in the suite resolve their licence.
