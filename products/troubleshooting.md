# Troubleshooting

<AddonHeader />

## A product exists in the Control Panel but cannot be bought

In order:

1. **Is it active?** An inactive product is not in the catalogue and `Checkout::start()`
   returns `null` for it.
2. **Is the handle spelled the way the code asks for it?** `start('stimmwerkstatt')` looks
   for a product; `start('offer:stimmwerkstatt')` looks for an [offer](/offers/).
3. **Has the migration run?** If `php artisan migrate` has not, the catalogue answers as if
   the addon were not installed. Check the log for
   `statamic-products: could not resolve a product`.

## Nothing at all is buyable, and the log says the catalogue is answering as if this addon were not installed

The `products` table cannot be read. Almost always the window between `composer require` and
`php artisan migrate` — minutes on a real host, months on a forgotten staging box.

```bash
php artisan migrate
```

Both catalogue seams are deliberately wrapped so that a missing table does not take a
checkout down. The site keeps selling whatever `config/statamic-payments.php` already knows,
which is why the log line is the only sign.

## A checkout charges a different price than the screen shows

The handle is also a line in `config/statamic-payments.php`, and **config wins**.

The listing marks it with a **From config** badge and the form warns while the handle is
being typed. Fix it by removing the config line, or by naming the product differently.

Details in [In the payment catalogue](/products/catalogue#config-wins).

## The handle field will not let me type in it

A payment row carries this handle. Its handle is on payment lines and invoices that cannot be
migrated along with a rename, so it stays as it is.

Everything else on the product is still editable. If you need a different name for something
you are still selling, create a new product and set the old one to inactive: old invoices
keep resolving, new sales use the new handle.

## The handle is locked on a product nobody ever paid for

**On 1.2.0 and later this should not happen.** The lock asks for a payment that reached
`paid`; a checkout somebody started and abandoned no longer counts. If you see it anyway, the
check has **failed closed**: when the payment tables cannot be read, every handle on the
screen locks and a line goes into the log.

```
statamic-products: could not read the payment tables; every handle on this screen
is treated as sold and stays put.
```

```
statamic-products: could not check whether a product has been sold; treating it as
sold so its handle stays put.
```

Fail closed is the deliberate side to err on: a transient database error must not unlock the
one edit that cannot be undone. Fix the connection and the lock lifts by itself.

**On 1.1.0 and earlier it was a bug, and a common one.** The check counted *any* payment row,
and [Payments](/payments/abandoned) writes the row before it calls the provider — so one
visitor who clicked buy and closed the tab left a row at `initiated` and locked the handle for
ever, because unpaid rows are not swept unless `prune_unpaid_after_days` has been turned on.
Upgrade; there is no data to repair, the check simply stops counting those rows.

Details in [The handle is a promise](/products/handles#what-actually-trips-the-lock).

## Delete says no

Same threshold as the locked handle: a payment that reached `paid` carries this handle. Set
the product to inactive instead, which does everything deleting it would have.

The button refuses rather than quietly deactivating, because a delete button that does
something else is worse than one that says no.

## The banner says a product points at nothing

That is the failure this addon exists to make visible: the product is sold, the payment
succeeds, the invoice is written, and the identifier corresponds to nothing behind it. No
error happens anywhere.

Switch on the **Points at** column from the column picker. It shows the target's name where
one was found and the raw identifier where none was, which means the broken rows are the ones
showing an id. Then either fix the pointer or retire the product.

Note that the count is over the whole catalogue for the current brand, not the page you are
looking at.

## A pointer I know is broken is not flagged

Then nobody could check it. The sibling that owns that kind is not installed, or has not
migrated, or — for `sessions` — `statamic-booking.endpoints` is empty.

*Cannot be checked* is never accused, because a badge that cries wolf is a badge everyone
learns to ignore. Install the sibling and the pointer starts being resolved with no further
action.

The three answers are set out in [The kind and the pointer](/products/kinds#three-answers-not-two).

## An `event` pointer never resolves

Two things to check, in this order:

1. **Is [Events](/events/) installed and migrated?** If not, every event pointer answers
   *cannot be checked* and none of them is flagged.
2. **Is the `ref` the event's uuid?** Not its slug. A slug is unique per brand, and a product
   handle is not scoped by brand at all.

## The form will not save and the supply field looks empty

It is empty, and that is the field working. **Kind of supply** has no preselection: it
decides the place of supply and with it the mandatory tax notice on the invoice (§ 3a UStG),
and every default would be wrong for half a catalogue.

Answer it — *Electronically supplied* or *In person or on paper* — and the form saves.

## Saving says the pointer is required

Every kind except `download` needs one. If you meant a download, switch the kind: the pointer
field disappears and any value in it is dropped on save.

## A kind shows as a raw value like `zugang` in the Kind column

That is a row written by **1.0.0**, before the kinds were renamed to English, on an install
where `php artisan migrate` has not been run since.

```bash
php artisan migrate
```

The 1.1.0 migration rewrites `zugang`, `termin`, `sitzungen` and `kohorte` to `access`,
`event`, `sessions` and `cohort`. Until it runs, those rows show the stored value and their
pointers answer *cannot be checked*, because the addon does not recognise the kind.

## In multi-brand mode, the product picker is empty

`Catalogue::contribute()` fails closed. With no brand current, an unscoped list would offer
another tenant's catalogue for sale, so it offers nothing instead.

Pricing is unaffected: `Catalogue::extend()` answers regardless of brand, because a provider
webhook has no brand at all.

## In multi-brand mode, a product is buyable but not in any listing

Its `brand_id` is **0**. The brand is stamped at creation from the brand the request was in,
and a console command, a seeder or a queue job is in none.

The listing and the picker are scoped to the current brand, and nobody's brand is zero, so
the row is invisible in all of them — while `extend()` keeps pricing it, because pricing is
deliberately unscoped. Set `brand_id` on the row, or create products from the Control Panel.

## A product vanished from the catalogue after an update over the API

**A 1.1.0 bug, fixed in 1.2.0.** `active` and `grants` are the two fields with no `required`
rule, and they were read with `$request->boolean()` and `(array)` unconditionally — so a
`PATCH` that simply omitted them stored `false` and `null`, dropping the product out of the
catalogue and erasing its access slugs, with a `200` in reply.

Since 1.2.0 only what was sent is written. Sending `grants: []` still clears them, because an
empty list is a statement; leaving the key out is not. See
[Reference](/products/reference#validation).

## Nothing appears in the Control Panel

```bash
php artisan vendor:publish --tag=statamic-products --force
php artisan statamic:install
```

Statamic publishes addon assets from a `statamic:install` hook in `post-autoload-dump`.
Without it, nothing publishes.

If the nav entry is there but the screen answers 403, that is the permission:
`access products utility`.
