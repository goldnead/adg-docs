# Products

<AddonHeader />

The thing that is sold: a name, a list price, and the access a paid copy opens.

<Figure
  src="products-listing"
  alt="The Products listing with name, handle, kind, list price, kind of supply, access count and state"
  caption="Products live under Utilities. Each row is a thing that exists, what it costs, and what a paid copy opens." />

## The hole this fills

[Payments](/payments/) knows what something costs. [Offers](/offers/) knows how it is
presented. [Entitlements](/entitlements/) knows that somebody has access to it. Between
those three sat a gap: the thing itself existed nowhere.

So every site invented it again. On one of them it got invented twice, as
`member_packages` and as `access_packages`, and the two drifted.

This addon is that missing middle and nothing else. A table, a screen under **Utilities →
Products**, and two seams onto the payment catalogue.

## It does not deliver anything

That is the sentence to read twice, because it is the decision the whole addon is built
around.

A product says that a course exists, what it costs, and what it opens. What a course
*shows* stays the website's business. Kajabi and Podia go the other way — there the product
type *is* the delivery, the course type *is* the player — and that road ends in building a
course player, a community engine, a scheduler and podcast hosting. That is not an addon
family any more.

The consequence runs through everything below: a product's kind is an **answer**, not an
instruction, and its pointer may name a thing in a package that is not installed.

## What you get

- **Products in the Control Panel** — name, handle, kind, pointer, list price, currency,
  supply, what it opens, active
- **Six kinds** — download, access, event, sessions, cohort, feed — and a pointer at the
  thing of that kind
- **Three answers about that pointer**, not two: resolved, gone, and nobody-here-can-tell.
  Only *gone* is accused
- **A count above the table** of the products that point at nothing, which no column
  preference can hide
- **A handle that freezes once the product has been paid for**, and a delete button
  that refuses rather than quietly doing something else
- **`digital` as a tax fact with no preselection** — it decides the place of supply, and
  every default is wrong for half a catalogue
- **The config collision made visible** — config still wins, but the screen says so

No Antlers tags, no modifiers, no console commands, no config file. A product is read
through the payment catalogue, which every addon in the suite that deals with money already
speaks.

## The shortest useful path

1. `composer require goldnead/statamic-products`, then `php artisan migrate`.
2. **Utilities → Products → New product**: a name, a handle, a kind, the pointer that kind
   needs, a list price, and an answer to the supply question.
3. Sell it by its handle, with nothing else having to learn about this addon:

```php
use Goldnead\StatamicPayments\Support\Checkout;

$checkout = app(Checkout::class)->start('stimmwerkstatt');

abort_if($checkout === null, 404);   // no such product, or it is inactive

return redirect()->away($checkout->checkoutUrl);
```

An [offer](/offers/) points at a product by that same handle, exactly as it pointed at a
config line before.

## What it deliberately does not do

- **Deliver.** No course player, no members area, no community engine. A product is the
  ticket, not the show.
- **Book or schedule.** [Events](/events/) and [Booking](/booking/) do that. A product may
  point at them; it does not rebuild them.
- **Hold product content.** Lessons, videos and files are Statamic content and belong in
  collections.
- **Discount, sell or place.** A product has a list price and no opinion about how it is
  advertised. That is the offer level, and it already exists.
- **Overrule the config file.** A handle that is also a line in
  `config/statamic-payments.php` is charged at the file's price. See
  [In the payment catalogue](/products/catalogue#config-wins).

## Next

- [Installation](/products/installation)
- [Configuration](/products/configuration) — there is no config file, and this says what it
  reads instead
- [What a product is](/products/concepts) — the fields, one at a time
- [The kind and the pointer](/products/kinds) — six kinds, three answers
- [The handle is a promise](/products/handles) — why it is unique, and when it freezes
- [In the payment catalogue](/products/catalogue) — the two seams, and what wins
- [Reference](/products/reference) · [Troubleshooting](/products/troubleshooting)
