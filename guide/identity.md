# Identity

Addon extraction has a recurring blocker: the addon needs to record or notify an
actor, and reaches for the host application's user model. That one reference
makes the addon unshippable, because no two Statamic projects agree on what a
user is — a file-driver Statamic user with a UUID, an Eloquent `App\Models\User`
with an integer key, an API client, a contact who has never logged in.

`goldnead/statamic-identity-contracts` answers the question once. The addon asks
for an identity; the application decides what one is.

Full reference: [Identity Contracts](/identity-contracts/).

## What every addon in the suite does with it

Wherever a page in these docs says *"anything `IdentityContext` can resolve"*, it
means you may pass:

- an `Identity`
- anything implementing `ProvidesIdentity`
- any `Authenticatable`
- an email address as a string

and the addon will store scalars, never a model reference.

```php
Activity::record('commerce.purchase_completed', ['actor' => $user]);
Notifications::notify($user, 'community.mention', [...]);
```

Both of those accept the same four shapes, and neither knows what `$user` is.

## Resolution never throws

Identity is metadata. A ledger write must not fail because an actor could not be
classified, so an unrecognised subject resolves to `Identity::anonymous()` in
HTTP and `Identity::system()` in the console rather than raising.

`IdentityContext::current()` never returns `null` either. "Nobody in particular"
is itself an identity.

## The eloquent-users trap

This one bit the suite in production, and it is worth knowing because it is
invisible in a testbench.

A Statamic install can use Eloquent users with a custom user model. In that case
the object your guard returns is **not** a Statamic user, so it has no
`hasPermission()`, no `isSuper()` and no `id()`. Any addon code calling those on
the raw auth user crashes — and never in development, because a testbench always
hands you a Statamic user.

The fix pattern, used throughout the suite:

```php
$user->can($permission);              // Statamic hooks in via Gate::after
Statamic\Facades\User::fromUser($u);  // to get at isSuper()
$user->getAuthIdentifier();           // not ->id()
```

If you write your own extension against these addons, use the same three.

## A user id is a string

`brand_user.user_id`, `activities.user_id` and the notification recipient key all
store `$user->id()` **as a string**, because it is a UUID under the file driver
and a numeric key under the Eloquent one. There is no foreign key on any of them:
a Statamic install need not have a `users` table at all.

Do not cast these to `int`. On a flat-driver install that silently turns every
UUID into `0`, which collapses every record onto one recipient.

## Pseudonymisation

`Identity::pseudonymised()` returns a copy of an Identity without `email`,
`name` and `meta`, while keeping the join keys. It is what a consumer calls to
honour a retention rule without losing the ability to count what happened.

It is **not** what `activity:anonymize` does. That command works on stored rows
rather than on an Identity, and it nulls the join keys along with everything
else, so a query by `contact_uuid` finds nothing afterwards. The two are easy
to confuse and are not interchangeable. See
[Privacy & retention](/guide/privacy) and
[Activity → Privacy & retention](/activity/privacy).

## Anonymous visitors

The bundled `SessionAnonymousIdResolver` stores a UUID in the session that
already exists and deliberately sets **no cookie of its own**, so it creates no
additional consent surface. With `anonymous.persist` off it returns a one-way
hash of the session id and writes nothing; with `anonymous.enabled` off it
returns `null` forever.

A notification recipient must be identifiable. Notifying an anonymous visitor
returns `null`, because there would be no way to ever show it to them again.
Activity has no such restriction: a pre-identification page view is a real fact.

## Headless applications

An API hub or an import pipeline that always passes the actor explicitly should
stop the guard fallback from guessing:

```php
// config/identity-contracts.php
'resolve_from_auth' => false,
```
