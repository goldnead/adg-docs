# Campaign series

<AddonHeader />

A series turns one campaign into one campaign per concert. For every upcoming date from
[Events](/events/) the template is copied, aimed at the contacts living near that date, scheduled
a few days ahead — and only sent once somebody approves it.

**Marketing → Campaigns**, the *Series* tab. Writing the template is `manage marketing campaigns`;
approving and withdrawing a generated campaign needs the same permission as scheduling one.

## What a series is

**A series is a campaign.** The template is an ordinary campaign with the status `series`: subject,
body, list, layout, brand and mail class come from the normal campaign editor. Nothing about it is
ever sent itself. The series settings live in the same editor, under *Als Serie für Termine*.

Everything the series creates is an ordinary campaign too, with one difference: it starts as
**Wartet auf Freigabe** (`awaiting_approval`). That status is not sendable, is not picked up by
`marketing:send-scheduled`, and is ignored by the Automations action *Send email*.

For each date the sync creates:

- a **LeadHub segment** `Konzert: <city> <postal code> (<km> km)` with the `geo` condition
  (`within_km`), the same segment you would build by hand;
- a **campaign** named `<template name> (<city>)`, with that segment as its audience, a snapshot of
  the date in `meta['event']`, and a computed send time.

## Setting it up

Open a campaign, switch on *Als Serie für Termine*, and fill in:

