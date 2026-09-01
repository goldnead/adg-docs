# Reference

<AddonHeader />

## Console commands

None. The addon registers no commands, uses no queue and needs no scheduler.

## Antlers tags and modifiers

None of either. A product is not rendered by this addon: it is read through the payment
catalogue, or through the model.

If you want a product on a page with words, a price and a button, that is an
[offer](/offers/templates) and it has tags.

## Classes you call

| Class | Method | |
| --- | --- | --- |
| `Models\Product` | `grantSlugs()` | the access slugs, cleaned of blanks and duplicates |
| | `currency()` | its own, or the shop currency |
| | `amount()` | the price as a decimal string: always a dot, always two decimals |
| | `hasBeenSold()` | whether any payment row carries this handle, at any status. What freezes it. **Fails closed** |
| | `isShadowedByConfig()` | whether a config line overrules this row |
| | `refTarget()` | a `RefTarget` |
| | `toCatalogueEntry()` | the shape `statamic-payments` speaks |
| | `Product::types()` · `Product::typesNeedingRef()` (static) | |
| | scope `forBrand($brandId = null)` | |
| `Support\RefTarget` | `RefTarget::for($product)` (static) | one product's answer |
| | `RefTarget::prime($products)` (static) | answers a page's **event** pointers in one query |
| | `isMissing()` | true only for **gone** |
| | `state` · `label` | readonly: one of the three constants, and the target's name |
| `Support\SoldHandles` | `SoldHandles::prime($handles)` (static) | a page's answers in two queries |
| | `SoldHandles::get($handle)` (static) | the primed answer, or `null` when it was not in the batch |

There is no facade. `Product` is a plain Eloquent model.

`RefTarget::RESOLVED`, `RefTarget::MISSING` and `RefTarget::UNKNOWABLE` are the three states.

Both `prime()` helpers are caches in front of answers that can also be worked out per row:
they can make a lookup faster, never different. `forget()` on either clears the per-request
memo, which is what a test suite needs between cases.

`RefTarget::prime()` batches **events only**, and the rest is deliberate rather than
unfinished. Entries, collections and booking endpoints already answer from memory — Statamic
keeps entries and collections in the Stache, and booking endpoints are a config array — while
the per-request memo collapses repeats on top of that. The thing that genuinely cost a query
per row was `Schema::hasTable('events')`, and that is memoised.

## Events

None. The addon fires no events and listens for none.

## The catalogue seams

Registered in `register()`, not `bootAddon()` — a seam that is never registered makes a
product look missing rather than unregistered.

```php
Catalogue::extend(fn (string $handle) => /* one active product, any brand */);
Catalogue::contribute(fn () => /* this brand's active products, by name */);
```

Both are wrapped so a missing `products` table answers as if the addon were not installed,
and logs why. See [In the payment catalogue](/products/catalogue).

## Control Panel

| Screen | Permission | |
| --- | --- | --- |
| **Utilities → Products** | `access products utility` | list, create, edit, delete |

Routes, all under the utility: `GET /` (listing), `POST /` (store), `GET {product}`
(the product screen), `PATCH {product}` (update), `DELETE {product}` (destroy).

No bulk actions and no filters are registered.

### The product screen

`GET {product}` — reached from **Offers and buyers** in a row's actions and from the edit
stack — shows the product's facts and, below them, what the rest of the family knows:

| Section | Reads | Present when |
| --- | --- | --- |
| **Offers** | `offers` where `product` is the handle or `products` contains it | `statamic-offers` is installed and migrated |
| **Buyers** | `payment_items` ⋈ `payments`, `status = paid`, newest `paid_at` first, at most 50 | the `payments` table exists |

A section is absent, not empty, when its sibling is missing: `null` is "cannot know", `[]`
is "nobody". An offer without a price of its own shows the list price with a **List price**
badge; a buyer whose payment carries a refund keeps the row with a **Refunded** badge, because
they did buy. The buttons jump to the siblings' listings pre-filtered (`?search=`), since
neither has a detail page, and disappear when the sibling's utility route is not registered.

The probe behind both is `Support\Siblings::installed()`, class name plus table, with
`pretend()` for suites that build the table by hand.

### Columns

