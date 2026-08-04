# Installation

<AddonHeader />

<Requirements php="8.2+" statamic="6.0+" laravel="12.40+ / 13.x" database="MySQL or SQLite" queue="Scheduler required" />

::: danger `composer require goldnead/statamic-entitlements` does not work today
The package has **no git tag and is not on Packagist**. There is no version to resolve.
:::

## From a checkout

```bash
git clone git@github.com:goldnead/statamic-entitlements.git ../statamic-entitlements
```

```json
{
  "repositories": [
    { "type": "path", "url": "../statamic-entitlements" }
  ]
}
```

```bash
composer require goldnead/statamic-entitlements:@dev
php artisan migrate
```

A path repository resolves only on a machine that has the sibling directory, which excludes every
Docker build and every deploy. That is the cost of an untagged package.

The Control Panel bundle **is** committed to this repository, so a checkout install has working
Control Panel assets. That is not true of every addon in the suite.

## What comes with it

Two hard requirements, both pulled automatically:

| Package | Constraint | Why |
| --- | --- | --- |
| `goldnead/statamic-brand-context` | `^1.0` | Every grant carries a `brand_id`, and the announcement pass runs per brand |
| `goldnead/statamic-identity-contracts` | `^1.0` | The actor on a grant or a revocation is an `Identity`, never your `User` model |

`statamic/cms ^6.0` and `laravel/framework ^12.40|^13.0` are in `require` as well.

Three suggestions:

```
goldnead/statamic-activity      grants, revocations and expiries on the ledger
goldnead/statamic-leadhub       a CRM contact as the subject of a grant
goldnead/statamic-automations   the four events as workflow triggers (planned)
```

::: warning Only the first has code
There is **no LeadHub bridge**, no `class_exists()` check and no LeadHub code anywhere in the
package. A CRM contact can be the subject of a grant because `subject_type` and `subject_id` are
polymorphic strings, which needs no addon at all. The suggestion is misleading and the capability is
real.

Automations is marked planned and is not built. It can already trigger on the four events through
Laravel's dispatcher.
:::

## Migrations

One, loaded automatically. `php artisan migrate` after install is enough.

```
2026_08_03_000001_create_entitlements_table
```

It creates the table **and** the unique index in the same migration, deliberately: an idempotency
constraint added later is a constraint that has to be reconciled with the duplicates that
accumulated before it.

On MySQL and MariaDB the unique index is created with a raw statement carrying prefix lengths,
because Laravel's schema builder cannot express them. Other engines take the portable path. See
[Reference](/entitlements/reference#the-unique-index).

**There are no foreign keys.** Nothing cascades.

```bash
php artisan vendor:publish --tag=entitlements-migrations
```

## The scheduler is not optional here

```php
// routes/console.php, or your console kernel
Schedule::command('entitlements:announce')->everyFifteenMinutes();
```

**The package does not register this for you**, unlike most of the suite. Register it yourself.

Two of the six states are derived from the clock, so nothing writes to the database when a
scheduled grant becomes active or an active one expires. `entitlements:announce` is what turns
those two transitions into `EntitlementGranted` and `EntitlementExpired`.

Without it:

- **Access is still correct.** `state()` reads the clock directly, so a scheduled grant becomes
  usable at its start instant regardless.
- **The events never arrive**, so nothing you hung off them happens. No welcome mail when a
  pre-ordered course opens, no notice when a licence lapses.

Fifteen minutes is a suggestion. The interval is the worst-case delay on those two events.

## Verifying it works

```bash
php artisan route:list --name=entitlements
php artisan entitlements:announce
```

Seven Control Panel routes and a pass that reports zero transitions. There are **no public
routes**: this package has no front-end surface at all.

Then open the Control Panel. **Entitlements** appears in the Users section for any user holding
`view entitlements`.

```php
Entitlements::grant($user, 'test-product', 'manual');
Entitlements::allows($user, 'test-product');   // true
```

## Publishing

```bash
php artisan vendor:publish --tag=entitlements-migrations
php artisan vendor:publish --tag=entitlements-translations
```

Two tags, and **there is no config tag**. The config is merged and never published, so the shipped
file is the source of the defaults. Override individual keys in your own
`config/entitlements.php`, or set them from a service provider.

Translations ship in `en` and `de` with identical key sets. Every string is a Control Panel string;
the package renders nothing else.

## Switching the Control Panel off

```php
'cp' => [
    'enabled' => false,
],
```

Removes the nav entry **and** all seven routes. Hiding the entry while leaving the screens reachable
by URL would not be a disabled Control Panel.

Use it where grants are written only by integrations and no editor should be creating them by hand.
The facade, the command and the events are unaffected.

## Set up a morph map before you have rows

Not required, and worth doing anyway:

```php
Relation::morphMap([
    'user' => \App\Models\User::class,
    'contact' => \Goldnead\Leadhub\Models\Contact::class,
]);
```

`subject_type` stores whatever `getMorphClass()` returns. Without a map that is the fully qualified
class name, and renaming or moving the class orphans every grant that points at it.
