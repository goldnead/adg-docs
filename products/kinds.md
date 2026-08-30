# The kind and the pointer

<AddonHeader />

Two fields, `type` and `ref`, and one rule that explains both.

## The kind is an answer, not an instruction

Naming a product an **event** says it is a live date. It does not reserve a seat. Nothing in
this addon acts on a kind, and nothing ever will.

Kajabi and Podia go the other way: there the product type *is* the delivery, the course type
*is* the player, the coaching type *is* the calendar. Going that way means building a course
player, a community engine, a scheduler and podcast hosting. That is not an addon family any
more, that is a platform.

Here the delivery stays where it already is: on the website, and in the sibling addons that
do that job. Some of those do not exist yet. The kind is what a sibling would **read** on the
day it wants to act — and until that day it is a label on a screen, so a catalogue can be
filed honestly today.

## The six kinds

| Kind | What it is | `ref` points at |
| --- | --- | --- |
| `download` | PDF, workbook, recording | nothing — the thing *is* the product |
| `access` | A course, a members area, a community | a Statamic entry id |
| `event` | Live event, workshop, concert, webinar | an event uuid in [Events](/events/) |
| `sessions` | A package of appointments | a booking funnel handle in [Booking](/booking/) |
| `cohort` | A programme with a start, an end and a group | a Statamic entry id |
| `feed` | A paid podcast or newsletter | a Statamic collection handle |

The values in the left column are what is **stored**. The Control Panel shows a label instead,
in whatever language it is running in, and one of them does not match its value: `event` is
labelled **Date**. The stored values were German in 1.0.0 and were renamed in **1.1.0**; see
[Changelog](/products/changelog).

A download is the only kind that needs no pointer, and it is the only one whose pointer field
disappears from the form. A `ref` on a download is nulled on save rather than rejected —
changing a kind is a normal edit, and it should not need the field cleared by hand first.

`ref` is deliberately **not** a foreign key, and deliberately one column rather than one per
kind. Half of what it can point at lives in another package's table, half in flat content
files, and a quarter of it is not installed on any given site. A join would have to exist
five times and would break the moment somebody uninstalled a sibling.

## Three answers, not two

This is the part worth reading slowly, because collapsing it is how a screen ends up lying
in one of two directions.

| Answer | What it means |
| --- | --- |
| **resolved** | Found it, and the screen shows its name. |
| **gone** | The sibling that owns this kind is installed and says there is no such thing. A real defect: sold, paid, nothing behind it. |
| **cannot be checked** | The sibling is not installed, or has not migrated. Nothing is wrong with the product; nobody can confirm it either. |

Only **gone** is accused. A badge that cries wolf is a badge everyone learns to ignore, so
*cannot be checked* is never flagged — a perfectly good product must not be marked broken
just because the package that would have noticed is absent.

And the other direction matters as much: without the third answer, a dangling pointer would
be waved through on any site that had not installed the sibling.

An empty `ref` is not a dangling pointer either. Neither is a download. Both resolve. The form
cannot produce the first case — every kind but `download` requires a pointer — so an empty one
on, say, an `access` product only arrives from a seeder or an import.

## What counts as gone, per kind

- **`access` and `cohort`** — the Statamic entry id resolves to nothing. If it resolves to
  something that is not one of core's own entries, the answer is *cannot be checked*: it
  exists, this addon just cannot say what it is called.
- **`feed`** — the Statamic collection handle does not exist.
- **`event`** — [Events](/events/) is installed and migrated, and no event carries that
  uuid. By uuid and not by slug, because a slug is unique per brand while a product handle is
  not scoped by brand at all. If Events is absent or unmigrated: *cannot be checked*.
- **`sessions`** — [Booking](/booking/) is installed, `statamic-booking.endpoints` is not
  empty, and the handle is not among them. An empty endpoints config is that addon's shipped
  state, so it answers *cannot be checked* rather than *gone*.
- **A kind this addon does not know** — *cannot be checked*. The row is not wrong; the
  lookup is behind.

A lookup that throws also answers *cannot be checked*, and that answer is not remembered for
the rest of the request. A transient failure has not established that a target is gone, and
it must not freeze into an answer.

## The count above the table

A dangling pointer is flagged twice, and the second one is the one that matters.

The **Target gone** badge on the row says *which* product is broken. The count in the banner
above the table says that any are — and it sits there because **every column in a Control
Panel listing can be switched off**, the name column included. A catalogue that reads as tidy
because somebody hid a column is exactly the silent failure this field was built against.

The count is over the whole catalogue for the current brand, not over the page you are
looking at. "Two are broken on page three" is not an answer anyone gets on opening a screen.

::: tip Why this is worth a banner
The failure mode has no error in it. The product is sold, the payment succeeds, the invoice
is written, the access is granted — and the identifier corresponds to nothing. Nobody finds
out from a log.
:::

## Filing a product before its sibling exists

You can. A product for an `event` can be created before [Events](/events/) is installed; a
`sessions` product before [Booking](/booking/) is. Their pointers simply answer *cannot be
checked* until the sibling arrives, at which point they start being resolved with no further
action.

That is the whole reason the third answer exists. Refusing to catalogue what a site will sell
because the delivery package is not written yet would be the tail wagging the dog.
