# Reference

<AddonHeader />

## `BrandContext` facade

```php
use Goldnead\BrandContext\Facades\BrandContext;
```

| Method | Returns | Notes |
| --- | --- | --- |
| `multiBrandEnabled()` | `bool` | Reflects `multi_brand` **and** `license_check` |
| `current()` | `Brand|null` | `null` is a legitimate state, not an error |
| `setCurrent($brand)` | `void` | Accepts a `Brand`, a handle, or `null` |
| `runFor($brand, $callback)` | mixed | Sets, runs, restores. Nests safely. |
| `withoutBrandScope($callback)` | mixed | Deliberately cross-brand |

## `BrandMembers` facade

```php
use Goldnead\BrandContext\Facades\BrandMembers;
```

| Method | Returns | Applies the every-brand rule |
| --- | --- | --- |
| `usersOf($brand = null)` | Statamic users | yes |
| `includes($user, $brand = null)` | `bool` | yes |
| `brandsOf($user)` | brands | yes |
| `filter($users, $brand = null)` | filtered users | yes |
| `attach($user, $brand = null)` | `void`, idempotent | — |
| `detach($user, $brand = null)` | `void`, idempotent | — |
| `assignedUserIdsOf($brand = null)` | raw ids | **no** |
| `assignedBrandIdsOf($user)` | raw ids | **no** |

The two `assigned…` methods are for rendering and auditing assignments, never for
deciding who may be offered, notified or assigned. See
[Brand members](/brand-context/members#which-methods-apply-the-rule).

With multi-brand on and no current brand, the membership API **throws** rather than
guessing. Pass the brand explicitly.

## Trait

```php
use Goldnead\BrandContext\Concerns\HasBrand;
```

Applies the global `BrandScope` and stamps `brand_id` on create. Requires a
`brand_id` column.

```php
use Goldnead\BrandContext\Concerns\RunsForEachBrand;
```

For console commands: iterates brands and runs the body inside each, honouring a
`--brand=` option.

## Model

```php
use Goldnead\BrandContext\Models\Brand;
```

`handle`, `name`. Not scoped: brands are the scoping root.

## Middleware

| Class | Alias | Entry point | On failure |
| --- | --- | --- | --- |
| `SetBrandFromSession` | `brand.session` | Control Panel | sets nothing |
| `ResolveBrandFromToken` | `brand.token` | API | **401**, fail-closed |
| `SetBrandFromRouteValue` | — | public links | sets nothing, aborts nothing |

`SetBrandFromRouteValue` takes three parameters: model class, lookup column, route
parameter. The lookup column **must** be unique across all brands, or it throws
`AmbiguousBrandRecord`.

## Exceptions

| Exception | Thrown when |
| --- | --- |
| `AmbiguousBrandRecord` | A supposedly unique lookup value matched more than one record |

## Configuration

| Key | Default | Purpose |
| --- | --- | --- |
| `multi_brand` | `false` | The master switch |
| `license_check` | `null` | Callable that must also return `true` |
| `default_handle` | `default` | Handle of the always-present brand |
| `default_name` | `Default` | Its name |
| `fail_mode` | `closed` | `closed` returns no rows with no brand; `open` does not filter |

Environment variables: `BRAND_CONTEXT_MULTI_BRAND`,
`BRAND_CONTEXT_DEFAULT_HANDLE`, `BRAND_CONTEXT_DEFAULT_NAME`,
`BRAND_CONTEXT_FAIL_MODE`.

## Console commands

None of its own. The dependent addons ship the brand-related operator commands,
because the indexes and the data are theirs:

| Command | Addon |
| --- | --- |
| `leadhub:brand-integrity [--repair]` | LeadHub |
| `marketing:consent-integrity [--repair]` | Marketing |
| `marketing:migrate-flat-brands [--dry-run] [--brand=]` | Marketing |
| `notifications:uniqueness-integrity [--repair]` | Notifications |
| `leadhub:scoring:import [--brand=]` | LeadHub |

## Events

None.

## Permissions

| Permission | Grants |
| --- | --- |
| `manage brand members` | The **Users → Brand Members** screen, in multi-brand mode |

## Database

| Table | Columns of interest |
| --- | --- |
| `brands` | `handle`, `name` |
| `brand_user` | `brand_id`, `user_id` (**string**, no foreign key) |

`user_id` is a string because it holds `$user->id()`, which is a UUID under the
file users repository and a numeric key under the Eloquent one. A Statamic install
need not have a `users` table at all.

## Behaviour summary

| | Single-brand | Multi-brand |
| --- | --- | --- |
| Global scope | no-op | filters by current brand |
| No current brand | irrelevant | **no rows** (`fail_mode=closed`) |
| Stamping on create | default brand | current brand |
| CP switcher | hidden | shown |
| Brand Members screen | hidden | shown |
| `includes()` | always `true` | membership rule applies |
| `usersOf()` | every user | members, or every user if nobody is assigned |
| Schema | identical | identical |
