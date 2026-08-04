# The state machine

<AddonHeader />

Six states. Four are stored in the `status` column; two are read off the clock and never written.

| State | Stored | Grants access |
| --- | --- | --- |
| `Pending` | yes | no |
| `Scheduled` | **no, derived** | no |
| `Active` | yes | **yes** |
| `GracePeriod` | yes | **yes** |
| `Expired` | **no, derived** | no |
| `Revoked` | yes | no |

## Why two of them are derived

Because the clock moves and the database does not.

A grant that starts next Monday is `Scheduled` today and `Active` on Monday, without anybody
writing to it. Storing that would mean a job whose lateness changes what a customer can do, and a
`status` column that is right only as recently as the last run.

The system this package was extracted from stored it, and reported a not-yet-started grant as
**expired** on the customer's own account screen. `Scheduled` exists as a state of its own because
of that.

`Expired` is the same argument from the other end.

## The resolution order

```php
// 1  Revocation wins absolutely, before every time check.
if ($entitlement->revoked_at !== null || $status === EntitlementState::Revoked->value) {
    return EntitlementState::Revoked;
}

// 2  Parked. Nothing about the clock can activate it.
if ($status === EntitlementState::Pending->value) {
    return EntitlementState::Pending;
}

// 3  Grace outlives the expiry, and then ends.
if ($status === EntitlementState::GracePeriod->value) {
    return $entitlement->grace_until !== null && $entitlement->grace_until->greaterThan($now)
        ? EntitlementState::GracePeriod
        : EntitlementState::Expired;
}

// 4  Not open yet.
if ($entitlement->starts_at !== null && $entitlement->starts_at->greaterThan($now)) {
    return EntitlementState::Scheduled;
}

// 5  `<=`, not `<`: the instant of expiry is already outside.
if ($entitlement->expires_at !== null && $entitlement->expires_at->lessThanOrEqualTo($now)) {
    return EntitlementState::Expired;
}

// 6
return EntitlementState::Active;
```

Two properties of that order are worth naming.

**Revocation answers on either signal.** `revoked_at` set *or* `status = 'revoked'` is enough. A
half-written revocation therefore still reads as revoked, which is the safe direction. The
package deliberately does **not** enforce that the two agree, and the test suite tests the
contradiction rather than the invariant.

**An unknown status falls through.** A `status` this package does not recognise, for instance a
legacy value from an older system, is not special-cased: it drops through branches 2 to 6 and an
open window resolves it to `Active`. That is documented pre-existing behaviour, kept rather than
changed silently.

## The SQL projection is pinned to the PHP

Every read that touches many rows needs the same logic in SQL:

```php
StateResolver::constrain($query, EntitlementState::Expired);
StateResolver::constrainToAccess($query);
```

Two implementations of a state machine is two things to get wrong, so the two are pinned to each
other by a test over the **full cartesian product**: five statuses by three `starts_at` values by
three `expires_at` values by three `grace_until` values by two revocation signals. Two hundred and
seventy rows, and for each of the six states the SQL projection and the PHP resolution must select
exactly the same ids. The test also asserts that every state is represented, so the pin cannot pass
by covering nothing.

`constrainToAccess()` is deliberately not `constrain(Active) OR constrain(GracePeriod)`. It is a
single clause, because the two overlap in ways that an `orWhere` over two full projections gets
subtly wrong.

## Access is OR across grants

A subject has access as soon as **any** of their grants for that product is `Active` or
`GracePeriod`.

That is load-bearing rather than incidental. A refunded purchase sitting next to a valid one must
not remove access, and an expired trial next to a paid licence must not either. The question is
"is there a grant that lets them in", not "are all their grants in order".

```php
Entitlements::allows($user, 'stimmbeherrschung');
```

## Grace periods

```php
Entitlements::enterGracePeriod($entitlement, now()->addWeek());
```

Sets `status = 'grace_period'` and a `grace_until`. The grant then grants access **past its
expiry**, until the grace ends.

Two things to know:

- It **fires no event** and takes no actor. It is a write, and the announcement pass will report
  the eventual expiry.
- It refuses on a revoked grant, returning `false`.

A `grace_period` status with **no** `grace_until` resolves to `Expired`, not to an unbounded
grace. Branch 3 requires the timestamp.

`EntitlementExpired` for a grace period reports `grantedAccessUntil = grace_until` rather than
`expires_at`, because that is when access really ended.

## The clock causes two transitions, and they are announced

Nothing writes to the database when a scheduled grant becomes active or an active one expires. That
is the point of deriving them, and it means no event fires either.

```bash
php artisan entitlements:announce
```

The pass finds grants whose resolved state has moved past what was last announced, claims the
transition with a conditional update on `announced_state`, and fires the event.

| Transition | Event | Previous state |
| --- | --- | --- |
| Scheduled becomes Active | `EntitlementGranted` | `Scheduled` |
| Active or GracePeriod ends | `EntitlementExpired` | none carried |

`announced_state` holds the **last announced state**, so one column serves both transitions. The
claim is a conditional update, so a pass that runs twice announces once, and two passes racing
announce once.

**Register the schedule yourself.** The package does not:

```php
Schedule::command('entitlements:announce')->everyFifteenMinutes();
```

::: warning The announcement pass is not a gate
Access never depends on it. `state()` reads the clock directly, so a scheduled grant becomes usable
at its start instant whether or not the pass has run. What the pass produces is the **event**, so a
consumer can send the welcome mail.

Running it late delays mail. It does not delay access.
:::

The pass runs for every brand in turn, which is why two of the indexes deliberately omit
`brand_id`. `--brand` narrows it and `--limit` bounds one run, with the remainder picked up next
time.

## What never fires

- Creation of a `Scheduled` grant. It fires when the pass activates it.
- `enterGracePeriod()`.
- A grant imported already expired. It gets the marker and no event, so a backfill does not mail
  three years of history.
- A repeated `grant()` on an existing row.
- A revocation or a restore that lost its conditional update.

## Times are UTC

Storage, comparison and the Control Panel display are all UTC, and the Control Panel labels every
timestamp with a literal `UTC` so nobody has to guess.

A `DateTimeInterface` keeps its own zone and is converted:

```php
Entitlements::grant(
    subject: $user,
    productSlug: 'stimmbeherrschung',
    source: 'manual',
    expiresAt: new DateTimeImmutable('2027-01-15 19:00', new DateTimeZone('Europe/Berlin')),
);
// stored as 2027-01-15 18:00:00
```

A bare string with no zone is parsed as **UTC**, never as the application timezone, because
guessing the app timezone would make the same literal mean different instants on two servers.

The test bed pins `app.timezone` to `America/Chicago`, deliberately neither UTC nor any zone the
tests use, so a missing conversion cannot hide.