| Setting | Default | What it does |
| --- | --- | --- |
| `radius_km` | `50` | Radius around the date's postal code, 1 to 1000. |
| `days_before` | `7` | Send this many days before the concert (0 to 365). Used when `anchor` is `concert`. |
| `send_time` | `10:00` | Time of day, in the date's own timezone. |
| `event_ids` | empty | Only dates of these events. Empty means every published event. |
| `country` | `DE` | Used when a date has no country of its own (two letters). |
| `anchor` | `concert` | `concert` counts back from the start of the date, `presale` counts from the start of the ticket sale. |
| `days_after_presale` | `0` | With `anchor = presale`: send this many days after the presale begins, at `send_time`. |
| `more_enabled` | on | Add later dates nearby as a list, see [More dates](#more-dates). |
| `more_radius_km` | `100` | How far from this date's venue a later date may be to count. |
| `more_limit` | `3` | At most this many more dates, by date. |

The switch turns a draft into a template. It turns back only while the template has no generated
campaigns. List and segment of a template and of its children are locked: the series owns them.
Saving a template runs the sync and reports what it did.

Under the settings the editor lists the generated campaigns with city, date, send time, status and
the number of contacts in the radius, plus a count of dates that were skipped, for example *3 Termine
ohne Postleitzahl werden übersprungen*.

### Two anchors

With `anchor = concert` the mail goes out `days_before` days before the concert at `send_time`.

With `anchor = presale` it goes out on the day the ticket sale starts, plus `days_after_presale`,
at `send_time`, and never before the sale begins. If the sale is already running and the concert
is still ahead, there is no sensible send time left: the campaign waits for approval and goes out
right after it, like any campaign whose time has passed.

A date without a presale date is skipped under `presale` and counted as `skipped_no_presale`. The
segment of a presale series is called `Vorverkauf: <city> <postal code> (<km> km)`.

## Placeholders

Subject, preheader and body take the date's fields as Antlers variables:

```antlers
<p>Wir kommen nach {{ event:city }}!</p>
<p>{{ event:weekday }}, den {{ event:date_short }} um {{ event:time_label }}</p>
```

| Variable | Example |
| --- | --- |
| `{{ event:title }}`, `{{ event:city }}`, `{{ event:venue }}` | Name of the event, city and venue |
| `{{ event:street }}`, `{{ event:postal_code }}`, `{{ event:country }}` | Address of the venue |
| `{{ event:date }}`, `{{ event:time }}` | `17.10.2026`, `20:00` |
| `{{ event:weekday }}`, `{{ event:date_short }}`, `{{ event:time_label }}` | `Samstag`, `17.10.26`, `20 Uhr` or `20:30 Uhr` |
| `{{ event:presale_starts_at }}`, `{{ event:presale_date }}` | Start of the ticket sale |
| `{{ event:tickets_url }}`, `{{ event:url }}` | Links of the date |

All of it in the timezone of the date, in German. The values are a **snapshot** on the generated
campaign, refreshed on every sync. The template itself renders with an example date (Ulm) until it
has children; after that the preview uses the first child's date, and *Vorschau für* lets you pick
another.

### More dates

`{{ more_events }}` is a list of later dates near this one. Each entry has the same `event:` fields:

```antlers
{{ more_events }}
  <p>{{ weekday }}, {{ date_short }}: {{ city }}, {{ venue }}</p>
{{ /more_events }}
```

A date counts when it is later than this one, not cancelled, in the same selection of events, and
at most `more_radius_km` from this date's venue. The distance uses the coordinates LeadHub already
holds for postal codes. It is **display only**: the audience stays the radius around the main
date. The list is recalculated on every sync, so a new, moved or cancelled date updates all children
it touches.

## The two blocks

For [block layouts](./campaigns#templates) there are two blocks, so a template can be built without
Antlers. Colours come from the layout theme and can be overridden per block.

- **Terminkasten**: the day in words, the venue in the accent colour, street, "postal code city" and
  a button *Tickets buchen* (the label is editable). Font sizes are set per block: date 24 px, venue
  18 px, address 16 px, button 14 px.
- **Weitere Termine**: a heading (default *Weitere Konzerte in deiner Nähe*) and one line per date
  with a link. Without more dates the block disappears.

An empty box or list never leaves a hole in the mail. Both are tables with inline styles, the
button is a `bgcolor` table like the button block, and columns stack below 620 px. The layout preview
shows them with example dates.

### In the text

To put the box between paragraphs, write `{{ terminkasten }}` or `{{ weitere_termine }}` on a line
of its own in the campaign text. It is rendered in the style of the block of the same name in the
layout, or in the theme if the layout has none. A placeholder in the text takes the place of the
fixed block, so the box never appears twice. Without a placeholder the layout's block applies.

## Approval and withdrawing

A generated campaign shows up under *Wartet auf Freigabe*, sorted by the next send time. Its page
summarises what goes out:

- subject and preheader with the date inserted, and the sender actually used;
- the audience as a link to the segment in LeadHub, with the number of contacts;
- list, date (with *Vorverkauf ab …*), send time or *sofort nach Freigabe*;
- the mail itself, with a desktop and phone switch, and *Testmail an mich senden*.

**Freigeben** asks once and puts the campaign on `scheduled` for its send time, or for now if that
has passed. Approving a campaign whose concert is over is refused. **Zurückziehen** puts a scheduled
campaign back on *Wartet auf Freigabe*. Text, subject and preheader of a waiting campaign can still
be edited; the sync leaves the text alone.

## When dates change

The sync is keyed by `source_key = occurrence:<uuid>` and the template's handle, so running it twice
changes nothing.

| What happens to the date | What happens to the campaign |
| --- | --- |
| New, upcoming, published, with a postal code | Segment and campaign are created. |
| Rescheduled | Snapshot, send time and segment rule follow; status stays. |
| Presale date set, moved or cleared | Same, for presale series (statamic-events 2.7). |
| Cancelled, unpublished, deleted, or taken out of `event_ids` | Unsent campaign and its segment are removed; the removal is logged. |
| No postal code | Skipped, counted as `skipped_no_postal_code`. |
| Past | Nothing is created. |
| Campaign is `sending` or `sent` | Never touched. |

The sync writes a child back only while it still waits or is scheduled, so a send that has started
is never overwritten. Deleting the template removes its unsent children and unused segments.

## Safety

- **Never to the whole list.** A series campaign whose segment is missing, inactive, empty in its
  handle or not resolvable by LeadHub goes to **nobody**, with an error in the log. This
  fail-closed rule applies to every series child. Ordinary campaigns keep their behaviour, except
  that an empty or missing segment handle no longer means the whole list for them either.
- **Never after the concert.** A child whose send time would fall on or after the start of the
  date (presale plus N days, or a time later than the concert) is not created, counted as
  `skipped_too_late`, and removed if it exists. On top of that the send job refuses any series
  child whose concert has already begun.
- **Contacts without a postal code** match no radius and are not mailed.
- **Approval is always required.** Nothing generated sends itself.

## The command and the scheduler

```bash
php artisan marketing:series-sync            # all brands
php artisan marketing:series-sync --brand=anders
```

The command creates what is missing, updates what moved and removes what is gone. It runs
**daily at 03:07** from the scheduler. The date listeners (`OccurrenceScheduled`,
`OccurrenceRescheduled`, `OccurrenceCancelled`, `OccurrencePresaleChanged`) and saving a template
trigger the same sync through a queued job, unique per brand for ten seconds, so an import of thirty
dates is one run.

::: danger Without the scheduler, approved campaigns silently never send
Generated campaigns are sent by `marketing:send-scheduled` like any other, and the nightly sync
catches deleted dates, which fire no event. Both need `schedule:work` or a cron entry for
`schedule:run`, see [Campaigns](./campaigns#scheduling).
:::

## Requirements

| Needs | For |
| --- | --- |
| `goldnead/statamic-events` | Dates to build campaigns from. Optional: without it the series section only says so, and `marketing:series-sync` reports that the events addon is missing. |
| `statamic-events` 2.7 or later | `presale_starts_at` and `OccurrencePresaleChanged`. Before that every date of a presale series is skipped, and the editor says so. |
| `statamic-leadhub` 2.14 or later | The segments with the `geo` condition. |
| `statamic-leadhub` 2.15 or later | `managed_by` on segments, so series segments show as read-only. On older LeadHub the field is dropped silently and the sync still runs. |

Without the `leadhub_postal_codes` table (LeadHub on files) the run does not abort; dates without
coordinates are just missing from *more dates*.

## Related

- [Campaigns](./campaigns), the template and everything a campaign does.
- [Sequences](./sequences), the other automatic mail, triggered by a person rather than a date.
- [Segments in LeadHub](/leadhub/segments#radius-conditions-and-managed-segments), the radius condition.
- [Events](/events/concepts), the dates and the presale date.
