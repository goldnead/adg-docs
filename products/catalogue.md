# In the payment catalogue

<AddonHeader />

This addon has no checkout, no gateway and no webhook. It teaches
[Payments](/payments/catalogue) about products and stops there.

Nothing else in the suite has to learn about it. A product from this table reaches a checkout
as an entry in the payment catalogue, and every guard the payment addon already has applies
to it unchanged.

## Two seams, two questions

The addon registers on both of the catalogue's seams, and they behave differently on purpose.

| Seam | Question | Brand-scoped? |
| --- | --- | --- |
| `Catalogue::extend()` | "What does this one handle cost?" | **No** |
| `Catalogue::contribute()` | "What is there?" | **Yes** |

### `extend()` prices one handle

It is reached by anything a browser sends, and by a provider webhook hours after the sale.
So it is a single indexed lookup on `handle`, restricted to active products, and it does not
care which brand is current.

A webhook has no brand. A price that could not be resolved without one would be a price that
could not be resolved at all.

### `contribute()` lists what there is

That question only ever comes from a screen — a product picker in the offer form, for
instance. So the answer is scoped: this brand's products, the active ones, ordered by name.

It fails **closed**. In multi-brand mode with no brand current, an unscoped list would offer
another tenant's catalogue for sale.

This seam is why the addon requires `statamic-payments` `^1.15`. A resolver is only ever
handed one handle and can therefore never fill a picker, which is how the product select in
the offer form came to show three of six products and then refuse the save with a 422.

## Config wins

A handle may exist both here and in `config/statamic-payments.php`. **The config file wins.**

A price in version control was written on purpose and went through a deploy. A row in a table
must not silently overrule it. This is the catalogue's own rule, not something this addon
invents: a resolver may add handles, never reprice one the site has already decided about.

Nothing has to be migrated when you install this addon. A site whose prices live in a file
can install it and never notice.

### The collision is shown, even though the answer is silent

Silent is right for the *answer* and wrong for the *screen*. Two truths about one price is
the illness that had a checkout charge 330 while the catalogue said 332, and the person who
noticed was a customer.

So the Control Panel says so twice:

- a **From config** badge on the row in the listing;
- a warning in the form, which appears **while the handle is being typed** rather than after
  a purchase has gone through at the other price.

The fix is one of two things: remove the config line, or name this product differently.

## When the table is not there yet

Between `composer require` and `php artisan migrate` there is a window. On a real host it is
minutes; on a forgotten staging box it is months. Both seams run inside a checkout and inside
the Control Panel, and in that window every query behind them throws.

An uncaught throw there is a 500 on the checkout of a site that was selling fine an hour
earlier. So both seams are wrapped: the catalogue answers **as if this addon were not
installed**, and the checkout keeps working on the products the config file already knows.

**It is logged, never swallowed quietly.** An empty catalogue and a broken one look identical
from the outside, and "nothing to sell" is a failure shape this family keeps rediscovering.
The log line is what tells the two apart:

```
statamic-products: could not resolve a product; the catalogue is answering as if
this addon were not installed.
```

If products exist in the Control Panel but nothing can be bought, that line is the first
place to look. See [Troubleshooting](/products/troubleshooting).

## Reading a product from code

Two ways, and they answer different things.

```php
use Goldnead\StatamicPayments\Support\Catalogue;

// What the checkout would charge — config line or table row, whichever wins.
$entry = app(Catalogue::class)->find('stimmwerkstatt');
```

```php
use Goldnead\StatamicProducts\Models\Product;

// The row itself, with everything the catalogue does not carry.
$product = Product::firstWhere('handle', 'stimmwerkstatt');

$product->grantSlugs();          // ['stimmwerkstatt-zugang']
$product->hasBeenSold();         // whether the handle is frozen
$product->isShadowedByConfig();  // whether a config line overrules this row
$product->refTarget();           // resolved, gone, or cannot be checked
```

Use the catalogue when the question is about money. Use the model when the question is about
the thing.

What the catalogue receives from a product is deliberately small: `handle`, `name`,
`amount_cent`, `currency`, `digital`, and `grants` when there is anything to grant. Nothing
about the kind, the pointer or the brand crosses that line, because the catalogue has no use
for any of it.
