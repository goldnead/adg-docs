# What a product is

<AddonHeader />

A product is a thing that exists and costs money. Ten fields, and every one of them is there
because something downstream reads it.

| Field | Meaning |
| --- | --- |
| `handle` | What offers, payments and invoices call it. Unique across every brand, and frozen once the product has been paid for. |
| `name` | What is bought. Goes into the order confirmation and onto the invoice (§ 312j BGB). |
| `type` | What kind of thing it is. An answer, not an instruction. |
| `ref` | The pointer at the thing of that kind. Empty for a download. |
| `amount_cent` | The list price, in minor units. `0` is allowed and means free. |
| `currency` | Empty means the shop currency. |
| `digital` | A tax fact, not a medium. **No default.** |
| `grants` | The access a paid copy opens, as a list. Empty is normal. |
| `active` | Retired rather than deleted. |
| `brand_id` | Zero on every single-brand install. |


<Figure
  src="products-editor"
  alt="The product editor: name, handle, list price, kind, kind of supply and what it opens"
  caption="Every field a product has. The kind and the kind of supply both start unanswered, on purpose." />

## `name` is written for the buyer

It goes into the order confirmation and onto the invoice, where § 312j BGB expects the buyer
to recognise what they bought. So it is a sentence somebody outside the building would
understand, not an internal label.

## `amount_cent` is the list price and nothing else

Minor units, always. `integer` and not `numeric`, so nobody can post `"49,00"` and have it
read as 49 cents.

Not nullable: a product without a price is not a product, it is a note to self. Unsigned, so
zero is possible and negative is not — and **zero is a real answer.** The lead magnet, the
sample chapter. The payment catalogue has allowed free things since refusing them pushed
every free thing outside the addon.

An [offer](/offers/) may undercut this price. Nobody else may, and nothing reachable from a
browser may.

## `currency` is usually empty

Empty means "whatever this install is configured in", read from
`config('statamic-payments.currency')` — and if that is not set either, `EUR`. Fill the field
in only where a product genuinely is sold in another currency than the rest of the shop.

## `digital` is a tax fact

This is the field most likely to be filled in wrongly, so it is the one field the form
refuses to guess.

It is not a description of the medium. It decides the **place of supply**, and with it the
mandatory notice on the invoice (§ 3a UStG): a downloadable workbook is taxed where the
buyer is, a workshop in a room is taxed where the room is. A recording of that workshop is
digital; the workshop is not.

The Control Panel offers two answers — *Electronically supplied* and *In person or on paper*
— and preselects neither. A switch would have a resting position and would answer the
question on somebody's behalf. A select with nothing chosen makes them answer it, and the
form does not save until they have.

## `grants` is a list, and empty is normal

What a paid copy opens, as access slugs. [Entitlements](/entitlements/) takes slugs and
stays deliberately ignorant of what a product is; this is the column that finally gives those
slugs something to point back at.

A list rather than a single string, because one product may open three things. Empty is the
ordinary case: a printed score posted in an envelope grants no access at all.

Duplicates and blanks are stripped on save, and again on read. A blank slug reaches the
entitlements bridge as a grant that opens nothing, which is how a purchase ends with a
payment, an invoice and no access — twice in this family, and quietly both times.

Empty is stored as `null`, not as `[]`. An empty array is a statement; `null` is the absence
of one, and absence is the normal case.

## `active` is how a product retires

Inactive means: not in the catalogue, not in any picker, not buyable. Still on every invoice
that already names it.

That is the only way to take a product off sale once anything has been bought through it,
because at that point deleting it is refused. Why, and where the threshold actually sits, is
in [The handle is a promise](/products/handles#the-same-threshold-refuses-a-delete).

## `brand_id` is zero unless you asked for brands

Zero on every single-brand install, which is nearly all of them. With
[Brand Context](/brand-context/) installed, an agency with three brands gets three
catalogues in one Control Panel.

The **handle** is not scoped by brand even though the row is. See
[The handle is a promise](/products/handles#unique-across-every-brand).

::: warning Zero is also what a product gets when no brand was current
The brand is stamped at creation from whatever brand the request was in. A console command, a
seeder or a queue job is in none, so the product is created with `brand_id` **0**.

On a multi-brand install that row is then invisible: the listing and the product picker are
scoped to the current brand, and nobody's brand is zero. It stays buyable, because pricing is
deliberately unscoped — so the symptom is a product that works at the checkout and cannot be
found in the Control Panel. Create products from the Control Panel, or set `brand_id`
yourself when you script it.
:::

## What is deliberately not here

Discounts, sales copy, placement, bundling, a second price, a compare-at price, an image, a
counter. All of that is the **offer** level, and it already exists in [Offers](/offers/).

The split is worth stating plainly, because it is the one thing to get right before filing a
catalogue:

> A **product** is a thing that exists and costs money. An **offer** is that thing
> *presented*: at a place, for a price that may be its own, with words that are about this
> moment.

The same product is a €29 purchase on the sales page and a €12 upsell on the thank-you page.
Two offers, one product.
