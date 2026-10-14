# Claiming a resource

<AddonHeader />

A team can claim a resource your site owns, a directory profile for example. Someone asks, a
reviewer decides, and on approval Teams creates the team and binds the resource to it, in one
transaction. Added in 0.4.0.

**Claiming is opt-in.** Out of the box nothing can be claimed: the default policy denies every
request and every review, and no resource type is registered.

There are no routes and no Control Panel screens for claims. A site builds the form and the
review screen on `ClaimService`.

## Switching it on

You provide two things in `config/teams.php`:

```php
'claims' => [
    // 1. One adapter per resource type you want to be claimable
    'resources' => [
        'directory' => \Goldnead\Directory\Claims\DirectoryClaimResource::class,
    ],

    // 2. Who may request and who may review
    'policy' => \App\Claims\MyClaimPolicy::class,

    'limits' => [
        'max_per_account' => 3,
        'window_minutes' => 1440,
        'rejected_cooldown_minutes' => 1440,
    ],
],
```

**The policy** implements `Goldnead\Teams\Contracts\ClaimPolicy`:

```php
public function assertCanRequest(User $actor): void;  // throw to refuse
public function assertCanReview(User $actor): void;   // throw to refuse
```

The default, `DenyClaimPolicy`, throws `forbidden` for both.

**A resource adapter** implements `Goldnead\Teams\Contracts\ClaimResource`:

```php
public function lock(string $key, string $site): void;       // lock the row; fail if no longer claimable
public function teamName(string $key, string $site): string; // the name the new team gets
public function bind(string $key, string $site, Team $team): void; // persist the binding only
```

Teams owns the transaction. The adapter must not open its own. The [Directory](/directory/)
ships one: [Claiming a profile](/directory/claiming).

## The flow

```php
use Goldnead\Teams\Services\ClaimService;

$claims = app(ClaimService::class);

$claim = $claims->request('directory', $entryId, $site, $actor, $justification, $contact);

$claims->approve($claim->id, $reviewer, 'Verified by phone.');
$claims->reject($claim->id, $reviewer, 'Could not verify.');
```

| Step | What happens |
| --- | --- |
| `request()` | Checks the policy, the input bounds and the limits, locks the resource, stores a `pending` claim and a `requested` outbox row, then fires `ClaimRequested`. |
| `approve()` | Checks the policy, locks resource, claimant account and claim in that order, creates the team **owned by the claimant**, binds the resource, stores `approved`, writes a `decided` outbox row and fires `ClaimDecided`. |
| `reject()` | The same locks (a missing adapter or an unavailable target does not stop a rejection), stores `rejected`. A note is required. |

**Rules worth knowing:**

- **A second identical request** (same type, key, site and claimant) while one is pending returns
  the pending claim and fires nothing again.
- **A claimant cannot review their own claim** (`claim_conflict`).
- **A decision is final.** Deciding a claim that is not pending is `claim_conflict`.
- **Approval re-checks the claimant.** The account must still exist and still pass
  `assertCanRequest`.
- **Bounds:** type up to 64 characters (letters, digits, `_`, `-`), key up to 191, site up to 64,
  justification 20 to 5000, contact 3 to 255, decision note up to 2000.

## Limits

Per account, set in `teams.claims.limits`, `0` switching a limit off:

| Key | Default | |
| --- | --- | --- |
| `max_per_account` | `3` | Requests an account may make within the window. Over it: `rate_limited`. |
| `window_minutes` | `1440` | The window, one day. |
| `rejected_cooldown_minutes` | `1440` | After a rejection, the same account may not ask again for the same resource for this long. Inside it: `cooldown`. |

Limits are enforced under a lock per account (`team_claim_limit_locks`), so two simultaneous
requests cannot both slip under the maximum. A value that is not a non-negative integer is a
configuration error, not a silent default.

## Refusals

`ClaimException` carries a `reason`:

| Reason | |
| --- | --- |
| `claim_unknown_resource` | No adapter registered for that type. |
| `claim_not_found` | |
| `claim_conflict` | Already decided, self-review, claimant gone. |
| `claim_invalid` | A value outside its bounds, or an actor without a stable user id. |
| `claim_resource_unavailable` | The adapter says the target is not claimable. |
| `rate_limited` | Over `max_per_account` in the window. |
| `cooldown` | Asked again too soon after a rejection. |

A policy refusal is Teams' usual `forbidden` (403).

## Events and the outbox

| Event | When |
| --- | --- |
| `ClaimRequested` | A claim was created. After commit. |
| `ClaimDecided` | A claim was approved or rejected. After commit. |

These two are plain Laravel events. Unlike the thirteen events in
[Mails and events](/teams/mails-and-events), they are **not** part of the event catalogue, so
they are not offered as Automations triggers, Webhook Manager events or Activity entries on their
own; listen to them yourself.

A listener can still miss an event between the database write and the notification, so every
request and every decision also writes a row to `team_claim_outbox` in the same transaction as
the claim. It records that the event happened (claim, kind `requested` or `decided`, status,
time) and has columns for `available_at`, `processed_at`, `attempts` and `last_error_code`. The
package writes these rows; **it ships no worker that sends or marks them**, so processing them is
yours.

## Personal data {#personal-data}

A claim holds a justification and a contact, so it is personal data. With
[Accounts](/accounts/) installed, claims join the personal data export (`TeamClaimsContributor`)
and the erasure (`TeamClaimsEraser`).

Erasing the claimant: their outbox rows and limit lock are deleted; justification and contact are
emptied, `claimant_id`, the pending key and the decision note are cleared; a claim still pending
becomes `withdrawn`; a decided claim keeps its status. Erasing a *reviewer* clears `decision_by`
and the note on the claims they decided. The team a claim created is not touched by this; it is a
team like any other.

## Tables

| Table | |
| --- | --- |
| `team_claims` | The claim: resource type, key and site, claimant, justification, contact, status (`pending`, `approved`, `rejected`, `withdrawn`), the team created, the decision. |
| `team_claim_limit_locks` | One row per claimant, the lock the limits are enforced under. |
| `team_claim_outbox` | One row per `requested` or `decided`, unique per claim and kind. |

Run `php artisan migrate` after updating to 0.4.0.
