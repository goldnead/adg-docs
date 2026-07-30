# Concepts

<AddonHeader />

Six moving parts. Two of them you use daily; the rest you configure once.

## `Brand`

The tenant. An ordinary Eloquent model with a `handle` and a `name`, and
deliberately **not** itself scoped: brands are the scoping root, so a query for
brands cannot be filtered by the current brand without becoming circular.

A default brand always exists.

```php
use Goldnead\BrandContext\Models\Brand;

Brand::create(['handle' => 'acme', 'name' => 'Acme GmbH']);
```

## `HasBrand`

A trait for any Eloquent model that must be brand-scoped. It applies the global
`BrandScope` and stamps `brand_id` on create.

```php
use Goldnead\BrandContext\Concerns\HasBrand;

class Contact extends Model
{
    use HasBrand; // requires a brand_id column
}
```

That is the entire integration surface for a model. See
[Scoping models](/brand-context/scoping).

## `BrandScope`

The global scope the trait applies. In single-brand mode it adds no `where`
clause at all. In multi-brand mode it constrains every query to the current
brand, and with `fail_mode=closed` and no current brand it constrains to nothing,
which returns an empty result rather than everything.

The scope is a query concern only. It does not prevent you from writing a row
with another brand's id if you go out of your way to; `runFor()` is how you do
that deliberately.

## `BrandContext` / `BrandManager`

The facade you actually call.

```php
use Goldnead\BrandContext\Facades\BrandContext;

BrandContext::multiBrandEnabled();      // bool
BrandContext::current();                // the current Brand, or null
BrandContext::setCurrent($brand);       // set it explicitly
BrandContext::runFor('acme', $callback);      // run a closure in a brand
BrandContext::withoutBrandScope($callback);   // deliberately cross-brand
```

`runFor()` is the important one. It sets the brand, runs the closure, and restores
whatever was current before, so it nests safely and cannot leak a brand into the
rest of the request.

`withoutBrandScope()` is the escape hatch, and it is deliberately more to type
than the safe path. Use it for operator-level work — a global count, an admin
report, a migration — and never inside a request that serves one brand's user.

## Resolving the current brand

There is no ambient global. The brand is set explicitly, per request, by whichever
mechanism fits the entry point:

| Entry point | Mechanism |
| --- | --- |
| Control Panel | `SetBrandFromSession` middleware (`brand.session`), reading what the switcher stored |
| API | `ResolveBrandFromToken` middleware (`brand.token`), resolving a bearer token; **fail-closed with a 401** in multi-brand mode |
| Public route with a token in the URL | `SetBrandFromRouteValue`, see [Public routes](/brand-context/public-routes) |
| Console command, queue worker | nothing. You must name the brand. |

That last row is the one that generates support questions. A command has no
session, therefore no brand, therefore with `fail_mode=closed` it sees nothing.

```php
BrandContext::runFor($handle, fn () => $this->doTheWork());
```

Or use the `RunsForEachBrand` trait for a command that should sweep all of them.
Every scheduled command in the suite does this and accepts `--brand=` to narrow the
run.

::: tip Use the trait rather than rolling your own
Its docblock counts where this has gone wrong before: *"has now been found in four
separate commands across three addons"* — and LeadHub's three scheduled commands
were numbers five, six and seven, fixed in `statamic-leadhub` 1.10.3.

The failure mode is always the same and always silent: the command reports
`0 processed` and exits successfully while doing nothing at all.
:::

::: tip Never inherited
The brand is set explicitly on every request and never carried over from the last
one. That matters the moment your app runs in a long-lived process — Octane, a
queue worker, a test suite — where a leaked brand would be a cross-tenant data
leak that only appears on the second request.
:::

## `BrandMembers` / `BrandMembership`

Which Control Panel users belong to which brand. This is the one part of the
package that is not about Eloquent models, because a Statamic user is not one.

```php
use Goldnead\BrandContext\Facades\BrandMembers;

BrandMembers::usersOf();          // Statamic users of the current brand
BrandMembers::includes($user);    // does this user belong to the current brand?
BrandMembers::brandsOf($user);    // which brands does this user belong to?
```

It has its own page, including the rule that catches everybody:
[Brand members](/brand-context/members).

## Consent is per brand

Worth stating as a concept rather than a detail, because it is the reason
uniqueness in the suite is `(brand_id, …)` almost everywhere.

The same email address is allowed to hold independent consent and subscription
state in two brands. A person who unsubscribed from Acme's newsletter has said
nothing at all about Contoso's, and a schema that conflated them would be
substantively wrong rather than merely inconvenient.

The exception, deliberate and documented: **Marketing list handles are unique
across all brands**, because the public subscribe endpoint derives the brand from
the list handle the form names. One handle, one owner, no brand in the URL and
nothing for a visitor to get wrong.
