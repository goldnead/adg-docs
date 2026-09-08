# Grant state

<AddonHeader />

One grant row per address per resource per brand, and the state on it lives somewhere else.
Since 3.0 this package does not decide who has access. It records who asked, mails them, and
counts the downloads; [Entitlements](/entitlements/) holds the state and answers the question.

## Where the state went

Until 3.0 this package owned the four states itself. It had to: `goldnead/statamic-entitlements`
did not exist, having been deferred until a second consumer justified designing the shared
abstraction, and this addon was meant to be that consumer. Taking the target architecture
literally at the time would have meant not building the addon at all.

Entitlements exists now, and **it is a hard Composer requirement of this package**, not one of
the optional bridges. That is a deliberate difference from the five siblings this
addon detects with `class_exists()`.

| | Before 3.0 | Now |
| --- | --- | --- |
| The states | `GrantState` in this package | `Goldnead\Entitlements\Enums\EntitlementState` |
| Where the row lives | `lead_magnet_grants.state` | `entitlements.status` |
| Who may ask | this package only | any package, through `Entitlements::allows()` |
| The subject | the normalised email string | an entitlements subject reference, `email:<address>` |
| Activation | a conditional update here | `Entitlements::claimPending()` |
| The delivery mail | fired by `ResourceConfirmed` | fired by entitlements' `EntitlementGranted` |

The grant row stayed, as the **delivery record**: the address, the resource, the confirmation
token and its deadline, the attempt number, the download counter and the audit trail. `entitlement_id` is the link between the two,
and it is unique. One grant, one entitlement.

### Migrating an existing install

```bash
php artisan lead-magnets:migrate-grants
```

It reads each legacy grant's old state and writes the matching entitlement, and it is
idempotent: a second run changes nothing. The migration that drops the legacy `state` column
refuses to run while any grant still has no `entitlement_id`, so the old state cannot be thrown
away before it has been carried across.

### What this bought

Every line in the "deliberately does not do" table this page used to carry is now done. Another
package can ask whether an address has access. The subject is a reference rather than a bare
string, so a grant is no longer restricted to describing a file. Revocation, grace periods and
expiry are one state machine with one audit trail, shared with payments and subscriptions.

## The states

```php
EntitlementState::Pending      // 'pending'
EntitlementState::Active       // 'active'
EntitlementState::Revoked      // 'revoked'
EntitlementState::Expired      // 'expired'
```

Entitlements defines two further states, `Scheduled` and `GracePeriod`, which this package
never writes. It reads them, and a grant whose entitlement is in a grace period still
delivers. A lead magnet has no reason to create either.

```
(none)  ──▶ pending    a request for a resource that needs confirmation
(none)  ──▶ active     a request for a resource that needs none
pending ──▶ active     the confirmation arrived, exactly once
pending ──▶ expired    the confirmation window closed
active  ──▶ expired    the access lifetime ran out
pending ──▶ revoked    withdrawn in the Control Panel
active  ──▶ revoked    withdrawn in the Control Panel
```

`revoked` is terminal **against the public request path**: asking for the resource again returns
the revoked grant untouched. Someone withdrew that access deliberately, and a form submission is
not the place to overturn it, or anyone who knows the address could undo a moderation decision.
Reinstating is a Control Panel action. `scheduled` is left alone for the mirror-image reason: an
operator set a start date, and a request does not move it.

**An expired grant gets a second entitlement rather than a revived one.** The grant row is the
same one, its `attempt` counter goes up, and the expired entitlement stays as a true record
of an access period that happened. Entitlements answers over all of a subject's rows as an OR,
so repeat access is meant to look like a second row.

::: tip `reinstate()` is not in the diagram
An editor may reinstate a revoked or expired grant from the Control Panel. A revoked one is
restored; one that was never confirmed is confirmed on the reader's behalf, through the same
atomic path the link takes; one whose window has meanwhile closed gets a fresh window rather
than a fresh confirmation.
:::

## Activation is two statements, in this order

```php
// 1. Write the access window, conditional on the entitlement still being pending.
$this->openWindow($entitlement, $resource, onlyWhilePending: true);

// 2. Claim the row. This is the statement that decides the winner.
return Entitlements::claimPending($entitlement);
```

The listener that mails the download link builds that link against
the access window, so the window has to be in place before the claim fires. A link signed
before its window existed would outlive the access it was issued for.

**Only step 2 decides who won.** Step 1 carries the same `pending` condition, but its
affected-row count must never be read as the answer: MySQL reports zero changed rows for an
update that writes a value the column already holds, and the common case here is exactly that,
a resource with no lifetime writing null over null. Code that read a winner out of that count
passes on SQLite, which counts matched rows instead, and activates nothing on MySQL.

A second caller finds the entitlement already active, changes zero rows, gets `false`, and
dispatches nothing. It holds against a double-clicked link, a mail scanner prefetching the URL,
a queue retry and two web workers at once.

The delivery mail follows entitlements' own `EntitlementGranted`, and only for a transition out
of `pending`, so it is sent once.

## Two deadlines, on two rows

Version 1.x kept both in one column and that was a defect: leaving the confirmation deadline in
place silently expired every grant three days after it was confirmed, which surfaces weeks
later as "the download link stopped working". They are separate columns now, on separate rows.

| Deadline | Where it lives | Comes from |
| --- | --- | --- |
| The confirmation window | `lead_magnet_grants.confirm_expires_at` | `requests.confirmation_ttl_hours`, default 72 |
| The access lifetime | the entitlement's `expires_at` | the resource's `grant_ttl_days`, then `delivery.grant_ttl_days`; `null` means it does not expire |

The first belongs to the token, the second to the access. Nothing has to switch one into the
other any more.

## Nothing has to run for access to end

```php
public function hasLapsed(): bool
{
    return $this->state() === EntitlementState::Expired;
}

public function isRedeemable(): bool
{
    return $this->state()->grantsAccess() && ! $this->downloadsExhausted();
}
```

`state()` asks entitlements, whose resolver reads the clock. In 1.x `state` was a column that
whoever noticed first wrote, so a row could be past its date and still say `active` until
something swept it.

`isRedeemable()` asks `grantsAccess()` rather than comparing against `Active`, so a grace period
keeps the download working. The list of states that open a door lives on the enum, once.

`lead-magnets:sweep` is all that is left of the old sweep. It clears confirmation tokens whose
window has closed, so a leaked backup holds fewer usable tokens. It is housekeeping, and no
access decision waits on it.

::: tip Entitlements has a scheduled command of its own
`entitlements:announce` is what fires `EntitlementExpired` when the clock passes a date.
Scheduling it is the host application's job rather than this addon's, because it is shared by
every consumer of the package.
:::

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
