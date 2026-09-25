# Reference

<AddonHeader />

## PHP API

Everything the tags and the Control Panel do goes through services another addon can call
directly: an API layer, a site's own controller. All take a `Statamic\Auth\User`.

```php
use Goldnead\Accounts\Facades\Accounts;

Accounts::verification()->isVerified($user);            // bool
Accounts::verification()->send($user);                  // bool, false when already confirmed
Accounts::verification()->url($user);                   // signed link
Accounts::verification()->verify($userId, $hash);       // ?User; checks the address hash
Accounts::verification()->markVerified($user, $by);

Accounts::emailChange()->request($user, 'new@example.com');   // AccountRequest; throws AccountException
Accounts::emailChange()->pending($user);                      // ?AccountRequest
Accounts::emailChange()->confirm($requestId, $hash);          // User; throws AccountException
Accounts::emailChange()->cancel($user);                       // bool

Accounts::deletion()->blockers($user);        // list<string>
Accounts::deletion()->request($user, $by);    // AccountRequest (idempotent while pending); throws AccountException
Accounts::deletion()->pending($user);         // ?AccountRequest, ->due_at
Accounts::deletion()->cancel($user, $by);     // bool
Accounts::deletion()->graceDays();            // int
Accounts::deletion()->purgeDue();             // int, what accounts:purge runs

Accounts::export()->collect($user);           // ['manifest' => …, 'sections' => [key => array]]
Accounts::export()->build($user, 'customer'); // ['path', 'filename', 'mime']; the caller deletes the file

Accounts::overview()->for($user);             // the customer overview as arrays
Accounts::impersonation()->allowed($admin, $user);
Accounts::impersonation()->start($admin, $user);   // redirect URL; throws AuthorizationException

Accounts::contributeData(MyContributor::class);
Accounts::eraseData(MyEraser::class);
Accounts::erasure()->erase($user);            // array<key, ErasureResult>; normally only via the purge
```

`emailChange()->request()`, `deletion()->request()` and `export()->build($user, 'customer')`
refuse while an impersonation is active. They do **not** check the elevated session: that is
the caller's HTTP concern. This addon's controllers check it; an API layer decides for itself.

## Exceptions

`Goldnead\Accounts\Exceptions\AccountException` carries a customer-facing message and the
form `field` it belongs to, ready to become a 422. `field = impersonation` means the call was
refused because an admin is signed in as the customer; `field = account` carries the reasons a
deletion is blocked.

## Contracts

| Contract | Registered with | See |
| --- | --- | --- |
| `Contracts\ContributesPersonalData` | `Accounts::contributeData()` or the tag `accounts.personal-data` | [The data export](/accounts/export) |
| `Contracts\ErasesPersonalData` | `Accounts::eraseData()` or the tag `accounts.personal-data-erasers` | [Deleting an account](/accounts/deletion) |

## Routes

Frontend routes sit under `/!/statamic-accounts/`, named `statamic.accounts.*`, with the `web`
middleware group:

| Method | Path | Name | |
| --- | --- | --- | --- |
| GET | `verify/{user}/{hash}` | `verify` | signed, `throttle:6,1` |
| GET | `email/confirm/{request}/{hash}` | `email.confirm` | signed, `throttle:6,1` |
| GET | `deletion/cancel/{request}` | `deletion.cancel` | signed, `throttle:6,1` |
| POST | `verification/resend` | `verification.resend` | `throttle:6,1` |
| POST | `email` | `email.change` | `throttle:6,1`, elevated session |
| POST | `email/cancel` | `email.cancel` | |
| POST | `deletion` | `deletion.request` | `throttle:6,1`, elevated session |
| POST | `deletion/withdraw` | `deletion.withdraw` | |
| GET | `export` | `export` | elevated session, `export.throttle` (since 0.1.1) |

Control Panel routes sit under `/cp/accounts`: the customer list, `wiring`, and
`customers/{user}` with its actions (export, confirmation resend and mark, deletion schedule
and cancel, impersonate).

## Middleware

| Alias | |
| --- | --- |
| `accounts.verified` | Sends a signed-in user without a confirmed address to `verification.notice_url`; 403 for JSON. Guests pass. |

## Permissions

| Permission | Allows |
| --- | --- |
| `view accounts` | the list, the overview, the wiring screen |
| `manage accounts` | send the confirmation link, mark as confirmed, withdraw a deletion |
| `export account data` | the export from the Control Panel |
| `manage accounts settings` | the settings screen (with Brand Context) |
| `delete users` (core) | schedule a deletion; a super admin only by a super admin |
| `impersonate users` (core) | "Sign in as" |

## Table

`account_requests`, one row per address change or deletion request:

| Column | |
| --- | --- |
| `id` | |
| `user_id` | string(64), indexed; integer, uuid or file user id |
| `type` | `email_change` or `deletion` |
| `email` | the new address for a change; cleared on a deletion record |
| `status` | `pending`, `completed`, `cancelled` or `blocked` (a deletion only) |
| `due_at` | when a deletion is due |
| `resolved_at` | when it was confirmed, withdrawn or carried out |
| `meta` | JSON; on a deletion record the row counts per eraser, never an address |
| `created_at`, `updated_at` | |

Index on `(type, status, due_at)`.

## Commands

| Command | |
| --- | --- |
| `php please accounts:purge` | Deletes the accounts whose grace period is over. Scheduled daily at 03:40. |
