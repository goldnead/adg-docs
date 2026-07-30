# Installation

<AddonHeader />

<Requirements />

```bash
composer require goldnead/statamic-brand-context
php artisan migrate
php artisan vendor:publish --tag=brand-context-config
```

Most people never type that: the package arrives as a dependency of Webhook
Manager, Automations, LeadHub, Marketing, Activity or Notifications.

## What the migration creates

| Table | Purpose |
| --- | --- |
| `brands` | The tenants. Not itself scoped: brands are the scoping root. |
| `brand_user` | Which Control Panel users belong to which brand. |

A **default brand** is created automatically, with the handle and name from your
config:

```php
'default_handle' => env('BRAND_CONTEXT_DEFAULT_HANDLE', 'default'),
'default_name' => env('BRAND_CONTEXT_DEFAULT_NAME', 'Default'),
```

Every dependent addon's migrations add a `brand_id` column and backfill it to
that brand. From that moment your data is brand-shaped, whether or not you ever
turn multi-brand on.

## What a single-brand install looks like afterwards

Nothing changes. Specifically:

- No brand switcher appears in the Control Panel.
- No **Users → Brand Members** screen appears.
- `BrandContext::multiBrandEnabled()` returns `false`.
- `BrandMembers::includes($user)` is always `true`.
- `BrandMembers::usersOf()` returns every user.
- The global scope adds no `where` clause.

This is deliberate and load-bearing: an addon that depends on Brand Context must
be indistinguishable from one that does not, until you ask for more.

## Enabling multi-brand

One flag:

```dotenv
BRAND_CONTEXT_MULTI_BRAND=true
```

No migration is needed, because the columns are already there and already
backfilled. What changes the moment you set it:

1. The global scope starts filtering, and **fails closed**: no current brand means
   no rows.
2. The brand switcher appears in the Control Panel.
3. The **Users → Brand Members** screen appears.
4. Console commands and queue workers, which have no session, see nothing unless
   you name a brand.

Point 4 is the one that will bite. Read
[Concepts → Resolving the current brand](/brand-context/concepts#resolving-the-current-brand)
before you flip the flag on anything with scheduled work.

::: warning Flat-file data does not move itself
Addons with a flat storage driver isolate by directory, which a switched flag
cannot retroactively do to files already on disk. Files still in the
un-prefixed layout are read as the **default brand's**, so a single-brand install
keeps working. Move them when the second brand arrives:

```bash
php artisan marketing:migrate-flat-brands --dry-run
php artisan marketing:migrate-flat-brands
```
:::

## Creating a second brand

Brands are ordinary Eloquent records. Create one however you prefer:

```php
use Goldnead\BrandContext\Models\Brand;

Brand::create(['handle' => 'acme', 'name' => 'Acme GmbH']);
```

Then assign the users who should see it under **Users → Brand Members**, and read
[the membership rule](/brand-context/members#the-rule-that-will-surprise-you)
first, because until you make the first assignment every user is a member of
every brand.

## Verifying isolation

Per-brand uniqueness is enforced by database indexes, and `migrate` reporting
success does not prove they are in place. Ask directly:

```bash
php artisan leadhub:brand-integrity
php artisan marketing:consent-integrity
php artisan notifications:uniqueness-integrity
```

These belong to the dependent addons rather than to Brand Context, because the
indexes are on their tables. All three report and change nothing unless you pass
`--repair`.

## Uninstalling

Removing the package from a single-brand install is safe: the `brand_id` columns
stay, unused. Removing it from a **multi-brand** install is not, because nothing
would filter the rows any more and every brand would see every other brand's
data. Consolidate to one brand first.
