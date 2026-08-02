# Calendar feeds and ICS

<AddonHeader />

Two public routes, both unauthenticated, both outside every auth middleware. A calendar client
fetches them with no session, which is the whole point.

| Method | URI | Name |
| --- | --- | --- |
| `GET` | `/!/events/occurrences/{uuid}.ics` | `statamic.events.occurrence` |
| `GET` | `/!/events/calendar.ics` | `statamic.events.feed` |

The prefix is fixed. A subscription URL is pasted into a phone once and then never touched
again, so it must not be movable from a config file.

## The per-date download

One `VEVENT`, for the occurrence with that UUID.

```antlers
{{ events:upcoming limit="5" }}
    <a href="{{ events:ics_url occurrence="{{ id }}" }}">Add to calendar</a>
{{ /events:upcoming }}
```

The route matches only a well-formed UUID. Everything else is a 404, and so is a private event,
a draft event and an unknown id. See [Visibility](/events/visibility#the-per-date-download-is-a-404-not-a-403).

Response headers:

```
Content-Type: text/calendar; charset=utf-8
Content-Disposition: attachment; filename="registerarbeit-2026-09-12.ics"
```

The filename is the event slug reduced to ASCII plus the local date. A `Content-Disposition` is a
header, so nothing that is not `[A-Za-z0-9-]` survives into it.

::: tip `ics_url` does not check anything
`{{ events:ics_url }}` builds a URL from whatever id it is given. It performs no existence and no
visibility check, so it will happily print a URL that 404s. It returns nothing at all when the
`occurrence` parameter is empty.
:::

## The subscribable feed

```
https://example.com/!/events/calendar.ics
https://example.com/!/events/calendar.ics?type=concert
```

```antlers
<a href="{{ events:feed_url }}">Subscribe to the calendar</a>
<a href="{{ events:feed_url type="concert" }}">Subscribe to concerts only</a>
```

What the feed contains is decided by the server, not by the caller:

| Setting | Value | Caller may change it |
| --- | --- | --- |
| Visibility | Listable only: published and public | No |
| From | `now()` minus `feeds.past_days` | No |
| Limit | `feeds.max_occurrences` | No |
| Cancelled dates | Included | No |
| Order | Ascending by start | No |
| Type | Unfiltered | **Yes**, and it can only narrow |

`type` is applied inside the same constraint that applied the visibility clause, after it. There
is no parameter that widens a feed, and adding one would change what a URL handed to strangers
means.

`Cache-Control: public, max-age=<feeds.cache_seconds>` is sent with the feed, default 300
seconds.

Set `feeds.enabled` to `false` and the feed answers 404. The per-date download is unaffected.

## Cancelled dates stay in the feed

This is the behaviour that makes a subscription worth having.

```
BEGIN:VEVENT
UID:1f0c…@example.com
SEQUENCE:1
STATUS:CANCELLED
SUMMARY:Registerarbeit
DTSTART:20261108T090000Z
COMMENT:The venue withdrew.
END:VEVENT
```

Same `UID`, raised `SEQUENCE`, `STATUS:CANCELLED`. The client already holds this appointment;
the UID tells it which one, and the sequence tells it that this version is newer. It marks the
appointment cancelled rather than creating a second one.

Dropping the row from the feed instead would leave every subscriber holding an appointment that
nobody will ever contradict.

The same mechanism carries a reschedule: the UUID never changes, so a moved date arrives as an
update to the appointment the reader already has.

## What the ICS contains

Hand-written RFC 5545, no library.

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//gldnr.studio//statamic-events//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Adrian Goldner
```

Per `VEVENT`, in this order: `UID`, `DTSTAMP`, `SEQUENCE`, `STATUS`, `SUMMARY`, `DTSTART`,
`DTEND`, `DESCRIPTION`, `LOCATION`, `URL`, `COMMENT`, `LAST-MODIFIED`. The last five are emitted
only when they have a value.

| Line | Source |
| --- | --- |
| `UID` | `{occurrence uuid}@{host of app.url}`. Never derived from anything mutable |
| `SEQUENCE` | The occurrence's sequence counter |
| `STATUS` | `CONFIRMED` or `CANCELLED` |
| `SUMMARY` | The event title |
| `LOCATION` | Venue name, address, city and country joined with commas, or the online URL |
| `URL` | The online URL, when there is one |
| `COMMENT` | The cancellation reason, when cancelled and given |

Escaping follows RFC 5545 §3.3.11. Lines are folded at 75 octets with a leading space on
continuation lines, and the split walks back off UTF-8 continuation bytes so a multi-byte
character is never cut in half. Line endings are CRLF.

**Not emitted:** `RRULE`, `RDATE`, `EXDATE`, `RECURRENCE-ID`, `VTIMEZONE`, attendees, alarms,
attachments. See [Timezones](/events/timezones#the-ics-output-is-utc-on-purpose) for why there is
no `VTIMEZONE`, and [Concepts](/events/concepts#there-is-no-recurrence) for why there is no
recurrence.

## Naming the calendar

```php
'feeds' => [
    'name' => 'Adrian Goldner: Termine',
],
```

Becomes `X-WR-CALNAME`, which is what most clients display as the subscription's name. Null falls
back to `config('app.name')`.

It is not a standard property. Clients that ignore it show the URL instead, which is why it is
worth setting.
