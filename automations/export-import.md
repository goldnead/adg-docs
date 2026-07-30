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

Three guarantees, all of them deliberate:

- **Imports always create new automations.** Nothing is ever silently overwritten, so an
  import cannot destroy the flow somebody is running.
- **Imported automations start disabled.** You get to look at it before it acts.
- **Warnings, not failures.** A missing integration or an unknown node type is surfaced
  as a warning on an importable automation, rather than refusing the whole file.

That third one matters when moving between environments: a flow with LeadHub nodes
imports into a site without LeadHub, tells you so, and waits.

::: tip Run Validate after an import
An import warns; validation is where the warning becomes a specific, actionable list.
:::

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

::: warning This is not the same as the other addons' flat driver
In LeadHub, Marketing and Webhook Manager, `flat` is an alternative **source of truth**
and the CP writes YAML directly. Here, the database remains the engine's store and the
JSON files are synchronised with it.

Practically: `automations:sync` is a deploy step, not a live binding. Editing a JSON file
does nothing until it runs.
:::

## A deploy-time workflow

For an agency running the same flows across several sites, or for a team that wants flows
in code review:

1. Build and test the automation in the Control Panel on one environment.
2. Export it, or let file sync write it to `resources/automations/`.
3. Commit the JSON. It diffs readably: a changed destination is a changed line.
4. On deploy, run `php artisan automations:sync`.
5. Enable the automation in the target environment, deliberately.

Step 5 stays manual on purpose. An automation that enabled itself on deploy would start
acting on production data at the moment of least attention.

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
