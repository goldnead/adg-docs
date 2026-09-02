# Client Rooms

<AddonHeader />

One lasting room per coaching client: what happened, what is to do, what you shared. Opened
by the first purchase, kept when the access runs out.

<Figure
  src="clientrooms-room"
  alt="A client room with tasks, shared documents, the merged timeline, the owner and two note fields"
  caption="One room, one person. Tasks and documents on top, the history below, the coach's notes beside it." />

## The hole this fills

[Entitlements](/entitlements/) says who may open what. [Booking](/booking/) says who has how
many sessions left. [LeadHub](/leadhub/) knows the person. None of them holds the
*relationship* — the running list of things to do, the recording you sent last week, the
note about what to work on next. Today that lives in mail threads and in the coach's head.

A room is that relationship, as a thing with state. It is opened once, it outlives any
single product, and everything about one client hangs off it.

## What you get

- **One room per client**, keyed by e-mail address (and brand on a multi-brand install).
  Open it by hand in the Control Panel or through the facade. With
  [Payments](/payments/) installed, the first paid coaching product opens it on its own.
- **Tasks**: title, due date, done by whom. Ticking one fires `ClientRoomTaskCompleted`,
  exactly once.
- **Documents** as Statamic assets in one container, one folder per room, with a
  visible-to-client switch per file. The client downloads through a signed link that expires
  after 30 minutes and never sees a storage path.
- **The timeline.** With LeadHub installed, the room shows the contact's merged timeline —
  the very `ContactTimeline` LeadHub's own contact screen renders. Without it, a short list
  read from the `payments` and `bookings` tables. Read-only either way.
- **Two kinds of notes**: for the team, and for the client. The tag yields only the second.
- **`{{ client_room }}`** for the members area: the signed-in user's own room and nobody
  else's.
- **Events** for [Automations](/automations/): `ClientRoomOpened`, `ClientRoomClosed`,
  `ClientRoomTaskCompleted`.

<Figure
  src="clientrooms-listing"
  alt="The Clients listing with name, e-mail, status, open tasks, last activity and brand"
  caption="Tools → Clients. Core's listing: search, sortable columns, a column picker." />

## Three rules it will not bend

**Internal notes never reach a template.** `notes` is the coach's; the tag hands out
`client_notes` and nothing else. There is no parameter that changes this.

**A closed room hands out nothing.** The tag answers `no_results`, and a signed download link
made while the room was open stops working the moment it is closed.

**A second purchase does not make a second room.** `open()` on an open room returns it
unchanged and fires no event. On a closed room it reopens it, once, with `reopened = true`.

## What it is not

Not a members area, not a course player, not a message channel. The client sees their room
through a page *you* build with the tag, inside whatever login your site already has.
Messages come when `statamic-messaging` exists; a room is the aggregate that will contain a
channel, not the channel itself.

## The shortest useful path

```bash
composer require goldnead/statamic-clientrooms
php artisan migrate
php please clientrooms:install
```

Then **Tools → Clients → Open room**, type an address, add a task, upload a file. Put
`{{ partial:statamic-clientrooms::room }}` on a page behind your login and sign in with
that address.
