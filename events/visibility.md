# Visibility

<AddonHeader />

Three levels, and the difference between them is who can reach a date from outside the Control
Panel. This is the one page in this documentation where a misunderstanding is a disclosure, so
it states the consequences per level rather than describing the intent.

```php
Visibility::Public    // 'public'
Visibility::Unlisted  // 'unlisted'
Visibility::Private   // 'private'
```

## The three levels

| Level | Calendar feed | Per-date ICS download | Antlers tags | Control Panel |
| --- | --- | --- | --- | --- |
| `public` | Listed | Served | Listed by default | Visible |
| `unlisted` | **Never listed** | Served to anyone holding the UUID | Only with `listable="false"` | Visible |
| `private` | **Never listed** | **404** | **Never** | Visible |

**A private event never leaves the Control Panel.** Not through the feed, not through a tag, not
with the UUID in hand, not with any tag parameter. There is no parameter that reaches one, and
`Event::scopePublished()`, the scope that would ignore visibility, is called from no front-end
path at all.

`unlisted` is the middle that actually behaves like a middle: the UUID is the capability. Anyone
who has the link can open the ICS; nobody discovers it by reading a feed. Use it for a date you
send to a specific group and do not want on the public calendar.

## Status is the other half

`visibility` and `status` are separate columns and neither implies the other. A draft event is
Control Panel only whatever its visibility, and publishing does not widen a private event.

Both conditions are checked together in two methods on the model:

```php
public function isPubliclyReadable(): bool   // isPublished() && visibility->isAddressable()
public function isListable(): bool           // isPublished() && visibility->isListable()
```

`isAddressable()` is "not private". `isListable()` is "public". That is the whole vocabulary,
and every query in the package resolves to one of the two.

## Where the rules actually live

In exactly one place. `EventManager::constrainEvents()` holds the visibility clause, and every
tag, both public routes and the manager's own query builders go through it:

```php
($filters['listable'] ?? false) ? $events->listable() : $events->addressable();
```

The two scopes it chooses between:

```php
scopeListable(Builder $query)     // where status = 'published' and visibility = 'public'
scopeAddressable(Builder $query)  // where status = 'published' and visibility != 'private'
```

Nothing bypasses this on a public path. The relation to occurrences is expressed as a
`whereHas()` subquery rather than a join, deliberately, so the brand scope on both models keeps
applying: a join would let a caller widen it by accident.

## The feed is public only, and cannot be widened

`EventManager::feed()` hard-sets `listable => true` over whatever the caller passed. The `type`
parameter on the feed URL is applied **inside** the same constraint, after the visibility
clause, so it can narrow the feed and can never widen it.

```
/!/events/calendar.ics                  every listable date
/!/events/calendar.ics?type=concert     the concerts among them
```

There is no parameter that adds unlisted or private events to a feed, and none is planned. A
feed URL is handed to strangers by design.

## The per-date download is a 404, not a 403

```php
abort_unless($occurrence && $occurrence->event?->isPubliclyReadable(), 404);
```

Four cases answer identically:

| Request | Response |
| --- | --- |
| Published public date | 200, ICS body |
| Published unlisted date | 200, ICS body |
| Private date, any status | 404 |
| Draft date, any visibility | 404 |
| Unknown UUID | 404 |

**404 rather than 403 is the point.** A 403 says "this exists and you may not have it", which
tells an enumerator that the id was right. The route matches only a well-formed UUID
(`[0-9a-fA-F-]{36}`), so guessing is the only attack available and it must not be given a
signal.

## In templates

```antlers
{{# Published public events. The default. #}}
{{ events }}
    {{ title }}
{{ /events }}

{{# Published events that are not private: adds unlisted #}}
{{ events listable="false" }}
    {{ title }}
{{ /events }}
```

`listable="false"` is for the page that **already knows which event it is showing**, typically a
detail page reached from a link you sent. It is not for an index.

::: danger The README's prose line is wrong here
`README.md` describes `{{ events }}` as "published and non-private only". It is not: with the
default `listable="true"` the tag lists **published public events only**, and unlisted ones are
excluded. The parameter table three lines below the same sentence states it correctly. Trust the
table and this page.
:::

Templates can read the value:

```antlers
{{ events listable="false" }}
    {{ title }} {{ if visibility == "unlisted" }}(by invitation){{ /if }}
{{ /events }}
```

## The Control Panel applies no visibility filter

By design. The listing starts from every event in the brand and is gated by the `view events`
permission alone. Visibility is a **column**, a sortable field and an optional filter an editor
can apply, never a constraint applied for them.

One consequence worth knowing: the event detail screen prints an `ics_url` for every date,
including dates of private and draft events. The link is rendered in the Control Panel and the
public route 404s it. That is correct rather than broken, but it does mean a Control Panel link
is not proof that the URL works for a visitor.

## What visibility is not

It is **not access control for a person**. There is no per-user, per-role or per-entitlement
gating in v1, and `access gating` is named in the out-of-scope list. Visibility answers "is this
addressable from outside", once, for everybody.

If you need "these people may see this date and those may not", that is an entitlements
question, not a visibility question, and this package does not answer it.
