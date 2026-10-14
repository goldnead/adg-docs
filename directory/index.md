# Directory

<AddonHeader />

A public, searchable directory of profiles. The profiles stay what they always were, Statamic
entries you edit in the Control Panel. The addon keeps a **disposable SQL projection** of them
next to the entries, so a visitor can search by text, city or radius without Statamic reading
every entry on each request.

It is built for a choir directory, but nothing in it says "choir": the collection handles, the
field names and the filters are configuration.

## What it is

- **A public search** by text, city and exact filters, with radius search around a point,
  sorted by distance. See [Searching profiles](/directory/search).
- **A projection that can always be rebuilt.** Title, city, description, visibility, hidden
  state, publication and coordinates are derived from the entries. Saving or deleting an entry
  updates or removes its row; `php artisan directory:rebuild` rewrites all of them. See
  [The Control Panel](/directory/control-panel).
- **More than one profile type.** Several collections can be searched side by side, each with
  its own field mapping and filters. See [Profile types](/directory/types).
- **Edits by an authorised team member**, through `PATCH /directory/profiles/{entryId}`, for
  title, city and description only.
- **A claim adapter for Teams.** A team can claim an unbound profile; Teams owns the review and
  the transaction, the directory binds the profile. See [Claiming a profile](/directory/claiming).
- **A Control Panel listing** of the projected profiles, with rebuild and unbind actions and a
  dashboard widget.

## What it is not

- **Not a place to create or claim profiles.** There is no public create, claim or bind
  endpoint. Binding belongs to the claim lifecycle in [Teams](/teams/).
- **Not a map.** Map display is not part of this release.
- **Not a source of truth.** The entry is. The projection holds a copy, and the only columns
  that live in the SQL table alone are `team_id` and `legacy_id`.
- **Not a leak of contact data.** Public responses carry title, city and description, plus the
  type and, for a location search, the distance. Never an email address, evidence, a user id, or
  a team or legacy binding.

## How it fits

```
Entry saved or deleted → projection row updated or removed
Visitor → GET /directory/profiles?q=…&lat=…&lng=…&radius_km=…
          → candidates from the index
          → each one re-checked against the current Entry
          → whitelisted fields only

Team claim approved (Teams) → DirectoryClaimResource binds team_id
Member of the bound team    → PATCH /directory/profiles/{entryId}
                              (Teams::can($actor, $team, 'update team'))
```

## Next

- [Installation](/directory/installation)
- [Configuration](/directory/configuration)
- [Searching profiles](/directory/search)
- [Profile types](/directory/types)
- [Claiming a profile](/directory/claiming)
- [The Control Panel](/directory/control-panel)
- [Reference](/directory/reference): routes, command, permissions, tables
