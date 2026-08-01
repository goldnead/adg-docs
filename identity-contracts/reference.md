# Reference

<AddonHeader />

## `Identity`

```php
use Goldnead\IdentityContracts\Identity;
```

### Fields

| Field | Type | Meaning |
| --- | --- | --- |
| `type` | string | `user`, `contact`, `system`, `anonymous`, or app-defined |
| `id` | ?string | Identifier within that type |
| `userId` | ?string | Join key into the host user table |
| `contactUuid` | ?string | Join key into the CRM contact |
| `email` | ?string | Convenience copy. Personal data. |
| `name` | ?string | Convenience copy. Personal data. |
| `anonymousId` | ?string | Pseudonymous visitor id |
| `meta` | array | Application-defined |

### Constructors

| Constructor | Signature |
| --- | --- |
| `Identity::user()` | `(int\|string $id, ?string $email = null, ?string $name = null, ?string $contactUuid = null, array $meta = [])` |
| `Identity::contact()` | `(string $uuid, ?string $email = null, ?string $name = null, array $meta = [])` |
| `Identity::system()` | `(?string $id = null, array $meta = [])` — `$id` defaults to `config('identity-contracts.system_id')` |
| `Identity::anonymous()` | `(?string $anonymousId = null, array $meta = [])` |

The constructor itself takes every field by name:
`new Identity(string $type, ?string $id = null, ?string $userId = null, ?string $contactUuid = null, ?string $email = null, ?string $name = null, ?string $anonymousId = null, array $meta = [])`.
An empty `$type` throws `InvalidArgumentException`; nothing else does.

### Methods

| Method | Returns |
| --- | --- |
| `withContactUuid($uuid)` | a copy |
| `withEmail($email)` | a copy |
| `withAnonymousId($id)` | a copy |
| `withMeta(array $meta)` | a copy, **merging** into the existing meta |
| `pseudonymised()` | a copy without `email`, `name`, `meta` |
| `toArray()` | snake_case array, matching column names |
| `jsonSerialize()` | the same array; the object is `JsonSerializable` |
| `Identity::fromArray($array)` | an `Identity` |

`toArray()` / `fromArray()` round-trip losslessly.

### Predicates

| Method | Returns | True when |
| --- | --- | --- |
| `isUser()` | bool | `type` is `user` |
| `isContact()` | bool | `type` is `contact` |
| `isSystem()` | bool | `type` is `system` |
| `isAnonymous()` | bool | `type` is `anonymous` |
| `isIdentified()` | bool | `userId` or `contactUuid` is set |
| `equals(?Identity $other)` | bool | Equality is provable. See below. |

`equals()` is **fail-closed** since 1.1.0. A matching `id` on both sides settles it;
otherwise at least one of `userId`, `contactUuid`, `anonymousId`, `email` must be set
on both sides and equal, with no other mutually-set field disagreeing. When nothing
identifies either side the answer is `false`, so
`Identity::anonymous()->equals(Identity::anonymous())` is `false`. Full rationale and
upgrade note: [Comparing two identities](/identity-contracts/identity-object#comparing-two-identities).

## `IdentityContext` facade

```php
use Goldnead\IdentityContracts\Facades\IdentityContext;
```

| Method | Returns | Notes |
| --- | --- | --- |
| `current()` | `Identity` | **Never `null`** |
| `resolve($subject)` | `Identity` | **Never throws**. `null` resolves to `current()`. |
| `actingAs($actor, $callback)` | mixed | Pins an actor; nests and restores |
| `resolveUsing($resolver)` | `IdentityManager` | Registers a custom resolver; last registered wins |
| `setCurrent($subject)` | `IdentityManager` | Pins an actor without a closure. `null` unpins. |
| `forget()` | `IdentityManager` | Drops the pinned actor **and every registered resolver** |
| `system(?string $id = null)` | `Identity` | Shorthand for `Identity::system()` |
| `locateContact(string $email)` | `?Identity` | Asks the bound `ContactLocator`; `null` when it misses |
| `withContact(Identity $identity)` | `Identity` | Fills in `contactUuid` from the identity's email |
| `anonymousId()` | `?string` | Asks the bound `AnonymousIdResolver` |

`setCurrent()` and `forget()` are the unscoped counterparts of `actingAs()`. Prefer
`actingAs()` wherever the actor has a defined lifetime, because it restores the
previous one even when the callback throws. `forget()` also clears the resolver
stack, which makes it a test helper rather than a runtime call.

`withContact()` returns the identity unchanged when it already has a `contactUuid`
or has no `email` to look up with.

### Resolution order

1. registered custom resolvers (last registered wins)
2. `ProvidesIdentity::toIdentity()`
3. `Authenticatable` → `Identity::user(...)`, enriched with the CRM join key
4. email string → contact lookup, else contact-shaped without a UUID
5. fallback: `anonymous()` in HTTP, `system()` in the console

### `current()` order

1. the `actingAs` identity, if pinned
2. the authenticated user, if `resolve_from_auth` is `true`
3. the fallback

## Contracts

```php
namespace Goldnead\IdentityContracts\Contracts;
```

| Contract | Implement on / bind to | Purpose |
| --- | --- | --- |
| `ProvidesIdentity` | your model | control its own representation |
| `IdentityResolver` | registered callable | teach the manager a new subject type |
| `ContactLocator` | container binding | email → CRM contact UUID. Default: no-op. |
| `AnonymousIdResolver` | container binding | supply the visitor id. Default: `SessionAnonymousIdResolver`. |

## Configuration

| Key | Default | Purpose |
| --- | --- | --- |
| `resolve_from_auth` | `true` | Let `current()` fall back to the auth guard |
| `system_id` | `system` | Actor id for schedulers, webhooks, workers |
| `anonymous.enabled` | `true` | `false` → no anonymous ids at all |
| `anonymous.persist` | `true` | `false` → one-way hash of the session id, writes nothing |
| `anonymous.session_key` | `identity_anonymous_id` | Session key for the UUID |

Environment variables: `IDENTITY_RESOLVE_FROM_AUTH`, `IDENTITY_SYSTEM_ID`,
`IDENTITY_ANONYMOUS_ENABLED`, `IDENTITY_ANONYMOUS_PERSIST`. Only
`anonymous.session_key` is a config-file decision with no environment variable.

## Console commands

None.

## Events

None.

## Permissions

None. This is a library, not an addon: it owns no data and exposes no screen, so
there is nothing to permission.

## Database

None. The package owns no tables and persists nothing.

## Guarantees

| | |
| --- | --- |
| `resolve()` on an unknown subject | never throws; returns the fallback |
| `current()` | never returns `null` |
| Persistence | none, by this package |
| An email address as an identifier | never; a contact without a UUID keeps `id` as `null` |
| Cookies | none of its own; the anonymous resolver reuses the existing session |
| `pseudonymised()` | drops `email`, `name`, `meta`; keeps join keys |
| `equals()` | only ever `true` from evidence; unproven equality reads as `false` |

## Requirements

<Requirements statamic="Not required (plain Laravel works)" laravel="12.x / 13.x" database="Not required" />
