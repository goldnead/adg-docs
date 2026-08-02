# Grant state

<AddonHeader />

Four states, one row per address per resource per brand, and a deliberate deviation from the
platform's target architecture. The deviation is on this page rather than in a footnote, because
a reader who finds it by accident will read it as an oversight.

## The deviation

The platform's target architecture puts grants in `goldnead/statamic-entitlements` and has every
consumer read them from there. At the time this addon was built **that package did not exist**:
it was deferred until a second consumer justified designing the shared abstraction.

Taking the target architecture literally would have meant not building this addon at all. So the
state lives here. The reasoning is recorded in the docblock of `GrantState` itself:

> The platform's target architecture puts entitlements in a package of their own
> (`goldnead/statamic-entitlements`) and has every consumer read grants from there. That package
> is deferred: it is waiting for a second consumer before its abstraction is worth designing, and
> lead-magnets is meant to be that consumer. Taking the target architecture literally would mean
> not building this addon at all.

### What it costs

**Two grant models.** [Entitlements](/entitlements/) now exists, and it has its own grant table
with its own state machine. An installation running both has grants in two places, and neither
knows about the other.

**A migration, eventually.** Moving this package onto entitlements means moving rows, both
idempotency guarantees, the confirmation token and the middleware that derives a brand from it,
the two meanings of `expires_at`, the download counter and its audit table, and the ceiling rule
that stops a signed link outliving the access it belongs to.

**The state strings are effectively public API.** `GrantState::ALL` is serialised into the
Control Panel payload and `state` into every event payload. The README's claim that a swap would
be "an internal one" is accurate at the naming level and optimistic in practice: the facade
returns a `Grant`, and `revoke()` and `reinstate()` take one.

### What it buys

The addon exists, and it is the second consumer entitlements was waiting for. The alternative,
building entitlements first, designs the shared abstraction before the second real use case,
which is the order the platform's own guidance advises against.

### What it deliberately does not do

The local model is narrower than a shared entitlements package, on purpose:

| Not here | Consequence |
| --- | --- |
| No cross-addon read surface | No other package can ask "does this person have access to X" |
| No polymorphic subject | `resource_id` points only at `lead_magnet_resources`. A grant cannot describe a course, a product or a page |
| No entitlement type or scope | The resource **is** the entitlement |
| No contact-first model | The normalised email string is the subject. `contact_id` is opportunistic, written by the LeadHub bridge when it is there |
| No issuance from outside | Nothing but `GrantService` creates a grant. There is no public `grant()` another package could call |

Each of those is a thing entitlements does and this does not. If you need any of them, you need
[Entitlements](/entitlements/), and today that means two systems rather than one.

## The four states

```php
GrantState::PENDING   // 'pending'
GrantState::ACTIVE    // 'active'
GrantState::REVOKED   // 'revoked'
GrantState::EXPIRED   // 'expired'
```

```
(none)  ──▶ pending    a request for a resource that needs confirmation
(none)  ──▶ active     a request for a resource that needs none
pending ──▶ active     the confirmation arrived, exactly once
pending ──▶ expired    the confirmation window closed
active  ──▶ expired    the grant's own lifetime ran out
pending ──▶ revoked    withdrawn in the Control Panel
active  ──▶ revoked    withdrawn in the Control Panel
```

`revoked` is terminal **against the public request path**: asking for the resource again returns
the revoked grant untouched, and reinstating is a Control Panel action rather than something a
visitor can trigger.

`expired` is terminal for that grant, but a fresh request reopens the same row as `pending`.

::: tip `reinstate()` is not in the diagram, and it moves two of those arrows backwards
An editor may reinstate a revoked or expired grant from the Control Panel. It restores access
without a second confirmation, and gives a lapsed grant a fresh lifetime. The transition table in
the source docblock does not list it; the method exists and is tested.
:::

## Activation is one statement

```php
$changed = Grant::query()
    ->whereKey($grant->getKey())
    ->where('state', GrantState::PENDING)
    ->update([
        'state' => GrantState::ACTIVE,
        'confirmed_at' => $confirmedAt,
        'expires_at' => $expiresAt,
        'token_hash' => null,
        'updated_at' => $confirmedAt,
    ]);

if ($changed !== 1) {
    return false;
}
```

A second caller finds the state already `active`, changes zero rows, gets `false`, and dispatches
nothing. There is no window between reading and writing, so it holds against a double-clicked
link, a mail scanner prefetching the URL, a queue retry and two web workers at once.

`ResourceConfirmed` fires only on the call that changed exactly one row. The delivery mail follows
that event, so it is sent once.

## `expires_at` means two different things

This is the subtlety worth knowing before you read a row.

| While the grant is | `expires_at` holds |
| --- | --- |
| `pending` | The confirmation window: "you have three days to confirm" |
| `active` | The access lifetime: "your access lasts a year", or nothing at all |

Activation switches the clock. Leaving the confirmation deadline in place would silently expire
every grant three days after it was confirmed, which is the kind of defect that surfaces weeks
later as "the download link stopped working".

The pending window comes from `requests.confirmation_ttl_hours` (default 72). The active lifetime
comes from the resource's `grant_ttl_days`, then `delivery.grant_ttl_days`, and `null` means the
access does not expire.

## Access is decided by the date, not by the state column

```php
public function hasLapsed(): bool
{
    return $this->expires_at !== null && $this->expires_at->isPast();
}

public function isRedeemable(): bool
{
    return $this->isActive() && ! $this->hasLapsed() && ! $this->downloadsExhausted();
}
```

`hasLapsed()` reads the timestamp rather than the `state` column, so **no access decision depends
on the sweep having run**. A grant whose lifetime passed an hour ago refuses immediately, whether
or not `lead-magnets:sweep` has been near it.

The sweep is housekeeping: it moves lapsed rows to `expired` and clears their tokens so the
Control Panel tells the truth and dead tokens stop resolving. It is not a gate.

`isRedeemable()` is the single question every delivery path asks: the download controller, the
delivery service, the re-send action and the request path.

## Uniqueness

```
unique (brand_id, resource_id, email)
```

One grant per address per resource **per brand**. The README says "per address per resource"; the
brand is the third column and it matters on a multi-brand install.

The address is normalised before it is stored: trimmed, and both sides of the last `@`
lowercased. Dots and `+tags` are deliberately **not** stripped, because `a.b@gmail.com` and
`ab@gmail.com` are the same mailbox at one provider and different mailboxes at another, and
guessing which is worse than not guessing.

## The confirmation token

```php
ConfirmationToken::mint();   // bin2hex(random_bytes(32)), 64 hex characters
ConfirmationToken::hash($token);   // sha256
ConfirmationToken::matches($token, $hash);   // hash_equals
```

The plaintext exists in exactly two places: the URL in the confirmation mail, and a public
in-memory property on the grant that the service sets so the mail can carry it. It is never
persisted and never serialised. `token_hash` is `$hidden` on the model, and no event payload
carries either.

The hash column is unique across all brands, which is what lets the confirmation route derive a
brand from the token alone.

It is cleared on activation, and also by `revoke()` and by the sweep. After activation the token
resolves to nothing and a second visit to the link answers **404**, indistinguishable from a
token that never existed.

## Revocation defeats a valid signature

A revoked grant holds download links that verify perfectly. The signature proves the link was
issued; whether the access still stands is a separate question, and the controller asks it
separately.

```php
abort_unless($record !== null && $record->isRedeemable(), 403);
```

That check runs after Laravel's `signed` middleware has already passed. Revoking is therefore
effective immediately, against links already sitting in somebody's mailbox.
