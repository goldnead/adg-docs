# Configuration

<AddonHeader />

::: warning There is no config publish tag
`entitlements-migrations` and `entitlements-translations` are the only two. The config is merged
and never published, so the file in the package is the source of the defaults.

Override individual keys by creating `config/entitlements.php` yourself, or set them from a service
provider. The merge is shallow, so a partial file that redeclares `cp` must carry both of its keys.
:::

Four groups, and **no key reads an environment variable**. There is not a single `env()` call in the
config file.

```php
// config/entitlements.php

return [
    'cp' => [...],
    'sources' => [...],
    'manual' => [...],
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

`enabled` is a kill switch that bites in two places: the navigation entry is not created, and the
route file returns before registering anything. Zero routes, not seven hidden ones.

Use it where grants are written only by integrations. The facade, the command and the events are
unaffected.

`per_page` is the default listing page size. A request may ask for more and is clamped at **500**.

## `sources`

```php
'sources' => [
    'manual' => 'Manual grant',
],
```

**Display names only, and never a whitelist.** An unregistered source writes, resolves and grants
access exactly like a registered one; it just shows its raw handle in the Control Panel.

An enum was considered and rejected. Sources differ per project, and a package that refused an
unknown source would refuse the integration a consumer wrote last week.

Add the ones your site uses:

```php
'sources' => [
    'manual' => 'Manual grant',
    'thrivecart' => 'ThriveCart',
    'lead-magnet' => 'Lead magnet',
    'import' => 'Migrated from the old system',
],
```

The Control Panel's source filter offers the registry **plus** any source actually present in the
data, so a source you forgot to register is still filterable.

Keep `manual`. It is what the Control Panel grant form always writes.

## `manual`

```php
'manual' => [
    'source' => 'manual',
    'subject_types' => [],
],
```

`source` is the source the Control Panel grant form writes. **Always**, whatever the form contains:
the form has no source field, and a posted one is ignored. A grant an administrator typed in is a
manual grant, and letting the form claim otherwise would put unverifiable provenance into the
audit trail.

`subject_types` is the list of morph types the form offers.

| Value | Form field |
| --- | --- |
| `[]` | Free text |
| A non-empty map | A `select`, not clearable |

Empty is right for a first install and wrong for a large one. A typo in a morph type produces a
grant that belongs to nobody, and it is found by somebody complaining rather than by anything in
this package.

```php
'subject_types' => [
    'user' => 'User',
    'contact' => 'CRM contact',
],
```

Fill it in as soon as you know which types you use.

## `bridges`

```php
'bridges' => [
    'activity' => true,
],
```

One key, and it is a switch rather than a requirement. The bridge attaches only when
[Activity](/activity/) is actually installed, decided with `class_exists()`. Setting this to `false`
declines it even where the sibling is present.

There is no `bridges.leadhub` and no `bridges.automations`, because neither bridge exists. See
[Extending](/entitlements/extending#automations).

The package must be fully functional with no bridge at all, and a test asserts exactly that:
granting, resolving, deciding, revoking, the announcement pass and the Control Panel listing all
work with the bridge off.

## The scheduled command is your responsibility

Not a config key, and the most consequential piece of setup:

```php
Schedule::command('entitlements:announce')->everyFifteenMinutes();
```

The package registers no scheduled task. Without this, access is still resolved correctly and the
two clock-driven events never fire. See
[Installation](/entitlements/installation#the-scheduler-is-not-optional-here).

```
--limit=1000    Maximum transitions announced per brand per run
--brand=        Restrict the pass to one brand
```

`--limit` bounds one run and the remainder is picked up next time, so a large backlog is drained
across several passes rather than in one long transaction.

## What is not configurable

- **The table name.** Hard-coded `entitlements`. The extraction spec asked for a prefix option and
  it was not built.
- **The unique index.** Its columns are the idempotency guarantee and are not a setting.
- **Timezone.** Everything is UTC, stored and displayed.
- **Whether a revocation needs a reason.** It always does.
- **Whether a superuser bypasses a check.** No, and there is no key to change it.
