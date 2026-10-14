# Searching profiles

<AddonHeader />

There are three ways in, and they share one search: the JSON route, the Antlers tag, and
`ProfileSearch` underneath both.

## What is public

A profile appears in a public response only when **all** of these hold:

- the Entry is published,
- its `visibility` field is `public`,
- its `hidden` field is false.

Every read re-checks the canonical Entry and returns its *current* whitelisted content. A stale
projection row therefore fails closed (a profile that went private disappears at once) or stays
current (a title you just edited is already the new one), even before the projection has caught up.

Public responses contain title, city, description and the profile `type`. For a location search
they also carry `distance_km`. Email addresses, evidence, user ids and the team and legacy
bindings are never returned.

## The site

Rows are scoped by Statamic site. A request uses the current site; an optional `site` query
parameter must match it. Any other configured site answers 404, which keeps a public host from
querying the profiles of an internal site.

## The route

```
GET /directory/profiles?q=…&city=…&lat=…&lng=…&radius_km=…&page=…&per_page=…&site=…
```

Returns `{ "data": [...], "meta": { "page", "per_page", "total", "last_page" } }`.

| Parameter | |
| --- | --- |
| `q` | Matches title or city. |
| `city` | Exact match on the city. |
| `lat`, `lng`, `radius_km` | Radius search. A bounding box narrows the candidates in SQL, the exact Haversine distance is computed in PHP. Results are sorted by distance and carry `distance_km`. `radius_km` is capped by `directory.search.max_radius_km` (default 500). |
| `lat`, `lng` alone | Sorts by distance without limiting the radius. |
| filters | Any key of [`directory.filters`](/directory/configuration#filters), for example `choir_type`. Exact match on an indexed column. |
| `type` | Which [profile type](/directory/types) to search. Without it the first configured collection is searched. |
| `page`, `per_page` | Defaults `1` and `20`; `per_page` is capped at 50. |

Profiles without valid coordinates are left out of every location search.

**A page can be shorter than `per_page`.** Pages are cut from the index and then re-checked
against the current Entry, so a row whose Entry went private in the meantime is dropped after
the page was cut.

## One profile

```
GET /directory/profiles/{entryId}?site=…
```

Returns `{ "data": {...} }`, or 404 when the profile is not public.

## Editing a profile

```
PATCH /directory/profiles/{entryId}?site=…
```

Accepts `title`, `city` and `description`, from an authenticated member of the profile's bound
team, when `Teams::can($actor, $team, 'update team')` is true. A body that names a protected
field (`team_id`, `hidden`, `visibility`, owner or user ids, email, `evidence`, `legacy_id`)
is refused with 422, and so is a body with none of the three editable fields. Without a login,
or without the permission, the answer is 403. The change is written to the Entry; the
projection follows from the save.

A profile with no team bound cannot be edited this way (403). Binding is
[the claim lifecycle's](/directory/claiming) job.

## The tag

```antlers
{{ directory:search lat="52.5" lng="13.4" radius_km="30" q="" city="" choir_type="" page="1" per_page="20" }}
  {{ profiles }}
    <h3>{{ title }}</h3>
    <p>{{ city }} {{ distance_km }}</p>
  {{ /profiles }}
  {{ if no_results }}Nothing found.{{ /if }}
{{ /directory:search }}
```

Inside the tag you get `profiles`, `page`, `per_page`, `total`, `last_page` and `no_results`.
Invalid parameters give `no_results` rather than an error. `type="leaders"` picks a
[profile type](/directory/types).
