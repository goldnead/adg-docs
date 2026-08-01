# Troubleshooting

<AddonHeader />

## Every list is empty after enabling multi-brand

No brand is current, and `fail_mode` is `closed`, which is working as designed.

In the Control Panel, check that `brand.session` middleware is on the CP routes and
that the switcher has a brand selected. In a console command or a queue worker there
is no session at all, so you have to name the brand:

```php
BrandContext::runFor('acme', fn () => $this->work());
```

Confirm the diagnosis in `tinker`:

```php
BrandContext::multiBrandEnabled();   // true?
BrandContext::hasCurrent();          // false → that is your answer
```

::: warning Do not use `current()` for this
`current()` returns a `Brand`, never `null`: with nothing resolved it hands back the
default brand. So it always looks like a brand is set, including in exactly the
situation that is emptying your lists. `hasCurrent()` is the question you mean.

The scope reads `hasCurrent()`, not `current()`, which is why the two can disagree —
`current()` answering "default" while the scope returns no rows is the expected
combination here, not a contradiction.
:::

## An assignee dropdown is suddenly empty

You are almost certainly calling `assignedUserIdsOf()` where you want `usersOf()`.

The `assigned…` methods return the raw `brand_user` rows and deliberately do **not**
apply the every-brand rule, so on an install where nobody has been assigned yet
they return nothing. `usersOf()` returns every user in that situation, which is the
behaviour the rule exists to produce.

## Some users see both brands after I assigned one user

That is the rule, not a bug: a user with **no** membership counts as a member of
every brand. Assigning one user narrows that user only. Isolation is complete when
every user has at least one assignment.

## `BrandMembers` throws in a command

Deliberate. With multi-brand on and no current brand, the membership API refuses to
guess rather than silently answering "every user", which in a worker would be the
same leak the scope prevents.

```php
BrandMembers::usersOf('acme');
// or
BrandContext::runFor('acme', fn () => BrandMembers::usersOf());
```

## `AmbiguousBrandRecord` on a public link

The lookup column you gave `SetBrandFromRouteValue` is not unique across all
brands, so two records answered and the middleware refused to pick one.

Use a globally unique column: a random token, not a slug, handle or email address.
See [Public routes](/brand-context/public-routes#the-column-must-be-globally-unique).

## A confirmation link 404s or shows "unknown token" for a valid token

The middleware resolved nothing, so no brand was set, so the fail-closed scope hid
the record your controller then looked up. Three causes, in order:

1. The middleware is not actually on the route. Check `php artisan route:list` and
   look at the middleware column, not at your `Route::` call.
2. The parameter name in the middleware argument does not match the route
   parameter.
3. The token in the link belongs to a record in a different brand and the column is
   per-brand unique, so the lookup found the wrong row or none.

## Membership works locally and not in production

Check the users repository. Under the file driver `$user->id()` is a UUID; under the
Eloquent driver it is an integer. If any code in the path casts that to `int`, a
UUID becomes `0` and every membership collapses onto one nonexistent user.

`brand_user.user_id` is a **string** column with no foreign key, for exactly this
reason.

## `hasPermission()`, `isSuper()` or `id()` crashes

The install uses Eloquent users with a custom user model, so the object your guard
returns is not a Statamic user and has none of those methods. Use:

```php
$user->can($permission);
Statamic\Facades\User::fromUser($user);   // for isSuper()
$user->getAuthIdentifier();               // instead of id()
```

A testbench always hands you a Statamic user, which is why this class of bug is
invisible in a test suite and immediate on a real install. See
[Identity](/guide/identity#the-eloquent-users-trap).

## Flat-file data belongs to the wrong brand

Files in the un-prefixed layout are read as the **default brand's**, by design, so a
single-brand install keeps working after the flag flips. Move them when the second
brand arrives:

```bash
php artisan marketing:migrate-flat-brands --dry-run
php artisan marketing:migrate-flat-brands --brand=acme
```

It only ever moves, never overwrites, never deletes, and a second run is a no-op.

## A brand leaks between requests

Only possible in a long-lived process, and only if something sets the brand outside
the middleware. The package sets the brand explicitly per request and never inherits
it; a leak means your own code called `setCurrent()` without restoring.

Use `runFor()` instead, which restores whatever was current before, or set the brand
in middleware where the request lifecycle bounds it.

## Uniqueness is not being enforced

`migrate` reporting success does not mean the indexes are there. Ask:

```bash
php artisan leadhub:brand-integrity
php artisan marketing:consent-integrity
php artisan notifications:uniqueness-integrity
```

If one reports colliding rows, it will name them with their ids. It never deletes
one, and `--repair` refuses to build the index until nothing is in the way, because
which of two contacts is *the* contact is not a decision a schema change gets to
make.

Two schema traps produce this state in the first place: a unique that leads with a
nullable column constrains nothing, and a unique across wide `utf8mb4` columns
exceeds InnoDB's 3072-byte index limit — neither of which SQLite will ever tell you
about.
