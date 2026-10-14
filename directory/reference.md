# Reference

<AddonHeader />

## Console commands

| Command | |
| --- | --- |
| `directory:rebuild` | Rewrites the projection from the Entries. |

| Option | |
| --- | --- |
| `--collection=` | Only this profile type. |
| `--entry=` | Only this Entry id. |
| `--queue` | Dispatch the `RebuildProjection` job instead of running now. |
| `--prune` | Also delete rows whose Entry no longer exists. |

Nothing is scheduled by the addon. Entry save and delete events keep the projection current;
the rebuild is for the first run and for repair. Flat-file saves and SQL writes do not share a
transaction and there is no scheduled reconciliation, so after a failed projection update,
re-save the Entry, call `ProfileProjection::sync($entry)` or run `directory:rebuild`.

## Permissions

| Permission | |
| --- | --- |
| `view directory` | The listing, the rebuild status and the widget |
| `manage directory` | Rebuild and unbind. Child of `view directory`. |

## Public routes

| Route | |
| --- | --- |
| `GET /directory/profiles` | [Search](/directory/search). |
| `GET /directory/profiles/{entryId}` | One public profile. |
| `PATCH /directory/profiles/{entryId}` | `title`, `city`, `description`, by a member of the bound team. |

All three accept `site`, which must equal the current site.

## Control Panel routes

| Route name | |
| --- | --- |
| `directory.index` | The listing. |
| `directory.rebuild-status` | Rebuild progress. |
| `directory.rebuild` | Queue a full rebuild. |
| `directory.profiles.rebuild` | Rebuild one profile. |
| `directory.profiles.unbind` | Unbind the team. |

## Antlers

| Tag | |
| --- | --- |
| `{{ directory:search }}` | Parameters `q`, `city`, `lat`, `lng`, `radius_km`, `type`, any configured filter, `page`, `per_page`. Exposes `profiles`, `page`, `per_page`, `total`, `last_page`, `no_results`. |

## Events and the ledger

The addon dispatches no events of its own. It listens to Entry saves and deletes. With
[Activity](/activity/) installed, unbinding a team is recorded as
`directory.profile_team_unbound`.

## Tables

`directory_profiles`, the projection (including `team_id`, `legacy_id`, and one column per
filter).

## Claim adapter

`Goldnead\Directory\Claims\DirectoryClaimResource`, registered as
`teams.claims.resources.directory`. See [Claiming a profile](/directory/claiming).

## Configuration keys

See [Configuration](/directory/configuration): `collection`, `collections`, `fields`,
`filters`, `search.per_page`, `search.max_per_page`, `search.max_radius_km`.

## Personal data and deletion

The projection holds derived, public profile data plus two trusted bindings (`team_id`,
`legacy_id`), and no account data. The package ships no erasure or export contributor for
[Accounts](/accounts/). The Entry is the record: deleting it removes its row, and
`directory:rebuild --prune` removes any row left behind. Account-linked claim data lives in
Teams, see [Claims](/teams/claims#personal-data).
