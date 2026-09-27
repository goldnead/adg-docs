# Export, import & file sync

<AddonHeader />

Every automation can be exported to a portable, schema-versioned JSON file and
re-imported in any environment.

## Export

From the builder's topbar, or over the API:

```
GET /cp/automations/api/automations/{id}/export
```

The file is schema-versioned, which is what makes it safe to import into a later release
of the addon: an older schema is upgraded on the way in rather than rejected.

## Import

Drop a JSON file on `/cp/automations/import`.

Three guarantees for the default import, all of them deliberate:

- **An import creates a new automation.** Nothing is ever silently overwritten, so an
  import cannot destroy the flow somebody is running. A handle that is taken gets a
  short suffix.
- **Imported automations start disabled.** You get to look at it before it acts.
- **Warnings, not failures.** A missing integration or an unknown node type is surfaced
  as a warning on an importable automation, rather than refusing the whole file.

That third one matters when moving between environments: a flow with LeadHub nodes
imports into a site without LeadHub, tells you so, and waits.

::: tip Run Validate after an import
An import warns; validation is where the warning becomes a specific, actionable list.
:::

### Updating an existing automation <Badge type="tip" text="2.23.0" /> {#updating-an-existing-automation}

To change a live automation from a file instead of adding a copy, switch on **Update the
automation with the same handle** on the Import page. The same is strategy `update` on
the API (`"handle_strategy": "update"`) and on the command line
(`automations:sync --strategy=update`).

- The automation with the file's handle gets the file's name, description, nodes and
  edges. Its id, uuid, handle, enabled state and run history stay.
- The graph before the import is saved as a revision, so it is one click away under
  [Version history](/automations/building#version-history).
- Nodes whose `node_key` survives keep their uuid.
- Without an automation of that handle, one is created, as in the default import.
- A file that says what the automation already holds (order of nodes, edges and config
  keys aside) writes nothing: no revision, no audit entry, no version bump. The API
  answers `meta.unchanged: true` and the sync command prints `(unchanged)`, so `--watch`
  does not pile up revisions.

Over the API it needs the `edit automations` permission in addition to
`create automations`, and answers `200` with `meta.updated: true`.

The default stays as it was: a new, disabled automation with a suffixed handle.

## What is in the file, and what is not

The file contains the graph: nodes, their config, their connections, and the trigger.

The file does **not** contain runs, and it does not contain anything from your
environment. Which means a literal API key typed into a node's config **does** travel
with the export, into whatever repository or ticket the file ends up in.

Use the secret store instead:

```php
// config/automations.php
'secrets' => [
    'slack_webhook' => env('SLACK_WEBHOOK_URL'),
],
```

```
{{ secret.slack_webhook }}
```

Now the export references a name and the value stays in the environment. This is the
main reason the secret store exists.

## File sync

Automations can be stored as JSON under `resources/automations/{handle}.json` for
Git-based versioning:

```php
'storage' => [
    'driver' => env('STATAMIC_AUTOMATIONS_STORAGE', 'database'),  // database | flat_file
    'flat_file' => [
        'path' => env('STATAMIC_AUTOMATIONS_DEFINITIONS_PATH', null),
    ],
],
'file_storage' => [
    'enabled' => true,
    'path' => env('STATAMIC_AUTOMATIONS_FILE_PATH', null),
],
```

```bash
php artisan automations:sync
```

An unset or empty `file_storage.path` (the default) means `resource_path('automations')`.
A path that is only `/` is refused with an error.

::: warning Before 2.23.0 the default path wrote to `/`
`file_storage.path` ships as `null`, and Laravel's `config($key, $default)` does not fall
back on null, so *Sync to file* and `automations:sync --from=db` wrote `/{handle}.json`,
or failed on permissions. If you set the path explicitly as a workaround, it keeps
working.
:::

When a file and an automation share a handle, `--strategy` decides:

| Strategy | Effect |
| --- | --- |
| `db_wins` (default) | The automation stays, the file is ignored |
| `update` | The automation is [updated in place](#updating-an-existing-automation) from the file |
| `file_wins` | The automation is deleted and recreated from the file, disabled, with a new id and uuid |

`file_wins` is destructive, for a fresh deploy. For a deploy that should change live
automations, use `update`.

::: warning This is not the same as the other addons' flat driver
In LeadHub, Marketing and Webhook Manager, `flat` is an alternative **source of truth**
and the CP writes YAML directly. Here, the database remains the engine's store and the
JSON files are synchronised with it.

Practically: `automations:sync` is a deploy step, not a live binding. Editing a JSON file
does nothing until it runs.
:::

::: warning One folder cannot hold two brands
`resources/automations/` is a flat directory of `{handle}.json`, and handles are unique
**per brand** — two brands may each own a `welcome-flow`.

So on a multi-brand install the command **requires `--brand`** and refuses without it,
rather than having one brand's export overwrite another's:

```bash
php artisan automations:sync --from=db --brand=acme
```

Run it once per brand with `automations.file_storage.path` pointed at a directory of its
own. Single-brand installs need none of this.

Before **1.7.1** the command took no brand at all. Worse than a no-op: `detectDirection()`
asks whether the database holds any automations, the fail-closed scope answered "none", and
a bare run could import the files over automations it could not see.
:::

## A deploy-time workflow

For an agency running the same flows across several sites, or for a team that wants flows
in code review:

1. Build and test the automation in the Control Panel on one environment.
2. Export it, or let file sync write it to `resources/automations/`.
3. Commit the JSON. It diffs readably: a changed destination is a changed line.
4. On deploy, run `php artisan automations:sync --from=files --strategy=update`.
5. Enable the automation in the target environment, deliberately.

Step 5 stays manual on purpose. An automation that enabled itself on deploy would start
acting on production data at the moment of least attention. With `update`, an automation
that is already enabled stays enabled, and its runs and history stay attached.

## Cross-environment moves

The common case is staging to production, and the thing that bites is that ids do not
travel. A node configured with an entry id, a form handle that differs, or a Webhook
Manager destination that exists only on staging will import cleanly and then fail at run
time.

So after importing into production:

- **Validate.**
- Check every node whose config names something environment-specific: entry ids, global
  set handles, Webhook Manager destinations, LeadHub tags.
- **Test** before enabling. Test mode performs no real side effects, which is exactly
  what you want on the first run in a new environment.

## Turning it off

```php
'features' => [
    'export_import' => false,
    'file_storage' => false,
],
```

Reasonable on a site where flows should only ever be built in the CP, and where a
dropped-in JSON file would be an unreviewed change.
