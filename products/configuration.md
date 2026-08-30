# Configuration

<AddonHeader />

**There is no config file.** Nothing to publish, nothing to set.

That is the point of the addon rather than an omission. Everything a product is — its name,
its handle, its kind, its price, what it opens — is a row in a table, edited in the Control
Panel by whoever runs the shop. Until now the only place a price could be changed was a
config file, which meant a deploy, which meant a developer.

What follows is the settings this addon **reads**, all of them belonging to other packages.

## From `config/statamic-payments.php`

| Key | What this addon does with it |
| --- | --- |
| `currency` | The currency a product falls back to when its own **Currency** field is empty. |
| `products` | The configured catalogue. A handle that appears there *and* here is charged at the file's price, and the collision is shown on the screen. |

The second one is the important one, and it has its own section in
[In the payment catalogue](/products/catalogue#config-wins). In short: **config wins.** A
price in version control was written on purpose, and a deploy must not be silently overruled
by a row in a table.

Silent is right for the answer and wrong for the screen, so the collision is visible twice:
a **From config** badge on the row, and a warning in the form that appears while the handle
is still being typed.

## From `config/statamic-booking.php`

| Key | What this addon does with it |
| --- | --- |
| `endpoints` | What a `sessions` product's pointer is resolved against. |

A sessions product points at the **funnel a session is booked through**, not at a session.
[Booking](/booking/) records bookings that already happened; it has no catalogue of bookable
things to point at, and `endpoints` is the nearest thing that exists.

This key is only reached if Booking is installed at all. Without it, nothing is read and every
sessions pointer answers *cannot be checked* — and the same answer comes back when Booking is
installed but `endpoints` is empty, because an empty array is that addon's shipped state and
cannot be read as "this endpoint does not exist".

## Publish tags

| Tag | |
| --- | --- |
| `statamic-products-migrations` | the migrations, if you want them in `database/migrations` |
| `statamic-products` | the compiled Control Panel assets. Statamic publishes these on install; you only need the tag to force them again |
| `statamic-products-translations` | the language files, if you want to reword a label |

There is no config tag, because there is no config.

## What is not configurable

**The six kinds.** `download`, `access`, `event`, `sessions`, `cohort` and `feed` are a fixed
list. A kind is a promise about what the pointer beside it means, and a free-text kind is a
promise nobody checks. A row carrying a kind this addon does not know still renders — the
raw value in the cell, and *cannot be checked* for its pointer — because a listing that
throws is worse than one that admits ignorance.

**Whether `digital` has a default.** It has none, and it cannot be given one. It decides the
place of supply and with it the mandatory notice on the invoice (§ 3a UStG). Every default
is wrong for half a catalogue, and a wrong default here is invisible: it surfaces as a tax
line nobody checked.

**Whether a sold handle can be renamed.** It cannot. See
[The handle is a promise](/products/handles).

**Which column the listing hides.** **Points at** is off by default, because most catalogues
are downloads and access, where the pointer is an id nobody reads. Switch it on from the
column picker on a site that files dates and cohorts. Switching it off hides no defect: the
count of dangling pointers sits **above** the table, where no column preference reaches it.
