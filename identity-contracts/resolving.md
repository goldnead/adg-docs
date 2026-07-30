# Resolving an actor

<AddonHeader />

```php
use Goldnead\IdentityContracts\Facades\IdentityContext;

IdentityContext::current();                      // actor behind this execution context
IdentityContext::resolve($subject);              // any subject → Identity
IdentityContext::actingAs($actor, fn () => …);     // pin an actor for a job or import
```

## What `resolve()` accepts

- an `Identity` (returned as-is)
- anything implementing `ProvidesIdentity`
- any `Authenticatable`
- an email address as a string

## Resolution order

1. **Registered custom resolvers** — last registered wins
2. **`ProvidesIdentity::toIdentity()`**
3. **`Authenticatable`** → `Identity::user(...)`, enriched with the CRM join key
4. **Email string** → contact lookup, else a contact-shaped identity without a UUID
5. **Fallback**

The order is fixed. Extend it by registering a resolver (step 1), not by trying to
reorder it.

Step 3's enrichment is worth noticing: an authenticated user is looked up through
the bound `ContactLocator`, so a logged-in person who is also a CRM contact arrives
with both `userId` and `contactUuid` set, and a consumer can join either way without
knowing which.

## Resolution never throws

**Unrecognised subjects never throw.** Identity is metadata; a ledger write must not
fail because an actor could not be classified.

| Context | Fallback |
| --- | --- |
| HTTP | `Identity::anonymous()` |
| Console | `Identity::system()` |

That means `resolve()` always gives you something usable, and a consumer never needs
a try/catch around it. It also means a wrong actor is silent, which is the trade-off:
if attribution matters, pass the actor explicitly rather than relying on the
fallback.

## `current()`

```php
IdentityContext::current();
```

Returns, in order:

1. the `actingAs` identity, if one is pinned
2. the authenticated user, if `resolve_from_auth` is `true`
3. the fallback

**It never returns `null`.** "Nobody in particular" is itself an identity, so
consumers do not need a null branch and forgetting one cannot be a bug.

## `actingAs()`

Pins an actor for the duration of a closure. This is how you attribute work that has
no request behind it:

```php
IdentityContext::actingAs(Identity::system('importer'), function () {
    foreach ($rows as $row) {
        Activity::record('crm.contact_created', ['actor' => IdentityContext::current(), ...]);
    }
});
```

It nests and restores, like `BrandContext::runFor()`. Two common uses:

**An import or a backfill.** Every row recorded during the run is attributed to the
importer rather than to whoever happened to run the command.

**A job that acts for a user.** Capture the identity at dispatch, pin it in `handle()`:

```php
public function __construct(private array $actor) {}

public function handle(): void
{
    IdentityContext::actingAs(Identity::fromArray($this->actor), function () {
        // …
    });
}
```

## In a queue worker

There is no request, no session and no authenticated user. `current()` there returns
`Identity::system()`, which is correct and usually not what you wanted.

Capture at dispatch time:

```php
dispatch(new SendWelcome($user->id, IdentityContext::current()->toArray()));
```

This is the same rule Activity documents for `recordLater()`: the actor and the
request context are captured at **dispatch**, never in the worker.

## In the Control Panel

The CP is an ordinary authenticated HTTP context, so `current()` is the logged-in
user, resolved through the `Authenticatable` branch.

::: warning Do not reach past it
Once you have an `Identity`, use its fields. Reaching back to the raw auth user to
call `hasPermission()`, `isSuper()` or `id()` crashes on any install using Eloquent
users with a custom user model, and a testbench will never show you that because it
always hands you a Statamic user.

```php
$user->can($permission);
Statamic\Facades\User::fromUser($user);   // for isSuper()
$user->getAuthIdentifier();               // instead of id()
```
:::

## Resolving an email address

```php
IdentityContext::resolve('a@example.com');
```

Goes through the bound `ContactLocator`. With the default no-op binding you get a
contact-shaped identity carrying the address and **`id => null`**, because an email
address is never reused as an identifier.

With LeadHub's locator bound you get the contact UUID as well, and `id` set. So the
same call is progressively more useful as the application gains a CRM, without any
consumer changing.
