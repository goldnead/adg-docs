# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=identity-contracts-config
```

```php
// config/identity-contracts.php

return [
    'resolve_from_auth' => env('IDENTITY_RESOLVE_FROM_AUTH', true),
    'system_id' => env('IDENTITY_SYSTEM_ID', 'system'),
    'anonymous' => [
        'enabled' => true,
        'persist' => true,
        'session_key' => 'identity_anonymous_id',
    ],
];
```

## `resolve_from_auth`

```php
'resolve_from_auth' => env('IDENTITY_RESOLVE_FROM_AUTH', true),
```

Whether `current()` may fall back to the authentication guard.

Leave it `true` for a normal web application: the person clicking the button is the
actor, and asking the guard is the obvious way to find that out.

Set it `false` for a **headless** application — an API hub, an import pipeline, a
worker-only service — where the actor is always passed explicitly and a guard
fallback would silently attribute work to whoever happened to be authenticated.

With it off, `current()` consults `actingAs` and then the fallback, and never the
guard.

## `system_id`

```php
'system_id' => env('IDENTITY_SYSTEM_ID', 'system'),
```

The actor id used for schedulers, webhooks and queue workers — anything with no
person behind it. It ends up in `activities.actor_id` and anywhere else a consumer
persists the identity, so it is worth setting to something meaningful on a
multi-service install:

```dotenv
IDENTITY_SYSTEM_ID=importer
```

Then a ledger row recorded by your nightly import is distinguishable from one
recorded by the web app, without either of them having to say so explicitly.

## `anonymous`

```php
'anonymous' => [
    'enabled' => true,
    'persist' => true,
    'session_key' => 'identity_anonymous_id',
],
```

Governs the pseudonymous visitor id used for pre-identification activity.

| Key | Effect |
| --- | --- |
| `enabled` | `false` makes the resolver return `null` forever. No anonymous ids exist. |
| `persist` | `false` returns a one-way hash of the session id and **writes nothing** |
| `session_key` | Where the UUID is stored in the existing session |

The bundled `SessionAnonymousIdResolver` stores a UUID in the session your
application already has, and deliberately **sets no cookie of its own**, so it
creates no additional consent surface. That is the design constraint the three
settings above exist to satisfy.

### Choosing a setting

| You want | Set |
| --- | --- |
| Stable anonymous attribution across a visit, no new cookie | the defaults |
| No writes to the session at all, per-session pseudonym only | `persist => false` |
| No anonymous identification whatsoever | `enabled => false` |

`persist => false` is the interesting middle ground: you still get a stable id
within the session, derived rather than stored, and nothing is written anywhere.
It is the right setting for a site whose cookie banner promises exactly that.

::: tip This is a privacy setting, so decide it deliberately
The default (`enabled`, `persist`) is the most useful and is defensible because it
reuses an existing session and sets no cookie. But whether *any* pseudonymous
identifier is acceptable is your call, not the package's, and turning it off breaks
nothing: consumers simply record facts without an `anonymous_id`.
:::

## What is not configurable

- **The resolution order.** It is documented and fixed; extend it with a resolver
  rather than reordering it. See [Resolving](/identity-contracts/resolving).
- **The fallback.** `anonymous()` in HTTP, `system()` in the console. A configurable
  fallback would make "who did this" environment-dependent.
- **Whether resolution can throw.** It cannot, by design.

## Environment summary

```dotenv
IDENTITY_RESOLVE_FROM_AUTH=true
IDENTITY_SYSTEM_ID=system
```

`anonymous.*` has no environment variables; it is a config-file decision.
