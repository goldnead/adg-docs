# Checkout protection and the thank-you link

<AddonHeader />

Two things in front of and behind the provider's page, both from **1.25**: a door every new
checkout passes before anything is written, and a thank-you page that belongs to the buyer for a
while and then stops working.

## The door

Three checks in `Checkout::start()` (and `Subscriptions::start()`), before a row is written or a
provider is called:

1. **The block list.** Addresses, domains and IP addresses or ranges that are refused.
2. **The brake.** Checkouts per IP and per email address within a window, against card testing.
   **On by default.**
3. **A captcha.** Cloudflare Turnstile or hCaptcha. Off by default.

A refusal starts no checkout and returns `null`. `Checkout::refusal()` (and
`Subscriptions::refusal()`) then holds a sentence the page can show, such as "Too many order
attempts in a short time. Please try again in a few minutes." It never names the rule. The reason
goes to the log and to the `CheckoutBlocked` event (`$reason`: `blocked_email`, `blocked_domain`,
`blocked_ip`, `rate_limited` or `captcha`; `$email`, `$ip`, `$message`).

The one-click follow-up charge does not pass the door: the buyer is already known and has just
paid.

### The block list

```php
'protection' => [
    'blocklist' => [
        'emails' => ['someone@example.com'],
        'domains' => ['wegwerf.example'],        // and every subdomain of it
        'ips' => ['203.0.113.7', '198.51.100.0/24'],
    ],
],
```

Editable per brand on the shared settings screen as well. An entry in `ips` that is not an
address or a range is logged and skipped, never allowed to stop every checkout.

### The brake

```php
'rate_limit' => [
    'enabled' => true,
    'per_ip' => 100,
    'per_email' => 10,
    'decay_minutes' => 10,
],
```

Generous on purpose: a choir buying tickets over one venue's Wi-Fi is one IP address.

::: danger Behind Cloudflare or another proxy, set up TrustProxies
Without it, Laravel sees the proxy's address instead of the buyer's.

- A **private** proxy address (a reverse proxy on the same machine or network) is not counted at
  all. Only the email address is, and the log says once that TrustProxies is missing.
- **Cloudflare's** edge addresses are public, so they **are** counted, and many buyers share a
  few of them. Without TrustProxies they share one brake of 100 checkouts in 10 minutes.

Configure the trusted proxies in `bootstrap/app.php` (`$middleware->trustProxies(at: …)`) with
your proxy's addresses or Cloudflare's published ranges.
:::

Automated test suites that run more than ten checkouts per address switch the brake off with
`protection.rate_limit.enabled = false`.

### The captcha

```dotenv
STATAMIC_PAYMENTS_CAPTCHA=turnstile          # or hcaptcha; off by default
STATAMIC_PAYMENTS_CAPTCHA_SITE_KEY=…
STATAMIC_PAYMENTS_CAPTCHA_SECRET=…
```

On means **every** checkout form must render the widget:

```antlers
{{ payments:captcha }}
```

A form without it is refused. The widget posts the provider's token under its usual name
(`cf-turnstile-response` or `h-captcha-response`), which the door reads. The secret stays in
`.env`.

## The thank-you link

By default the provider sends the buyer back to `return_url` (`/danke`), and that page can be
opened by anyone, any time. With `thanks.expires_minutes` set, the page belongs to the buyer for
a while:

```php
'thanks' => [
    'expires_minutes' => env('STATAMIC_PAYMENTS_THANKS_EXPIRES'),  // null or 0: off (default)
    'expired_url' => null,
    'link_hours' => 24,
],
```

1. The provider sends the buyer to a signed link of this addon
   (`/!/statamic-payments/danke/{payment}`), valid for `link_hours` (24).
2. The link notes the visit in the session and forwards to `return_url`.
3. The page is theirs for `expires_minutes` from that **first** visit, so a slow SEPA buyer still
   gets the full window.
4. A link opened too late lands on a short page of this addon, or on `expired_url`.

The page asks:

```antlers
{{ payments:thanks }}
  {{ if valid }}
    Download your score here …
  {{ elseif pending }}
    Your payment is being confirmed.
  {{ else }}
    This page has expired.
  {{ /if }}
{{ /payments:thanks }}
```

| Variable | |
| --- | --- |
| `valid` | within the window **and** paid. Always `true` while the feature is off. |
| `paid` | the payment is paid (`null` while the feature is off: no link carried a payment) |
| `pending` | within the window and not paid yet, but on its way (open or initiated; not failed or cancelled) |
| `payment_id` | the payment |
| `expires_at` | when the window closes, ISO 8601 |

The thank-you page is still not where fulfilment happens. Only the webhook decides that; see
[Reacting to a payment](/payments/events).
