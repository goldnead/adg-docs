# The current team

<AddonHeader />

Most requests in a team app are about one team. The `teams.current` middleware finds out which
one, and checks that the signed-in user is in it.

```php
Route::middleware(['auth', 'teams.current'])->group(...);                   // named team, else the user's current one
Route::middleware(['auth', 'teams.current:required'])->group(...);          // a team must be named: 422 otherwise
Route::middleware(['auth', 'teams.current', 'teams.writable'])->group(...); // 423 on writes in a read-only team
```

The team is read from these sources, all configurable under `teams.current`:

- the `X-Team-ID` header,
- `team_id` in the query or the body,
- the route parameters `{team}` and `{team_id}`,

by id or uuid. Afterwards `Teams::current()` returns the team.

| Situation | Answer |
| --- | --- |
| Two sources name different teams | 422 `team_mismatch` |
| A team the user is not in, or one that does not exist | 403 `not_member` (the same answer, so ids cannot be probed) |
| No team named, `fallback_to_current = true` (default) | the user's current team |
| No team named, `fallback_to_current = false` | no team; `Teams::currentOrFail()` answers 422 `team_required` |
| A write in a read-only team, behind `teams.writable` | 423 `read_only` |

`Teams::switch($user, $team)` sets the user's current team (`is_current` on the membership).

## An app with its own names

An app that already calls its workspaces "tenants" keeps its API as it is:

```php
// config/teams.php
'current' => [
    'header' => 'X-Tenant-ID',
    'parameter' => 'tenant_id',
    'route_parameters' => ['tenant', 'tenant_id'],
    'fallback_to_current' => false,   // no workspace named: 422
],
'meta_labels' => ['voice_part' => 'Voice part'],
```

[App API](/app-api/) reads the same header unless its own `teams.header` says otherwise.
