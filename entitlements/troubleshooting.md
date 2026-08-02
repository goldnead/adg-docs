# Troubleshooting

<AddonHeader />

## `composer require goldnead/statamic-entitlements` cannot find the package

It is not on Packagist and has no tag. Install from a checkout with a path or VCS repository. See
[Installation](/entitlements/installation).

## `EntitlementGranted` never fires for a scheduled grant

The announcement pass is not running. The package registers **no** scheduled task, unlike most of
the suite.

```php
Schedule::command('entitlements:announce')->everyFifteenMinutes();
```

Two of the six states are derived from the clock, so nothing writes to the database when a
scheduled grant becomes active. The pass is what turns that into an event.

Access itself is unaffected: `state()` reads the clock directly, so the grant is already usable.
What is missing is the event, and anything you hung off it.

## `EntitlementExpired` never fires either

Same cause, same fix. Both clock-driven transitions come from the same pass.

## The pass runs and announces nothing

Three things to check:

1. **Is there anything to announce?** A grant already carrying `announced_state = 'active'` has been
   reported. The claim is a conditional update, so a second pass announces nothing by design.
2. **Multi-brand.** The pass walks every brand in turn. If you are running it inside a brand context
   that has no grants, it will report zero. `--brand` narrows it deliberately; omitting it does not.
3. **`--limit`.** The default is 1000 per brand. A large backlog drains over several runs.

## A grant reads as expired and it has not started yet

That is what this package exists to fix, so if you are seeing it, check which value you are reading.

```php
$entitlement->status;    // wrong: what was last written
$entitlement->state();   // right: what is true now
```

`Scheduled` and `Expired` are never stored. Branching on `status` gets both of them wrong, and
reporting a not-yet-started grant as expired is exactly the defect the extracted system had on its
customer account screen.

The Control Panel listing shows the resolved state for the same reason.

## `allows()` is false and the grant looks fine

Walk the resolver's branch order:

1. **`revoked_at` set, or `status = 'revoked'`?** Either one answers revoked. The two do not have to
   agree, and the package deliberately does not enforce that they do.
2. **`status = 'pending'`?** A pending grant grants nothing until `claimPending()` wins.
3. **`status = 'grace_period'` with a `grace_until` in the past, or null?** Both resolve to expired.
   A grace period with no `grace_until` is not an unbounded grace.
4. **`starts_at` in the future?** Scheduled.
5. **`expires_at` at or before now?** Expired. The comparison is `<=`: the instant of expiry is
   already outside.
6. **Wrong brand?** Every read is brand-scoped.
7. **Wrong subject?** `user:17` and `contact:17` are two different subjects.

```php
$decision = Entitlements::decide($user, 'stimmbeherrschung');
$decision->state;        // the state that decided it
$decision->entitlement;  // the closest grant, on a refusal
```

## A repeated grant did not extend the window

Correct. `grant()` **never widens an existing window**, and a second call with a later `expiresAt`
returns the row unchanged.

Extending is a different intention from granting. Write it explicitly, or revoke and grant afresh
with a new `source_ref`.

## A repeated grant did not resurrect a revoked one

Also correct, and deliberate. A revoked grant stays revoked and nothing fires.

```php
Entitlements::restore($entitlement);
```

Restoring is a separate decision with a separate permission. A webhook replaying an old order must
not undo a refund.

## `restore()` returned true and the person still has no access

The window closed while the grant was revoked, so it now resolves to `Expired`. The restore
succeeded and there was nothing left to restore.

Nothing is announced in that case either, which is correct.

## Two rows appeared for what looks like the same grant

Check the whole tuple. Six columns make a grant unique:

```
subject_type, subject_id, product_slug, source, source_ref, brand_id
```

Common causes, all intended:

| Difference | Result |
| --- | --- |
| A new `source_ref` | A second row. A repeat purchase is a second grant |
| A different `source` | A second row |
| A different brand | A second row |
| A different `subject_type` for the same id | A second subject entirely |

If none of those differ, the constraint would have refused the insert, so something differs.

## `UniqueConstraintViolationException` reached my code

The manager catches it and re-reads the winner's row, so `grant()` never surfaces it. If you are
seeing it, you are writing to the model or the query builder directly, which bypasses that recovery.

Go through the facade.

## A revocation threw

```
InvalidArgumentException: A revocation needs a reason.
```

The reason is mandatory and is trimmed before it is checked, so whitespace does not count. A
revocation nobody can explain later is not auditable.

## A superuser cannot access a product

By design, and a test asserts it. There is no `SUPER_USER` short-circuit and no config key to add
one. Access is a property of grants, not of the person asking.

If your application wants an override, put it in your application where it is visible.

## A bundle does not grant access to its parts

`PackageResolver` is not bound. The default returns an empty array, so bundles do not exist until
you bind one.

See [Extending](/entitlements/extending#packageresolver).

## Every grant lost its subject after a refactor

`subject_type` stores whatever `getMorphClass()` returned at write time. With no morph map that is
the fully qualified class name, so renaming or moving the class orphans every grant pointing at it.

```php
Relation::morphMap([
    'user' => \App\Models\User::class,
]);
```

Set one up before you have many rows. Afterwards it is a data migration.

## Deleting a user left their grants behind

There are **no foreign keys** in this package, so nothing cascades. That is deliberate: the subject
may live in a table this installation does not have, and a foreign key to a table that may not exist
is not a constraint, it is an install failure.

Cleaning up is your application's decision, because "the user is gone" and "the entitlement is void"
are not the same statement in every business.

## The Control Panel nav entry is missing

Either the user lacks `view entitlements`, or `entitlements.cp.enabled` is `false`. With the kill
switch off the routes are not registered either, so the screens are not reachable by URL.

If the route cache is stale, `php artisan route:clear`. The switch is read at boot and freezes into
a cached route table.

## An editor can grant but not revoke

Intended. `grant entitlements` and `revoke entitlements` are separate children of
`view entitlements`, and both are tested in both directions.

Note that **restoring needs `grant entitlements`**, not the revoke permission. Restoring is
granting.

## The grant form ignored the source I typed

There is no source field on the form, and `entitlements.manual.source` is written regardless.

A grant an administrator typed in is a manual grant. Letting a form claim it came from a payment
provider would put unverifiable provenance into the audit trail.

## A typo in a subject type created a grant belonging to nobody

`subject_types` is empty, so the form accepts free text.

```php
'manual' => [
    'subject_types' => [
        'user' => 'User',
        'contact' => 'CRM contact',
    ],
],
```

Fill it in and the field becomes a select. Empty is right for a first install and wrong for a large
one.

## Activity records nothing

Three conditions: `goldnead/statamic-activity` is installed, `entitlements.bridges.activity` is not
`false`, and the bridge attached.

The bridge swallows its own errors and reports them, so a failing ledger never fails the grant. Look
in your error reporting rather than at the response.

`attach()` never caches a negative answer, so a bridge declined early in the boot cycle can still
attach later.

## There is no `config/entitlements.php` after publishing

There is no config publish tag. Create the file yourself and set only the keys you want. The merge
is shallow, so a group you redeclare must carry all of its keys.
