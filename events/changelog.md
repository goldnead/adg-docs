---
title: Events changelog
editLink: false
---

# Changelog

<AddonHeader slug="events" />

Release notes for `goldnead/statamic-events`, as published with the package.

::: warning Nothing is released yet
The repository has **no git tag** and the package is not on Packagist. Everything below sits
under `[Unreleased]`. Publishing this addon, meaning the Packagist name, the Marketplace listing
and a first tag, is a decision that has not been taken.
:::

Tag names, Antlers tag parameters, config keys and facade methods are part of the public API from
the first release. Cross-version upgrade notes for the whole suite are in
[Upgrading](/guide/upgrading).

## Unreleased

### Added

- **Events** with a title, slug, description, type, visibility, status and timezone. The slug is
  unique per brand.
- **Occurrences**: any number of dates per event, each with an optional end, an optional all-day
  flag, an optional timezone override, and a venue and/or an online URL. Neither location is
  required on its own; having neither is refused.
- **Timezones**: instants stored in UTC, rendered in the event's own zone rather than the
  viewer's. An occurrence may override the event's zone, which is what a tour across two
  countries needs.
- **ICS download per occurrence** and a **subscribable calendar feed**, both unauthenticated,
  both under a fixed `/!/events/` prefix.
- **Control Panel**: an events listing with three filters, blueprint-driven publish forms for
  events and dates, an event detail screen with occurrence management, and the `view events` and
  `manage events` permissions.
- **Antlers tags** `{{ events }}`, `{{ events:occurrences }}`, `{{ events:upcoming }}`,
  `{{ events:next }}`, `{{ events:count }}`, `{{ events:feed_url }}` and `{{ events:ics_url }}`.
- **Domain events** `EventPublished`, `OccurrenceScheduled`, `OccurrenceCancelled` and
  `OccurrenceRescheduled`.
- **Optional `statamic-activity` bridge**, attached by `class_exists` and never a Composer
  requirement.

### Decisions worth recording

**Three visibility levels rather than a boolean.** `public`, `unlisted` and `private`, with the
consequences fixed per level: the feed carries public only, the per-date download serves public
and unlisted, and private never leaves the Control Panel. The refusal is a 404 rather than a 403,
because a 403 confirms that the id exists. All of it resolves through a single method, so there
is one place to get it right rather than one per tag. See [Visibility](/events/visibility).

**`status` and `visibility` are orthogonal.** The scope spec named visibility only. Publishing
turned out to be a separate question from addressability, and conflating them would have meant
either a draft that is reachable or a private event that cannot be drafted.

**Cancelling never deletes.** The row stays, keeps its UUID, takes `STATUS:CANCELLED` and a
raised `SEQUENCE`, and remains in the feed. That is the only way a subscriber's calendar learns
the appointment is off; dropping the row leaves them holding an appointment nobody will ever
contradict.

**The ICS emits UTC instants and no `VTIMEZONE`.** A `VTIMEZONE` block that disagrees with the
client's own timezone database shifts the appointment silently, and clients disagree more often
than they should. A `Z` instant has one reading, and the conversion happens in the only
participant that knows where the reader is.

**No route model binding for `{event}` or `{occurrence}`.** An implicit binding claims the
parameter name application-wide and would 404 a sibling addon's own route of the same name. The
controllers take an `int` instead. A test drives eleven generic parameter names through stand-in
sibling routes to keep it that way.

**A bare date string is read as UTC, not as the application timezone.** Guessing the app timezone
would make the same literal mean different instants on two servers, and the difference would
surface only after a deploy. A `DateTimeInterface` keeps its own zone and is converted, which is
the honest reading of "19:00 in Berlin".

**No recurrence generation.** The schema is multi-date from the first migration, so a generator
can be added without one, but building the abstraction before there was a second real series to
generate would have been the wrong order.

### Not in v1

RSVP, capacity, waiting lists, reminders, access gating, attendance, recurrence generation,
course linkage and community linkage. Named as scope rather than left to be discovered.

RSVP and waiting lists would pull Identity, Notifications and Entitlements into the first
release; reminders would pull the scheduler. The core has to carry on its own first. The stated
roadmap is **v1.1** for RSVP, capacity and waiting lists, and **v1.2** for reminders over
`statamic-notifications`.

There is deliberately **no dependency** on LeadHub, Marketing or Entitlements. A concert calendar
on an artist's website has to install without a CRM.

### Notes

- Suite: **90 tests**, green against SQLite and MySQL. The MySQL leg is not decoration: it found
  two real defects in sibling addons that a green SQLite run had missed for releases.
- Two `addon-lint` rules are downgraded to `minor` with written rationale rather than passing
  clean. `testing.addon-testcase`, because Statamic's own `AddonTestCase` cannot boot this addon:
  its `setUp()` mocks `Nav::build()` and this addon's `bootAddon()` then calls `Nav::extend()`,
  which the strict mock rejects. `ui.page-width`, because the detail screen uses core's own
  narrow-page variant and the rule reads `max-w-` literally.
- `release.screenshots` is **not** suppressed and not met. Screenshots need a browser and a
  playground install.
- The German translation is complete and was not required by the scope spec.
