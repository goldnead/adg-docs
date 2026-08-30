# Installation

<AddonHeader />

<Requirements />

```bash
composer require goldnead/statamic-products
php artisan migrate
```

There is no config file to publish and no front-end build step: the compiled Control Panel
assets ship under `dist/` and Statamic publishes them on install.

One entry appears under **Utilities**: **Products**.

## What comes with it

| Package | Constraint | |
| --- | --- | --- |
| [`goldnead/statamic-payments`](/payments/) | `^1.15` | Installed automatically. It owns the catalogue a product contributes to, and the checkout that charges it. |

That is a hard `require`, not a suggestion. A product's whole reason for existing is to
resolve as a priced thing in the payment catalogue.

The floor is `^1.15` because that is the version with `Catalogue::contribute()`. Without it
a product could still be bought, but it would not appear in any picker — which is how the
product select in the offer form came to show three of six products and then refuse the
save with a 422.

### Optional siblings

| Package | What it adds |
| --- | --- |
| [`goldnead/statamic-brand-context`](/brand-context/) | Multi-brand catalogues: one Control Panel, one catalogue per brand. |
| [`goldnead/statamic-events`](/events/) | An `event` product's pointer starts being checked. |
| [`goldnead/statamic-booking`](/booking/) | A `sessions` product's pointer starts being checked. |

None of the three is required, and their absence is not an error. A product for a kind whose
sibling is not installed can still be filed; its pointer is simply reported as
*cannot be checked* rather than as broken. See
[The kind and the pointer](/products/kinds#three-answers-not-two).

## Quick start

**Utilities → Products → New product.**

| Field | |
| --- | --- |
| **Name** | what is bought, written so a buyer recognises it. It goes onto the invoice |
| **Handle** | lowercase, digits, `-` and `_`; unique across every brand |
| **Kind** | one of the six. It decides what the pointer beside it means |
| **Points at** | the id, uuid or handle of the thing of that kind. Hidden for a download |
| **List price** | in minor units. `0` is allowed and means free |
| **Currency** | leave empty for the shop currency |
| **Kind of supply** | *Electronically supplied* or *In person or on paper*. **Nothing is preselected**, and the form will not save until it is answered |
| **Opens** | the access slugs a paid copy opens. More than one is fine; empty is normal |
| **Active** | |

Then sell it by its handle:

```php
app(Checkout::class)->start('stimmwerkstatt');
```

Nothing else has to learn about this addon. From the checkout's point of view a product from
this table is an entry in the payment catalogue like any other.

## Permissions

| Permission | Grants |
| --- | --- |
| `access products utility` | The Products screen, and creating, editing and deleting products |

One permission, not several. Editing a price and editing a name are the same authority here;
what a product may be *sold for right now* is an [offer](/offers/), and that has a
permission of its own.

## No scheduler, no queue

Neither is used. A product is looked up when something asks for it.

## Licence

Commercial: `composer.json` says `proprietary`. See [Licensing](/guide/licensing).
