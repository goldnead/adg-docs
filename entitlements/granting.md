# Granting and revoking

<AddonHeader />

Six write methods, all on the facade, all idempotent in the way their name implies.

## Granting

```php
use Goldnead\Entitlements\Facades\Entitlements;

$entitlement = Entitlements::grant(
    subject: $user,
    productSlug: 'stimmbeherrschung',
    source: 'thrivecart',
    sourceRef: 'ORDER-8812',
    expiresAt: now()->addYear(),
    meta: ['plan' => 'annual'],
    actor: Identity::system('thrivecart-webhook'),
);
```

`subject` and `productSlug` and `source` are required. Everything else is optional.

`startsAt` defaults to now, so a grant with no start is live immediately. Pass a future one and the
grant is `Scheduled`: it grants nothing today, becomes active by the clock, and fires no event
until the [announcement pass](/entitlements/states#the-clock-causes-two-transitions-and-they-are-announced)
reports it.

A blank product slug or a blank source throws `InvalidArgumentException`. Both are what the grant
is *about*, and a grant with an empty one is not a grant.

### What a repeat does

```php
Entitlements::grant($user, 'stimmbeherrschung', 'thrivecart', 'ORDER-8812');
Entitlements::grant($user, 'stimmbeherrschung', 'thrivecart', 'ORDER-8812');   // same row
```

One row, returned unchanged, and **no event**. The unique index is the guarantee, not a check in
PHP: if the initial select misses and the insert collides, the violation is caught, the winner's row
is re-read, and the loser returns it.

Three rules the repeat follows:

- **It never widens an existing window.** A second call with a later `expiresAt` does not extend the
  grant. Extending is a different intention and needs a different write.
- **It never resurrects a revoked grant.** A revoked row stays revoked and nothing fires. Use
  `restore()`, which is a deliberate act with its own permission.
- **It does lift a pending grant to active**, in place, firing `EntitlementGranted` once.

A repeat purchase carries a **new** `source_ref` and therefore produces a second row, deliberately.
So does the same product from a different source, and the same grant in a second brand. The tuple is
not narrower than it needs to be. See
[Reference](/entitlements/reference#source-ref-is-not-null-and-that-is-the-point).

## Parking a grant, then claiming it

For a confirm-first flow: park the access without granting it, then claim it exactly once when the
confirmation arrives.

```php
$entitlement = Entitlements::grantPending(
    subject: $contact,
    productSlug: 'warmup-routine',
    source: 'lead-magnet',
    sourceRef: 'REQ-4417',
);

// … the person confirms …

if (Entitlements::claimPending($entitlement)) {
    // exactly one caller ever gets here
}
```

`claimPending()` is a conditional update guarded on `status = 'pending'` and an affected-row check.
The winner refreshes and fires `EntitlementGranted` with `previousState: Pending`. Every other
caller returns `false`, silently, having written nothing.

That is what makes a double-clicked confirmation link, a mail scanner prefetching the URL and a
queue retry all produce one activation.

`false` is not an error. Do not retry on it.

`grantPending()` **never downgrades an existing active grant**. Parking something somebody already
has does nothing.

## Revoking

```php
Entitlements::revoke($entitlement, reason: 'Refunded, ticket #4417');
```

The reason is **mandatory** and is trimmed before it is checked. An empty one throws:

```
InvalidArgumentException: A revocation needs a reason.
```

A revocation nobody can explain six months later is not auditable, and the extracted system had
exactly that: rows that stopped granting access with no record of why.

The write is conditional on the grant not already being revoked, so two simultaneous revocations
produce one event. `EntitlementRevoked` carries the reason, the state read **before** the write, and
the actor.

Both signals are written, `status = 'revoked'` and `revoked_at`, and the resolver answers on either.

The reason is truncated to 255 characters.

## Restoring

```php
Entitlements::restore($entitlement);
```

A separate decision, with a separate permission. In the Control Panel it needs
`grant entitlements`, not `revoke entitlements`, because restoring is granting.

It clears `revoked_at` and `revoked_reason` and sets the status back to active. Then, **only if the
grant now resolves to `Active`**, it fires `EntitlementGranted` with `previousState: Revoked`.

A grant whose window closed while it was revoked resolves to `Expired` and announces nothing. That
is correct: nothing was restored, because there was nothing left to restore.

Restoring something that was never revoked returns `false` and does nothing.

## Grace periods

```php
Entitlements::enterGracePeriod($entitlement, now()->addWeek());
```

Grants access past the expiry until the grace ends. It takes no actor and **fires no event**, and it
returns `false` on a revoked grant.

See [The state machine](/entitlements/states#grace-periods).

## The actor

Five of the six write methods take an optional `Identity` from
[Identity Contracts](/identity-contracts/), and it is carried into three of the four events.

```php
use Goldnead\IdentityContracts\Identity;

Entitlements::grant(
    subject: $user,
    productSlug: 'stimmbeherrschung',
    source: 'thrivecart',
    actor: Identity::system('thrivecart-webhook'),
);

Entitlements::revoke($entitlement, 'Refunded', Identity::user(
    id: (string) $admin->getAuthIdentifier(),
    email: $admin->email,
));
```

An `Identity` rather than a user model, so nothing in this package reaches for your `User` class.
The Control Panel builds one from the signed-in user for every write it performs.

`EntitlementExpired` carries no actor. There is none: the clock did it.

## Subjects

Anything the resolver can turn into a type and an id.

```php
Entitlements::grant($user, …);                           // an Eloquent model
Entitlements::grant($contact, …);                        // a LeadHub contact, same way
Entitlements::grant(new SubjectReference('contact', '4417'), …);
```

A model goes through `getMorphClass()`, so a registered morph alias wins over the class name. Set
one up before you have many rows: a morph map is what stops a class rename from orphaning every
grant.

An **unsaved** model throws, because it has no key to grant to.

```
InvalidArgumentException: Cannot grant to an unsaved App\Models\User: it has no key yet.
```

Two different subject types with the same id stay apart. `user:17` and `contact:17` are two
subjects.

There is no LeadHub bridge and none is needed. The subject columns are polymorphic strings, so a CRM
contact is a valid subject with no coupling to any addon.

## Asking

```php
Entitlements::allows($user, 'stimmbeherrschung');   // bool

$decision = Entitlements::decide($user, 'stimmbeherrschung');
$decision->allowed;      // bool
$decision->reason;       // 'ENTITLED' | 'NOT_ENTITLED'
$decision->state;        // the state that decided it, or null
$decision->entitlement;  // the grant, or the closest one on a refusal
```

`decide()` is the one to reach for in a UI. A refusal carries the **closest** grant when there is
one, ordered so an open-ended grant outranks a dated one and the latest expiry comes first, which is
what lets a page say "your access ran out in March" rather than "no".

```php
Entitlements::activeProductSlugsFor($user);   // ['stimmbeherrschung', 'chorleiter-basis']
```

Only slugs that actually grant access, deduplicated.

::: warning A superuser gets no special treatment
The extracted system had a `SUPER_USER` reason that short-circuited every check. It is deliberately
absent, and a test asserts it. Access is a property of grants, not of the person asking.

If your application wants an override, put it in your application, where it is visible.
:::

## Bundles

`decide()` and `allows()` also check any product that **contains** the requested one, resolved
through the `PackageResolver` contract.

The default resolver returns nothing, so bundles do not exist until you bind one. See
[Extending](/entitlements/extending#packageresolver).
