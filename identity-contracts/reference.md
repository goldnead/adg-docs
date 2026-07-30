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
| `Identity::user()` | `($id, ?string $email = null, ?string $name = null, ?string $contactUuid = null)` |
| `Identity::contact()` | `(?string $uuid, ?string $email = null)` |
| `Identity::system()` | `(?string $id = null)` — defaults to `config('identity-contracts.system_id')` |
| `Identity::anonymous()` | `(?string $anonymousId = null)` |

### Methods

| Method | Returns |
| --- | --- |
| `withContactUuid($uuid)` | a copy |
| `withEmail($email)` | a copy |
| `withAnonymousId($id)` | a copy |
| `withMeta(array $meta)` | a copy |
| `pseudonymised()` | a copy without `email`, `name`, `meta` |
| `toArray()` | snake_case array, matching column names |
| `Identity::fromArray($array)` | an `Identity` |

`toArray()` / `fromArray()` round-trip losslessly.

## `IdentityContext` facade

```php
use Goldnead\IdentityContracts\Facades\IdentityContext;
```

| Method | Returns | Notes |
| --- | --- | --- |
| `current()` | `Identity` | **Never `null`** |
| `resolve($subject)` | `Identity` | **Never throws** |
| `actingAs($actor, $callback)` | mixed | Pins an actor; nests and restores |
| `resolveUsing($callable)` | void | Registers a custom resolver; last wins |

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

Environment variables: `IDENTITY_RESOLVE_FROM_AUTH`, `IDENTITY_SYSTEM_ID`.

## Console commands

None.

## Events

None.

## Permissions

None. No Control Panel surface.

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

## Requirements

<Requirements statamic="Not required (plain Laravel works)" database="Not required" />