| Column | Sortable | Visible by default |
| --- | --- | --- |
| Product (`name`) | yes | yes |
| Handle (`handle`) | yes | yes |
| Kind (`type`) | yes | yes |
| List price (`amount`) | yes | yes |
| Supply (`digital`) | yes | yes |
| Opens (`grants`) | no | yes |
| Active (`active`) | yes | yes |
| Points at (`ref`) | no | **no** |

**Opens** is a count, not a list: a product that opens four things would push the price out
of view. It is empty rather than `0` when a product opens nothing, because a column full of
zeroes reads as a broken feature.

Sorting is a positive list, so `?sort=` cannot order by an arbitrary column. Default is
`name` ascending. Search covers `name`, `handle` and `ref`, with `%` and `_` escaped.

Column preferences are stored under `statamic-products.products.columns`.

### Badges and the banner

| | Where | When |
| --- | --- | --- |
| **Target gone** | on the row | the pointer resolves to nothing and a sibling could say so |
| **From config** | on the row | the handle is also a line in `config/statamic-payments.php` |
| Dangling count | above the table | any product in this brand's catalogue points at nothing |

The banner is over the whole catalogue, not the current page, and no column preference can
hide it.

Prices in the listing are formatted server-side, in the Control Panel's language, so a
product here and the same product in an offer next door read the same way. Without
`ext-intl` both fall back to a dot.

## Validation

| Field | Rule |
| --- | --- |
| `name` | required, max 191 |
| `type` | required, one of the six |
| `ref` | **required for every kind except `download`**, nullable, max 191. Nulled on save for a download |
| `handle` | required, max 191, `^[a-z0-9][a-z0-9_-]*$`, unique. **Locked to its current value once a payment for it has reached `paid`** |
| `amount_cent` | required integer, min 0 |
| `currency` | nullable, exactly 3 characters, upper-cased on save |
| `digital` | **required** boolean, no default. `false` counts as present; only silence fails |
| `grants` | nullable array |
| `grants.*` | nullable string, max 191. Blanks and duplicates are dropped on save; an empty result is stored as `null` |
| `active` | boolean |

`amount_cent` is `integer` and not `numeric`, so nobody can post `"49,00"` and have it read
as 49 cents. `min:0` and not `min:1`, because zero is a real price.

Deleting a product that has been paid for is refused with a validation error on `handle`. See
[The handle is a promise](/products/handles#what-actually-trips-the-lock).

**A `PATCH` writes only the fields it carries.** Every `required` field 422s when it is
missing, which is most of them; `active` and `grants` have no such rule and are simply left
alone when the key is absent. Sending `grants: []` does clear them — an empty list is a
statement, an absent key is not.

::: warning Before 1.2.0 an omitted field was a silent delete
`active` and `grants` were read unconditionally, so a `PATCH` that left them out stored
`false` and `null`: the product dropped out of the catalogue and every picker, its access
slugs were gone, and the reply was `200`. The Control Panel form sends every field, so the
form never showed it.
:::

## Tables

### `products`

`handle` (unique) · `name` · `type` (indexed, defaults to `download`) · `ref` (nullable,
indexed) · `amount_cent` (unsigned) · `currency` (nullable, 3) · `digital` · `grants` (JSON,
nullable) · `active` (indexed, defaults to true) · `brand_id` (indexed, defaults to 0) ·
`meta` (JSON, nullable) · timestamps.

`ref` is **not** a foreign key. What it points at lives in another package's table, in flat
content files, or in a package that is not installed. A join would have to exist five times
and would break the moment somebody uninstalled a sibling.

`handle` is unique across the whole table, brands included. See
[The handle is a promise](/products/handles#unique-across-every-brand).

## Migrations

| | |
| --- | --- |
| `create_products_table` | the table |
| `add_type_and_ref_to_products` | `type` and `ref` |
| `rename_product_types_to_english` | **1.1.0.** Rewrites `zugang`, `termin`, `sitzungen`, `kohorte` to `access`, `event`, `sessions`, `cohort`. Reversible |

## Publish tags

| Tag | |
| --- | --- |
| `statamic-products-migrations` | the migrations |
| `statamic-products` | the compiled Control Panel assets |
| `statamic-products-translations` | the language files |

There is no config tag. See [Configuration](/products/configuration).

## Multi-site and multi-brand

Products are **not** site-scoped. A product is a commercial decision, not content.

They are brand-scoped, with one exception that matters: the row carries `brand_id`, the
handle does not. Listing is scoped, pricing is not.
