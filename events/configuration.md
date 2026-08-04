# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=events-config
```

Four groups. **No key reads an environment variable**: there is not a single `env()` call in the
config file. If you want an event calendar to differ between staging and production, that is a
published config file and a deployment decision, not a `.env` line.

```php
// config/events.php

return [
    'cp' => [...],
    'defaults' => [...],
    'types' => [...],
    'feeds' => [...],
    'bridges' => [...],
];
```

## `cp`

```php
'cp' => [
    'enabled' => true,
    'per_page' => 50,
],
```

`enabled` is a kill switch that bites in two places: the navigation entry is not created, and
`routes/cp.php` returns before registering anything. Zero routes, not thirteen hidden ones.

Use it on an installation that manages events through the API or a console command and does not
want editors touching them. The two public ICS routes stay up either way.

`per_page` is the default page size of the listing. A request may ask for more and is clamped at
**500**.

## `defaults`

```php
'defaults' => [
    'timezone' => null,
    'visibility' => 'public',
],
```

`timezone` is the IANA identifier a new event starts with. `null` falls back to
`config('app.timezone')`, and then to `UTC`. An occurrence may override it per date, which is
what a tour needs.

`visibility` is what the create form pre-selects. It does not constrain anything: the field is
still there and still editable.

::: warning `defaults.visibility` is the value a hurried editor will ship
`public` is the honest default for a package whose job is publishing a calendar. On an
installation where most events are internal, set it to `private` and let the editor widen it
deliberately. The failure directions are not symmetrical.
:::

## `types`

```php
'types' => [
    'workshop' => 'Workshop',
    'masterclass' => 'Masterclass',
    'concert' => 'Concert',
    'rehearsal' => 'Rehearsal',
    'course_session' => 'Course session',
    'other' => 'Other',
],
```

The option list the Control Panel offers. The stored column is a **free string**, not an enum
and not a foreign key, so removing a type here never orphans an existing event: it only stops
being offered to new ones.

Opening an event whose type is no longer in the list adds that value back to the select for
that one form, so saving an unrelated field does not silently rewrite the type.

`{{ events type="concert" }}` matches on the stored string, so a type you have removed from the
config is still queryable.

## `feeds`

```php
'feeds' => [
    'enabled' => true,
    'name' => null,
    'past_days' => 1,
    'max_occurrences' => 500,
    'cache_seconds' => 300,
],
```

| Key | Meaning |
| --- | --- |
| `enabled` | `false` makes `/!/events/calendar.ics` answer 404. The per-date download is unaffected |
| `name` | Becomes `X-WR-CALNAME`. Null falls back to `config('app.name')` |
| `past_days` | How far back the feed reaches. A just-finished date should not vanish mid-day |
| `max_occurrences` | Caps one feed response |
| `cache_seconds` | Sent as `Cache-Control: public, max-age=…` |

`max_occurrences` is not a tuning knob. The feed is a public, unauthenticated endpoint, and
without a cap one query can be made arbitrarily expensive from the outside.

`past_days` bounds the past only. Nothing bounds the future, because a feed that dropped next
year's dates would be wrong rather than merely small.

## `bridges`

```php
'bridges' => [
    'activity' => true,
],
```

One key, and it is a switch rather than a requirement. The bridge attaches only when
`goldnead/statamic-activity` is actually installed, decided with `class_exists()`. Setting this
to `false` declines the bridge even where the sibling is present.

There is no `bridges.notifications` and no `bridges.automations`. Automations reacts to the four
domain events through Laravel's dispatcher without anything in this package, and reminders are
not built. See [Extending](/events/extending).

## The route prefix is not configurable

`/!/events/` is fixed, and that is a decision rather than an omission. A calendar subscription
URL is pasted into a phone once and then never looked at again; a host that could move the
prefix could break every subscription it had ever handed out, months later, from a config file.

`!/` is Statamic's convention for a route that belongs to the system rather than to the content
tree.
