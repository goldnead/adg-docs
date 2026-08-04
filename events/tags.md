# Antlers tags

<AddonHeader />

Seven tags. Every one of them reads through the `Events` manager rather than building its own
query, which is what keeps the visibility rules in one place: a tag that assembled its own
`where` would eventually forget one, and forgetting one here means a private workshop rendered on
a public page.

| Tag | Returns |
| --- | --- |
| `{{ events }}` | Events |
| `{{ events:occurrences }}` | Dates, the general form |
| `{{ events:upcoming }}` | Dates from now on, cancelled ones dropped |
| `{{ events:next }}` | The next attendable date, or nothing to loop over |
| `{{ events:count }}` | How many dates match |
| `{{ events:feed_url }}` | The subscribable calendar URL |
| `{{ events:ics_url }}` | The per-date download URL |

## Listing events

```antlers
{{ events type="workshop" limit="6" }}
    <h3>{{ title }}</h3>
    {{ description }}
{{ /events }}
```

Parameters: `type`, `limit`, `listable`.

Each event is:

```
id            the uuid, never the database id
title
slug
description
type
visibility    'public' | 'unlisted'
timezone
published_at
feed_url
```

`{{ events }}` lists **published public events**. Add `listable="false"` to include unlisted
ones. Nothing reaches a private or a draft event.

## Listing dates

The event's own fields sit under `event`, not at the top level:

```antlers
{{ events:upcoming limit="5" }}
    <li>
        {{ starts_at format="D, j F Y, H:i" }} ({{ timezone }})
        {{ event:title }}
        {{ if location }}<span>{{ location }}</span>{{ /if }}
    </li>
{{ /events:upcoming }}
```

Every date carries its whole event under `event`, so a listing needs one loop rather than two.

Each date is:

```
id                   the occurrence uuid, which is what ics_url takes
starts_at            local: the date in its own zone
ends_at              local, or null
starts_at_utc        for arithmetic
ends_at_utc
timezone             the effective zone, so a template can label what it printed
all_day
cancelled
cancellation_reason
online
online_url
venue_name / venue_address / venue_city / venue_country
location             the venue fields joined with commas, or the online URL
ics_url
event                the whole event, or null
```

`starts_at` is the **local** start, in the event's own zone, because that is what a page about a
concert in Tokyo should print. See [Timezones](/events/timezones).

## The three date tags differ in two defaults

| | Horizon | Cancelled dates |
| --- | --- | --- |
| `{{ events:occurrences }}` | Whatever `from`/`to` say | **Included** |
| `{{ events:upcoming }}` | From now on | **Dropped** |
| `{{ events:next }}` | From now on | Dropped, always |

```antlers
{{# Everything in a window, including what was called off #}}
{{ events:occurrences from="2026-09-01" to="2026-09-30" }}
    {{ starts_at format="j.n." }} {{ event:title }}
    {{ if cancelled }}<s>cancelled: {{ cancellation_reason }}</s>{{ /if }}
{{ /events:occurrences }}

{{# What a visitor can still attend #}}
{{ events:upcoming limit="3" }}
    {{ starts_at format="j.n." }} {{ event:title }}
{{ /events:upcoming }}
```

`from` still works on `{{ events:upcoming }}`: it moves the horizon rather than being ignored,
which is what a "what is on next month" listing needs.

Override the default with `include_cancelled`:

```antlers
{{ events:upcoming include_cancelled="true" }}
```

`{{ events:next }}` ignores the parameter entirely. A cancelled date is never the next one,
whatever the caller asks.

## Full parameter list for the date tags

`event`, `type`, `from`, `to`, `limit`, `order`, `include_cancelled`, `listable`.

| Parameter | Meaning |
| --- | --- |
| `event` | An event slug, or a comma-separated list of them |
| `type` | An event type, or a comma-separated list |
| `from`, `to` | Bound `starts_at`. Any string Carbon can parse |
| `limit` | Maximum rows |
| `order` | `asc` (default) or `desc` |
| `include_cancelled` | Default `true` on `occurrences`, `false` on `upcoming` |
| `listable` | Default `true`. `false` adds unlisted events |

`from` and `to` compare against the **start** of a date, not its end. A multi-day date that
started before the window does not appear in it.

## The next date

```antlers
{{ events:next event="registerarbeit" }}
    <p>Next: {{ starts_at format="j F, H:i" }} ({{ timezone }}), {{ location }}</p>
{{ /events:next }}
```

It returns a list of nothing or of one, so a template loops over it and renders nothing when
there is no next date. There is no separate "is there one" check to write.

## Counting

```antlers
{{ events:count type="concert" }} concerts coming up
```

Takes the same parameters as `{{ events:occurrences }}` and counts only what a visitor could
see.

::: warning `limit` does not reduce the count
`limit` is accepted and pushed into the query, but a `LIMIT` clause does not reduce a
`count(*)`. `{{ events:count limit="3" }}` returns the full number of matching dates, not three.

Use `limit` on the listing tags and leave it off the count.
:::

## URLs

```antlers
<a href="{{ events:feed_url }}">Subscribe to the calendar</a>
<a href="{{ events:feed_url type="concert" }}">Subscribe to concerts</a>

{{ events:upcoming limit="1" }}
    <a href="{{ events:ics_url occurrence="{{ id }}" }}">Add to calendar</a>
{{ /events:upcoming }}
```

`{{ events:ics_url }}` builds a URL from whatever id it is handed. It checks nothing: not that
the occurrence exists, not that it is visible. Given the id of a private event's date it prints a
URL that answers 404.

It returns nothing when the `occurrence` parameter is empty, which is the only case it guards.

Each date already carries its own `ics_url`, so the tag is only needed when you have a UUID from
somewhere else.

## What there is no tag for

No tag creates, updates or cancels anything. The Antlers surface is read-only, and writing goes
through the Control Panel, the facade or Eloquent. See [Extending](/events/extending).
