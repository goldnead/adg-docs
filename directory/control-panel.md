# The Control Panel

<AddonHeader />

A **Directory** item in the **Tools** section of the navigation. Its strings are English with a
German translation.

## The listing

Core's native listing of the projected profiles of every configured type.

| | |
| --- | --- |
| Columns | title, type, city, visibility, hidden, team bound, coordinates, last synced |
| Search | title and city |
| Filters | type, visibility, hidden, team bound, has coordinates |

A title links to the canonical Entry edit screen: that is where you change a profile. The
listing is a view of the projection, not an editor.

## Actions {#actions}

| Action | Where | Permission |
| --- | --- | --- |
| **Rebuild projection** | header button | `manage directory` |
| Rebuild one profile | row action | `manage directory` |
| **Unbind team** | row action, destructive, asks for confirmation | `manage directory` |

**Rebuild** queues the `RebuildProjection` job for all entries. The page shows queued, running
(with progress) and finished, and refreshes itself while a job runs. Only one rebuild runs at a
time.

**Unbind team** clears `team_id` so the profile can be [claimed](/directory/claiming) again. It
is written to the log and, when `goldnead/statamic-activity` is installed, to the activity
ledger as `directory.profile_team_unbound`.

## Permissions

| Permission | |
| --- | --- |
| `view directory` | The listing, the status and the widget |
| `manage directory` | The actions above. A child of `view directory`. |

Without them the Control Panel answers 403 for JSON requests and redirects to the dashboard with
an error for HTML ones.

## The widget

A dashboard widget `directory`. Add it under `widgets` in `config/statamic/cp.php`, or from the
dashboard. For each type it shows the total, the public and the private profiles, and the
profiles without coordinates.

## On the command line

```bash
php artisan directory:rebuild                      # all types, synchronous
php artisan directory:rebuild --collection=leaders
php artisan directory:rebuild --entry=<id>
php artisan directory:rebuild --queue              # as a queued job
php artisan directory:rebuild --prune              # also drop rows whose Entry is gone
```

A rebuild only rewrites derived columns. `team_id` and `legacy_id` are never touched.
