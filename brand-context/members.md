# Brand members

<AddonHeader />

The global scope isolates **Eloquent models**. A Statamic user is not one — with
the file users repository it is not a database row at all — so "the users of this
brand" cannot be expressed by scoping, and gets its own answer.

```php
use Goldnead\BrandContext\Facades\BrandMembers;

BrandMembers::usersOf();            // Statamic users of the current brand
BrandMembers::usersOf('acme');      // …of a named brand
BrandMembers::includes($user);      // does this user belong to the current brand?
BrandMembers::brandsOf($user);      // which brands does this user belong to?
```

The Control Panel screen is under **Users → Brand Members**. It always acts on the
brand in the switcher, and it appears only in multi-brand mode.

## The rule that will surprise you

> **A user with no membership at all counts as a member of every brand.**

Every install upgrading into this feature starts with an empty `brand_user` table.
Strict filtering would empty every assignee dropdown, every team notification and
every approval list on the day of the upgrade — and it would look exactly like a
permissions bug, because that is what a suddenly empty dropdown looks like.

So nothing changes until somebody deliberately assigns a user. **The first
assignment is what narrows that user down**, and it narrows them everywhere at
once: from then on they belong only to the brands listed for them.

Removing their last assignment puts them back into every brand. There is
deliberately no way to express "member of nothing" — that is what revoking a
permission is for.

::: warning The practical consequence
On a two-brand install, assigning one user to Acme does **not** restrict the other
nineteen users. They are still members of both brands until you assign each of
them. Partial adoption of this feature is partial isolation, and it looks like full
isolation from the screen you just used.
:::

### Which methods apply the rule

| Applies the rule | Does not |
| --- | --- |
| `includes()` | `assignedUserIdsOf()` |
| `usersOf()` | `assignedBrandIdsOf()` |
| `filter()` | |
| `brandsOf()` | |

The two `assigned…` methods return the raw rows. They exist for **rendering and
auditing the assignments themselves** — showing which checkboxes are ticked — and
must never be used to decide who may be offered, notified or assigned. Using them
for that is how you get the empty-dropdown bug the rule exists to prevent.

## Membership is not authorisation

`includes()` answers "does this person belong to this brand". It never answers
"may this person do this". Combine it with a permission check:

```php
$assignees = BrandMembers::usersOf()
    ->filter(fn ($user) => $user->can('view leadhub'))
    ->map(fn ($user) => ['value' => (string) $user->id(), 'label' => $user->email()]);
```

That combination — membership **and** permission — is exactly what LeadHub uses to
decide who may be offered as a lead owner, a task assignee or an opportunity
owner. Superusers are not exempt from the membership half.

## Writing memberships

```php
BrandMembers::attach($user);            // to the current brand
BrandMembers::attach($user, 'acme');    // to a named brand
BrandMembers::detach($user, 'acme');
```

Both are idempotent, and both take the same brand argument.

`attach()` is generous about what a user is. It accepts a Statamic user, an
`Authenticatable`, an Eloquent model, or an `Identity` from
`goldnead/statamic-identity-contracts`.

## A user id is a string

`brand_user.user_id` holds `$user->id()`, which is a **UUID** under the file driver
and a **numeric key** under the Eloquent one. The column is a string and there is
no foreign key on it, because a Statamic install need not have a `users` table at
all.

::: danger Do not cast it to int
On a file-driver install, casting a UUID to `int` yields `0`, which collapses every
membership onto one nonexistent user. This is a real, silent, total failure and it
has shipped in this family before.
:::

## Naming the brand without a session

With multi-brand on and no current brand — a console command, a queue worker — the
membership API **refuses to guess and throws**. That is deliberate: silently
answering "every user" in a worker would be the same leak the scope exists to
prevent.

Pass the brand, or wrap the work:

```php
BrandContext::runFor('acme', fn () => BrandMembers::usersOf());
// or
BrandMembers::usersOf('acme');
```

The `RunsForEachBrand` trait does this for a command that should sweep every brand.

## Single-brand installs

Unaffected, in the way that matters:

- `includes()` is always `true`.
- `usersOf()` returns every user.
- No **Brand Members** screen appears.

So code written against `BrandMembers` works identically whether or not
multi-brand is ever enabled, which is the point of writing it that way in the
first place.
