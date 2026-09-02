# What a room is

<AddonHeader />

A room is a *relationship with state*, not an access right and not a purchase.

## Keyed by address, linked to the contact

`client_rooms` is unique on `(brand_id, email)`. The address is normalised (trimmed,
lower-cased, nothing cleverer) before it is written, the same rule LeadHub applies, so a
room and a contact for the same person land on the same string.

`contact_id` is a link to LeadHub's contact, filled when LeadHub is installed and knows the
address in that brand. It is never the key: LeadHub is a suggestion, and a room must
survive without it.

## Open, closed, reopened

A room is `open` or `closed`. Closing keeps everything — tasks, files, notes, the history —
and takes the room out of the client's view: the tag answers `no_results`, signed links stop
working. Reopening is the same call as opening; the room comes back with `opened_at` reset
and `closed_at` cleared, and `ClientRoomOpened` fires with `reopened = true`.

`open()` on a room that is already open returns it and fires nothing. That is the whole
idempotency story, and it is what lets the payment listener run on every paid payment
without counting.

## How a purchase opens a room

With [Payments](/payments/) installed, the addon listens to `PaymentPaid`. For every line of
the payment it asks two questions, in this order:

1. Is the handle in `open_on_products`? Then it matches, whatever the product's kind.
2. Is the product's `type` (read straight off the `products` table, when
   [Products](/products/) has one) in `open_on_product_types`? Default: `sessions`.

The first match opens or reopens the buyer's room. The brand is the payment's; a payment
that carries none — a webhook has no brand — takes the brand of the matching product, so a
single-brand shop and a multi-brand host both get the right answer. `default_owner` becomes
the owner; `meta` records `opened_by: payments`, the payment id and the handle.

A payment without an address, or without a matching line, does nothing.

## Where the timeline comes from

Two answers, one shape. When LeadHub is installed and the room has a `contact_id`, the room
asks LeadHub's `ContactTimeline` — the same object LeadHub's contact screen renders, resolved
through the container, never copied — and shows what it gets: LeadHub's own events plus
whatever sources LeadHub has registered (payments, entitlements, bookings, consent).

Otherwise the room reads for itself: paid payments and bookings for the address, straight
from the neighbours' tables, when those exist. A small list, newest first, enough to see
when somebody bought and when they were here. The screen says which mode it is in.

Nothing here writes, and a source that throws is logged and left out rather than taking the
page down.

## Documents

Every file is a Statamic asset in one container (`clientrooms` by default), in the folder
`room-<id>/`. The row in `client_room_files` remembers container and path — not the asset
id, which changes when a file is moved.

Only the extensions in `allowed_extensions` are accepted — pdf, the Office formats, png,
jpg, mp3, mp4 and zip by default, up to 50 MB. The list is checked twice, at the upload
endpoint and again in `ClientRooms::attach()`, so a file that arrives through code is held
to the same rule as one dragged onto the screen. An empty list accepts everything.

**On a multi-brand install every brand gets its own container**, `<container>-<brandId>` —
`clientrooms-2` for brand 2. `clientrooms:install` creates them, and so does the first
upload for a brand whose container is missing. This is not tidiness: a container is the unit
Statamic grants asset permissions on, so `view clientrooms-2 assets` and
`upload clientrooms-2 assets` and nothing else shows a brand's staff their own clients'
files in the Assets section and no one else's. The room screens do not go through those
permissions at all; they are guarded by `view client rooms` / `edit client rooms` plus the
brand scope.

Each file has a `visible_to_client` switch. The client's link is a signed URL to
`/!/statamic-clientrooms/files/{id}`, valid for `download_ttl_minutes`, produced fresh every
time the page renders. The route checks the signature, then that the file is still visible
and the room still open. The storage path never leaves the server.

::: warning A download link is a bearer link
For as long as it is valid, that URL works for whoever holds it — there is no second check
against the signed-in user. Keep the page that renders it behind your login, and do not put
the link into a mail.
:::

## Two kinds of notes

`notes` is the coach's own — the sort of thing that says *singt Alt, will Sopran*. It lives
in the Control Panel and nowhere else. `client_notes` is what the coach chose to show, and
it is the only text the tag yields as `notes_for_client`. Two columns rather than a flag on
one, because a flag is a thing somebody flips by accident.

## What it deliberately leaves out

- **Messages.** A channel is a different object; the room is the aggregate that will hold
  one. See the `statamic-messaging` ticket.
- **Its own login.** The client uses the site's members area; the tag finds the room by the
  signed-in user's address.
- **Drag-sorting tasks.** A `position` column exists; the screen sorts by it and by id.
- **Reports.** Rooms are not counted anywhere yet. A metric for
  [Insights](/insights/) is a small addition when it is wanted.
