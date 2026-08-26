# Bumps

<AddonHeader />

An offer can carry other offers as checkboxes at checkout. Tick one, and it becomes a second
line on the same payment — one payment, two things, charged together.

## Picking them

On the offer form, the **Bumps** field. Only offers placed **At checkout** can be picked,
never the offer itself, and **the order you pick them in is the order they appear**.

That ordering is the whole editorial decision, which is why it is a list of handles on the
offer rather than a join table with a position column — the same thing with more moving
parts.

An offer whose bump was switched off, deleted, or whose product left the catalogue simply
stops showing it. A checkbox that refuses the whole checkout when ticked would be worse
than a checkbox that is not there.

## The list on the offer is the authority

Not the form the buyer sees.

```php
use Goldnead\StatamicOffers\Support\Basket;

$basket = Basket::make(
    $offer,
    $request->input('bumps', []),
    $request->input('coupon'),
);
```

`Basket::make()` intersects what the browser says was ticked with what the offer actually
lists, then drops anything not sellable and anything that is the offer itself.

Without that, a ticked box is whatever the browser says it is: somebody could add a cheap
handle to the form and buy an unrelated product, or add an expensive one to somebody else's
basket.

## Handing it to the checkout

```php
$checkout = app(Checkout::class)->start(
    $basket->handles(),      // the offer first, bumps behind it, prefixes applied
    $buyer,
    $returnUrl,
    $basket->discount(),     // null when no coupon applies
);
```

| Method | |
| --- | --- |
| `handles()` | prefixed handles, the offer first |
| `grossCent()` | what the lines add up to, before a coupon |
| `netCent()` | after it |
| `currency()` | the offer's |
| `coupon()` | the `Coupon` as it will be applied, or `null` |
| `discount()` | a payments `Discount`, or `null` — **and it claims one use of the coupon** |
| `offer` · `bumps` | the models, for rendering |

::: warning `discount()` has a side effect
It claims a redemption. Call it at the moment a basket becomes a payment — which is what
passing it straight into `start()` does — and not while rendering a page. Somebody who types
a code and closes the tab has not used it up.
:::

Why a class rather than a few lines in a controller: an offer page in one template and an
offer page somewhere else have to agree about what a ticked box means, down to which bumps
are allowed to be ticked.

## On the payment

The first handle is the `primary` line, the rest are `bump`. One payment, several lines. See
[Bumps and follow-up offers](/payments/bumps) for what that means on the payment side, and
[Starting a checkout](/payments/checkout#all-or-none) for why an impossible handle refuses
the whole checkout rather than dropping a line.

Every line counts towards its offer's **accepted** counter when the payment is paid.

## Rendering the checkboxes

```antlers
{{ offers:slot slot="bump" }}
    {{ if no_results }}
    {{ else }}
        <label>
            <input type="checkbox" name="bumps[]" value="{{ handle }}">
            {{ headline }} — {{ amount }} {{ currency }}
        </label>
    {{ /if }}
{{ /offers:slot }}
```

Note `value="{{ handle }}"`, not `buy_handle`: `Basket::make()` takes bare offer handles and
applies the prefix itself when it builds `handles()`.

`{{ offers:slot }}` yields **every** active offer in the slot, up to `limit` (default 5) —
not the bumps of a particular offer. For a page that offers one specific thing plus its own
bumps, render `$basket->bumps` or `$offer->bumpOffers()` from your own controller instead.

## A bump is not a follow-up offer

A bump is ticked **before** paying and rides along on the same payment. A
[follow-up offer](/payments/bumps#follow-up-offers) is accepted **after** the payment and is
a second payment charged against the stored mandate, with its own legal requirements.

Both exist. They are not interchangeable, and the slot names say which is which:
`bump` against `post_purchase`.
