# In a template

<AddonHeader />

Two tags. Both yield nothing when there is nothing to offer, and both parse their block once
anyway.

## One offer, by handle

```antlers
{{ offers:show handle="fruehling-upsell" }}
    {{ if no_results }}
        {{# Nothing to offer: inactive, or its product is gone. #}}
    {{ else }}
        <h2>{{ headline }}</h2>
        <p>
            {{ amount }} {{ currency }}
            {{ if compare_at }}<s>{{ compare_at }}</s>{{ /if }}
        </p>
        {{ if body }}<div>{{ body }}</div>{{ /if }}

        <form method="POST" action="/kaufen">
            {{ csrf_field }}
            {{# `buy_handle` already carries the prefix. #}}
            <input type="hidden" name="product" value="{{ buy_handle }}">
            <button type="submit">{{ button_label ?? 'Jetzt kaufen' }}</button>
        </form>
    {{ /if }}
{{ /offers:show }}
```

## Every offer in a slot

```antlers
{{ offers:slot slot="bump" limit="3" }}
    {{ if no_results }}
    {{ else }}
        <label>
            <input type="checkbox" name="bumps[]" value="{{ handle }}">
            {{ headline }} — {{ amount }} {{ currency }}
        </label>
    {{ /if }}
{{ /offers:slot }}
```

| Parameter | Default | |
| --- | --- | --- |
| `slot` | `standalone` | `bump` · `post_purchase` · `standalone`. An unknown slot yields nothing |
| `limit` | `5` | |

Active offers only, in the order they were made, and anything not sellable is dropped.

## What both tags yield

| Variable | |
| --- | --- |
| `id` | |
| `handle` | the bare handle. What a bump checkbox posts |
| `buy_handle` | the handle **with the prefix**. What a checkout is given |
| `name` | |
| `headline` | falls back to `name` |
| `body` · `image` · `button_label` | may be empty |
| `product` | the underlying product handle |
| `amount` | `"29.00"` — machine-readable, always a dot, always two decimals |
| `amount_cent` | the integer |
| `compare_at` | the struck-through price, or empty. **Never charged** |
| `currency` | |
| `slot` | |

::: danger `{{ if no_results }} … {{ else }}` is not optional
Like every Statamic tag pair, this one parses its block once even when there is nothing to
yield. Markup written outside that branch is printed anyway — an empty offer, a price of
nothing, an order button for something that is not for sale.
:::

## Formatting the price

`amount` is the machine-readable form. On a German page, `249.00 EUR` does not merely look
odd: in that language the dot groups thousands, so it reads as a different number.

The tag does not localise for you. Format it in the template, or read it in PHP:

```php
$offer->amountLocal();       // "249,00" in a German locale, with ext-intl
$offer->compareAtLocal();
```

Without `ext-intl` both fall back to the dot rather than guessing. **1.2.0.**

## Buying it

The tags render; they do not post. The buy button goes to a route of yours, which builds a
basket and starts the checkout:

```php
$offer = Offer::query()->where('handle', $request->input('offer'))->firstOrFail();

$basket = Basket::make($offer, $request->input('bumps', []), $request->input('coupon'));

$checkout = app(Checkout::class)->start(
    $basket->handles(),
    ['email' => $request->input('email')],
    '/danke',
    $basket->discount(),
);

abort_if($checkout === null, 404);

return redirect()->away($checkout->checkoutUrl);
```

That controller is yours on purpose. What a page collects, what it validates and where it
sends somebody afterwards are decisions no addon should make for a site. See
[Bumps](/offers/bumps#handing-it-to-the-checkout).

## Impressions

Both tags increment `shown_count` unless `count_impressions` is off. On a heavily cached
page, switch it off: a page served from cache renders the tag once and is seen a thousand
times, so the ratio was meaningless anyway.

The **accepted** count is not a tag's business at all — it rises when a payment is paid.
