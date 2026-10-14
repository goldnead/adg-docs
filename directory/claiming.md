# Claiming a profile

<AddonHeader />

A team can take over a profile it is the rightful owner of, a choir its director leads, for
example. The directory does not run that process. [Teams](/teams/claims) does: it takes the
request, applies limits, lets a moderator decide and creates the team. The directory supplies
the one piece Teams cannot know, how to bind a profile.

## The adapter

`Goldnead\Directory\Claims\DirectoryClaimResource` implements the Teams `ClaimResource`
contract. Register it under the resource type `directory`:

```php
// config/teams.php
'claims' => [
    'resources' => [
        'directory' => \Goldnead\Directory\Claims\DirectoryClaimResource::class,
    ],
    // plus a policy: see Teams
],
```

It binds only a profile that is:

- **unbound** (`team_id` is empty),
- **not hidden**,
- on the **current Statamic site**,
- and whose canonical Entry still exists in one of the configured collections.

A private imported draft *may* be claimed. The adapter does not publish the Entry and does not
modify its fields. The team is named after the profile's title; an empty title or one longer
than 255 characters makes the profile unavailable for claiming.

Teams owns who may request, who may review and the surrounding transaction. The adapter locks
the row, so two approvals for the same profile cannot both win.

## What the binding is

`team_id` and `legacy_id` are **trusted bindings** in the projection table. Entry sync never
changes them, and neither does a rebuild. Two consequences:

- **A database restore must keep them**, or re-import them. They exist nowhere else.
- **To release a profile**, use *Unbind team* in the [Control Panel](/directory/control-panel#actions).
  It clears `team_id` so the profile can be claimed again, and writes the log and, with
  [Activity](/activity/) installed, an `directory.profile_team_unbound` entry.

## What the directory does not do

There is no public create, claim or bind endpoint. After a claim is approved, members of the
team edit the profile through the `PATCH` route when `Teams::can($actor, $team, 'update team')`
holds. No existing legacy dataset is read by this addon.
