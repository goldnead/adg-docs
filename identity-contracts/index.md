# Identity Contracts

<AddonHeader />

Identity foundation for the suite. It answers one question in a stable way —
**who did this?** — so that addons never have to depend on a concrete
`App\Models\User`.

It is a plain Composer library rather than a Statamic addon: it requires no
`statamic/cms`, ships no user interface and has nothing to install beyond the
dependency itself. It **owns no data** either — no migrations, no models. What it
ships is a value object, four contracts and inert defaults.

```php
use Goldnead\IdentityContracts\Identity;
use Goldnead\IdentityContracts\Facades\IdentityContext;

Identity::user(42, 'a@example.com', 'Adrian');
Identity::contact('c-uuid', 'a@example.com');
Identity::system('importer');
Identity::anonymous('anon-1');

IdentityContext::current();                     // actor behind this context
IdentityContext::resolve($anything);            // any subject → Identity
IdentityContext::actingAs($actor, fn () => …);   // pin an actor for a job
```

## Why it exists

Addon extraction has a recurring blocker: an addon needs to record or notify an
actor, and reaches for the host application's user model. That single reference
makes the addon unshippable, because no two Statamic projects agree on what a user
is — a file-driver Statamic user with a UUID, an Eloquent `App\Models\User` with an
integer key, an API client, a contact who has never logged in.

`Identity` breaks the dependency in both directions: the addon asks for an
identity, and the application decides what one is.

## What you get

- **`Identity`** — a readonly bag of scalars, safe to persist and to put on a
  queue.
- **`IdentityContext`** — resolution, with a documented order and a fallback that
  never throws.
- **Four extension points** — `ProvidesIdentity`, `IdentityResolver`,
  `ContactLocator`, `AnonymousIdResolver`.
- **Nothing else.** No tables, no UI, no scheduled work.

::: warning `equals()` changed in 1.1.0
`Identity::equals()` is now fail-closed and only reports equality it can prove.
`Identity::anonymous()->equals(Identity::anonymous())` is `false` where it used to be
`true`. If you deduplicate, group or authorise on `equals()`, read
[Comparing two identities](/identity-contracts/identity-object#comparing-two-identities).
:::

## Two guarantees worth reading twice

**Unrecognised subjects never throw.** Identity is metadata; a ledger write must not
fail because an actor could not be classified. The fallback is
`Identity::anonymous()` in HTTP and `Identity::system()` in the console.

**`current()` never returns `null`.** "Nobody in particular" is itself an identity,
so consumers do not need a null branch, and forgetting one cannot be a bug.

## Where the suite uses it

Wherever a page in these docs says *"anything `IdentityContext` can resolve"*:

```php
Activity::record('commerce.purchase_completed', ['actor' => $user]);
Notifications::notify($user, 'community.mention', ['actor' => $author]);
```

Both accept an `Identity`, a `ProvidesIdentity`, any `Authenticatable`, or an email
string, and both store scalars rather than a model reference.

Activity and Notifications depend on this package directly. LeadHub interacts with it
in the other direction: an application running LeadHub binds a `ContactLocator` that
reads `leadhub_contacts`, which is the only place the "email to contact" join lives.

## What it deliberately does not do

- **It is not authorisation.** It answers who, never whether they may.
- **It does not persist anything.** Consumers persist the scalars they need.
- **It does not identify people across devices.** The anonymous id is a session
  identifier, not a fingerprint.
- **It does not reuse an email address as an identifier.** A contact without a UUID
  keeps `id` as `null`.

## Next

- [Installation](/identity-contracts/installation)
- [Configuration](/identity-contracts/configuration)
- [The Identity object](/identity-contracts/identity-object) — fields, constructors, `pseudonymised()`
- [Resolving an actor](/identity-contracts/resolving) — the resolution order
- [Extension points](/identity-contracts/extending) — the four contracts
