# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=statamic-payments-config
```

Everything lives in `config/statamic-payments.php`. There is no Control Panel settings
screen: the two screens this addon ships are read-only views of what happened, and a price
is not a preference.

## The whole file at a glance

| Key | Default | What happens when it is wrong |
| --- | --- | --- |
| `key` | `env('MOLLIE_KEY')` | Nothing can be charged. A `test_` key moves no money. |
| `products` | `[]` | Nothing can be bought. An addon that shipped prices would be wrong about every site. |
| `currency` | `EUR` | Must match what your Mollie account accepts. |
| `return_url` | `/danke` | Where the buyer lands after paying. **Not** where fulfilment happens. |
| `webhook_url` | `env('STATAMIC_PAYMENTS_WEBHOOK_URL')` | Null uses this addon's own route. A string overrides it. `false` omits it and nothing is pushed. |
| `prune_unpaid_after_days` | `0` | `0` is off. Above it, `payments:prune-unpaid` deletes unpaid checkouts that old. |
| `max_quantity` | `1000` | The global cap on a quantity a request may ask for. |
| `abandoned.enabled` | `false` | On, plus a scheduled sweep, dispatches `CheckoutAbandoned`. |
| `abandoned.after_minutes` | `60` | How long "still typing" lasts before a checkout counts as gone. |
| `rate_limit` | `60` | Per minute, per IP, on the webhook. |
| `follow_up.enabled` | `false` | The post-payment offer. Read [Bumps and follow-up offers](/payments/bumps) before switching it on. |
| `follow_up.collect_mandate` | `false` | Makes the first payment ask the provider to remember the buyer. Required for follow-ups **and** for subscriptions. |
| `entitlements.enabled` | `false` | On, plus a `grants` key on a product, grants that entitlement to the buyer. |

## Products

The catalogue. Empty as shipped.

```php
'products' => [
    'noten-paket' => [
        'name' => 'Notenpaket „Frühling"',
        'amount_cent' => 1900,
    ],
],
```

Everything a product may declare is on [Products and the catalogue](/payments/catalogue),
including the keys that only matter to a sibling addon: `grants` for
[Entitlements](/entitlements/), `digital` for [Invoices](/invoices/).

## Currency

```php
'currency' => 'EUR',
```

The default for any product that does not name its own. A product may override it, but a
**single payment carries one currency**: two currencies in one order are refused rather
than converted.

Minor units are not always hundredths. The Japanese yen has no minor unit and the Tunisian
dinar has three, and `Support\Money` knows which is which. Only the exceptions are listed;
two decimals is the default, because a table of every ISO 4217 code is one nobody
maintains.

## Where the buyer comes back to

```php
'return_url' => '/danke',
```

**The return URL proves nothing.** A buyer who closes the tab still paid; a buyer who
reaches that page has not necessarily paid. Only the webhook decides. Use the page to say
thank you, not to grant anything.

A caller may pass its own return URL to `Checkout::start()`. It is checked against this
application and an external target is **dropped**, not refused — the buyer has paid by
then, and failing the checkout over a bad return address would take their money and show
them an error.

## Where the provider reports back

```php
'webhook_url' => env('STATAMIC_PAYMENTS_WEBHOOK_URL'),
```

Three values, three meanings:

| Value | Effect |
| --- | --- |
| `null` (default) | This addon's own route, `/!/statamic-payments/webhook`. Right in production. |
| a string | Overrides it. What a tunnel's address goes into during development. |
| `false` | No webhook at all. Nothing is pushed; the status has to be pulled with `Fulfilment::handle()`. |

`false` is fine for a demo and **wrong for production**: a buyer who closes the tab is never
followed up.

## Quantities

```php
'max_quantity' => env('STATAMIC_PAYMENTS_MAX_QUANTITY', 1000),
```

A safety net, not a business rule. The quantity is the one number a checkout accepts from a
request, so a mistyped or hostile figure must not become a five-figure charge.

A product that offers a *variable* quantity — a donation, a pay-what-you-want — declares
`min_quantity` and `max_quantity` itself, and those win. **1.11.0.**

## Abandoned checkouts

```php
'abandoned' => [
    'enabled' => env('STATAMIC_PAYMENTS_ABANDONED', false),
    'after_minutes' => env('STATAMIC_PAYMENTS_ABANDONED_AFTER', 60),
],
```

Off by default, and that is not caution about the code. The address on an unfinished
checkout was given to complete a purchase, not to receive advertising. See
[Abandoned checkouts](/payments/abandoned).

`after_minutes` is in minutes rather than hours because the line between "still typing" and
"gone" is not the same on a nine-euro download as on a course that costs two thousand.

## Unpaid checkouts

```php
'prune_unpaid_after_days' => env('STATAMIC_PAYMENTS_PRUNE_UNPAID_DAYS', 0),
```

`0` switches it off. Above it, `payments:prune-unpaid` deletes checkouts that were started
and never paid. The reason is not tidiness — see
[Tax facts and retention](/payments/tax-and-retention#deleting-checkouts-that-were-never-paid).

## Follow-up offers

```php
'follow_up' => [
    'enabled' => env('STATAMIC_PAYMENTS_FOLLOW_UP', false),
    'collect_mandate' => env('STATAMIC_PAYMENTS_COLLECT_MANDATE', false),
],
```

Two flags, and both have to be on. `collect_mandate` makes the first payment ask the
provider to remember the buyer, which is what makes a later charge possible at all — and it
is a thing the buyer has to be told about **on the checkout page**.

::: warning `collect_mandate` is also what subscriptions need
`Subscriptions::start()` refuses and logs a warning while it is off. A subscription without
a stored payment method is not a subscription.
:::

Switching `enabled` on is not only a technical decision. Read
[Bumps and follow-up offers](/payments/bumps#what-the-page-must-carry) first.

## Entitlements

```php
'entitlements' => [
    'enabled' => env('STATAMIC_PAYMENTS_ENTITLEMENTS', false),
],
```

Off unless three things are true: [Entitlements](/entitlements/) is installed, this flag is
on, and the product carries a `grants` key. A payment addon that granted access by default
would be deciding something that is the site's to decide.

## Rate limit

```php
'rate_limit' => 60,
```

Per minute, per IP, on the webhook route. The endpoint is cheap — it reads an id and asks
Mollie about it — but it is public, and a public endpoint without a throttle is an
invitation.

## Environment summary

```dotenv
MOLLIE_KEY=
STATAMIC_PAYMENTS_WEBHOOK_URL=
STATAMIC_PAYMENTS_PRUNE_UNPAID_DAYS=0
STATAMIC_PAYMENTS_MAX_QUANTITY=1000
STATAMIC_PAYMENTS_ABANDONED=false
STATAMIC_PAYMENTS_ABANDONED_AFTER=60
STATAMIC_PAYMENTS_FOLLOW_UP=false
STATAMIC_PAYMENTS_COLLECT_MANDATE=false
STATAMIC_PAYMENTS_ENTITLEMENTS=false
```
