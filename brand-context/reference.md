# Reference

<AddonHeader />

## `BrandContext` facade

```php
use Goldnead\BrandContext\Facades\BrandContext;
```

| Method | Returns | Notes |
| --- | --- | --- |
| `multiBrandEnabled()` | `bool` | Reflects `multi_brand` **and** `license_check` |
| `default()` | `Brand` | The always-present default brand. Throws if the migrations never ran. |
| `defaultId()` | `int` | |
| `current()` | `Brand` | **Never `null`.** Falls back to `default()`. |
| `currentId()` | `int` | |
| `hasCurrent()` | `bool` | Whether a brand was actually resolved. This is the test you want. |
| `setCurrent($brand)` | `static` | Accepts a `Brand`, an id, a handle, or `null` to clear |
| `forget()` | `static` | Clears the current brand |
| `runFor($brand, $callback)` | mixed | Sets, runs, restores. Nests safely. |
| `withoutBrandScope($callback)` | mixed | Deliberately cross-brand |
| `scopeIsDisabled()` | `bool` | Whether the global scope is currently suspended |
| `failMode()` | `string` | The configured `closed` or `open` |

::: warning `current()` is not nullable
Its return type is `Brand`, and it falls back to the default brand when nothing has been
resolved. So `current()` never tells you whether a brand was set — it always answers.

Use `hasCurrent()` for that. In single-brand mode it is always `true` (the default brand is
the current one by definition); in multi-brand mode it is `true` only once something has
actually resolved a brand.

```php
if (! BrandContext::hasCurrent()) {
    // no session, no token, no runFor() — this is a worker or a console command
}
```

The fallback in `current()` deliberately does not memoise: reading it does not flip
`hasCurrent()` to `true`, so the fail-closed read scope stays fail-closed for code that
called `current()` first.
:::

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
| `attach($user, $brand = null)` | `bool`, idempotent | — |
| `detach($user, $brand = null)` | `bool`, idempotent | — |
| `isUnassigned($user)` | `bool` | — |
| `assignedUserIdsOf($brand = null)` | raw ids | **no** |
| `assignedBrandIdsOf($user)` | raw ids | **no** |
| `userId($user)` | `string` | — |

`isUnassigned()` is the direct question behind the every-brand rule: a user with no membership
row at all is a member of every brand. It reads `brand_user` and applies no rule of its own, so
it is the honest way to ask "has anybody been assigned yet" without inferring it from an
`assigned…` call coming back empty.

`userId()` normalises whatever you hand it — a Statamic user, an Eloquent user, or an id — to the
string key `brand_user` stores. Use it rather than casting: under the file users repository the
id is a UUID, and `(int)` turns that into `0`.

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
