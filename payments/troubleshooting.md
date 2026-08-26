# Troubleshooting

<AddonHeader />

## `start()` returns null

The checkout refused. It is **all or none**, so any one of these refuses the whole thing:

1. **A handle is not in the catalogue.** Check `config/statamic-payments.php`, and remember
   an offer handle needs its prefix (`offer:fruehling`), not the bare name.
2. **A price is not an integer.** `null`, `-500` and `'19,00'` are all refused. `0` is not —
   see [Zero is a statement](/payments/catalogue#zero-is-a-statement).
3. **A quantity is outside bounds** — the product's own `min_quantity`/`max_quantity`, or
   the global `max_quantity` (default 1000). Quantity `0` refuses.
4. **Two currencies in one basket.**

None of these logs anything, because none of them is an error: the caller asked for
something that is not for sale, and `null` is the answer. Add the `abort_if` and you find
out immediately.

## The checkout fails on my development machine

Mollie checks that the webhook URL is reachable **from its side** before it will create a
payment, and refuses `localhost` outright — the API answers 422.

```dotenv
STATAMIC_PAYMENTS_WEBHOOK_URL=https://something.ngrok-free.app/!/statamic-payments/webhook
```

Or set `webhook_url` to `false` in the config, and pull the status by hand:

```php
app(Fulfilment::class)->handle($providerId);
```

That is fine for a demo and **wrong for production**: with no webhook, a buyer who closes
the tab is never followed up.

## The payment is paid and nothing was fulfilled

Look at the `Fulfilled` column in **Utilities → Payments**, then at `laravel.log`.

**A listener threw.** The claim is released, the exception reaches the caller, the webhook
answers non-2xx and the provider redelivers — so what you usually see is the same listener
failing over and over, in the log, on a schedule the provider chooses.

That behaviour is deliberate: keeping the claim would be "at most once", and the failure
mode of at-most-once is a customer who paid, got nothing, and no retry ever comes, silently,
because the row says fulfilled.

The fix is in the listener, not here. Make irreversible work idempotent, or queue it.

## A listener ran twice

Same cause, other side of the same trade. Some listener on the event threw *after* yours
did its work, the claim was released, and the provider delivered again — at which point
**every** listener on the event runs a second time, not only the one that failed.

Find the thrower in the log. And in the meantime: anything irreversible in a listener needs
its own idempotency, because this addon guarantees "once" for the ordinary cases and says so
plainly for this one.

## The webhook answers 419

The CSRF middleware is still on the route. Laravel 12/13 puts `PreventRequestForgery` in the
`web` group, and `VerifyCsrfToken` is its **subclass** — excluding the subclass does not
remove the parent, so the check stays, the provider sends no token, and every real delivery
ends in 419.

The addon excludes all four names for that reason. If you have rebuilt the route or wrapped
it, exclude the same four:

```
App\Http\Middleware\VerifyCsrfToken
Illuminate\Foundation\Http\Middleware\VerifyCsrfToken
Illuminate\Foundation\Http\Middleware\ValidateCsrfToken
Illuminate\Foundation\Http\Middleware\PreventRequestForgery
```

This is invisible in a test run: `PreventRequestForgery::handle()` exits immediately when
`runningUnitTests()`. Assert on the collected middleware list rather than on a request.

## `statamic-payments: webhook for an unknown payment id`

The provider is telling this site about a payment it has no row for. Two causes worth
telling apart:

- **A stray or forged call.** Ordinary and harmless: nothing is created, because an id we
  did not issue is not evidence of an order.
- **A checkout that died between Mollie creating the payment and the id reaching the
  database.** The buyer paid and there is no row. This is the one way a real site loses
  money, which is why it is logged loudly rather than answered with a silent `200`.

The addon sends its own row id along as metadata and recovers the payment from it, so the
second case should be rare. When it happens, the id in the log is what you look up in the
Mollie dashboard.

## The buyer paid and landed on the thank-you page, but nothing happened

The return URL proves nothing and grants nothing. Fulfilment runs in the webhook. If the
webhook is not reaching the site — a tunnel that has expired, `webhook_url` set to `false`,
a firewall — the page will keep looking right while nothing behind it happens.

## A return URL is being ignored

It pointed away from this application and was **dropped**, with a warning in the log. Both
`app.url`'s host and the host of the running request are accepted; a protocol-relative URL
(`//somewhere`) counts as external.

It is dropped rather than refused on purpose: the buyer has paid by then, and failing the
checkout over a bad return address would take their money and show them an error.

## A subscription was never created

Three refusals, in this order:

1. **`follow_up.collect_mandate` is off.** `Subscriptions::start()` returns `null` and logs
   a warning. A subscription without a stored payment method is not a subscription.
2. **The product has no `interval`**, so it is not recurring.
3. **The provider cannot run subscriptions** — `Subscriptions::available()` is `false`.

If the *first payment* went through and no agreement exists, that is a different failure:
`SubscriptionStartFailed` fired, and the payment carries
`meta.subscription_start_failed_at` and `meta.subscription_start_error`. The money was taken;
somebody has to look.

## The Subscriptions screen says active and the card stopped working

The provider is asked how an agreement is doing on every cycle, so a suspension reaches the
row **when a cycle is attempted**. Between cycles the row is as fresh as the last one.

```php
app(Subscriptions::class)->refresh($subscription);
```

is the same question asked on demand. It is quiet on failure — a provider that will not
answer right now is not a reason to change what the row says.

## Cancelling a subscription toasted red

That is the feature. `Subscriptions::cancel()` tells the provider first and writes what the
provider answered, and a refusal — or an acceptance where the provider goes on reporting the
agreement as running — leaves the row untouched.

Marking the row cancelled and hoping is how somebody keeps being charged for a thing their
account says they cancelled. Check the agreement in the Mollie dashboard.

## The follow-up offer tag prints nothing

By design, and there are four reasons. In order of likelihood:

1. `follow_up.enabled` is `false`.
2. The payment is not `paid` yet — a follow-up on a pending payment would be an offer on a
   sale that has not happened.
3. `customer_reference` is null, because `collect_mandate` was off when the buyer checked
   out. Existing payments do not gain a mandate retroactively.
4. The offer has already been taken from this payment.

## The follow-up offer prints an empty box

`{{ if no_results }} … {{ else }}` is missing. Like every Statamic tag pair, this one parses
its block once even when there is nothing to yield — so markup outside that branch is
printed anyway, which here means an order button for an offer that is not on the table.

## A follow-up charge was refused

`FollowUp::accept()` returned `null` and the row is marked `failed`. The usual cause is no
mandate — the buyer never agreed to be charged again. The row stays as evidence that the
offer was accepted and the charge did not happen, and the offer comes back, because a
refused charge does not count as taken.

## An upsell sits at `pending` for ever

Check that the webhook is arriving. A recurring charge is accepted now and settled later, so
`pending` at first is normal; `pending` an hour later means nobody told the site what
happened.

Nothing is fulfilled while it is pending. That is the same rule as at checkout, applied
consistently.

## `payments:sweep-abandoned` announces nothing

1. `abandoned.enabled` must be `true`.
2. The checkout must be older than `after_minutes`.
3. Its status must be `initiated` or `open`. `failed`, `expired` and `canceled` are not
   abandoned — they already have `PaymentFailed`.
4. It must not have been announced before. The claim is permanent for that payment.

## `payments:prune-unpaid` deletes nothing

`prune_unpaid_after_days` is `0`, which is off — the command says so and exits. Otherwise
check what it refuses to touch: anything paid, fulfilled or refunded, anything in a final
status, and **anything that has ever been announced as abandoned**. That last one surprises
people. See
[Tax facts and retention](/payments/tax-and-retention#what-is-never-touched).

## A price in a foreign currency is out by a factor of a hundred

`amount_cent` is minor units, and not every currency has two decimals. The yen has none, the
Tunisian dinar three. `Support\Money` knows the exceptions; if you format an amount yourself
with a hard-coded `/ 100`, that is where the factor comes from.

Fixed in **1.11.0** for everything the addon sends to the provider.

## An entitlement was not granted

Three conditions, all required: [Entitlements](/entitlements/) installed,
`entitlements.enabled` on, and the product carrying `grants`.

Then look in the log — a failure in the sibling is **logged and swallowed** on purpose,
because an entitlements outage must not release the fulfilment claim and send the whole
webhook round again. So the money is taken, the row says so, and the only evidence of the
failure is the log line.

Historically the most common cause was a version mismatch: the bridge hands the sibling a
`SubjectReference`, and against an older sibling it falls back to a bare string, which newer
versions refuse on purpose.

## Nothing appears in the Control Panel

```bash
php artisan vendor:publish --tag=statamic-payments --force
php artisan statamic:install
```

Statamic publishes addon assets from a `statamic:install` hook in `post-autoload-dump`.
Without it, nothing publishes.

If the nav entries are there but a screen answers 403, that is the permission: `access
payments utility` and `access subscriptions utility` are separate.
