# Deleting an account

<AddonHeader />

A customer asks for deletion with `{{ accounts:delete_form }}`, or an admin schedules it
from the [customer overview](/accounts/control-panel). Either way the account is not
deleted there and then. It is scheduled `deletion.grace_days` ahead (14 by default), the
person gets a mail with a withdraw link, and `AccountDeletionRequested` fires. Until the day
comes, the customer can keep the account from the same form or the link.

## What happens when the day comes

`accounts:purge` runs daily at 03:40 and, for every deletion that is due:

1. **Asks every eraser whether anything stands in the way.** If something does, the request
   becomes **blocked**: nothing changes, the person gets one mail
   (`accounts-deletion-blocked`) with the reasons and a withdraw link valid for 30 days,
   `AccountDeletionBlocked` fires, and the Control Panel marks the account with the date it
   was due. The following daily runs try again and delete once the way is clear. A blocked or
   overdue request can always be withdrawn.
2. **With `deletion.active_subscriptions = cancel`, cancels the running subscriptions**
   through Payments, now and not earlier. A request that is withdrawn, or blocked by
   something else, leaves them running. A subscription that cannot be cancelled blocks.
3. **In one database transaction:** runs every eraser, dispatches `AccountDeleting` while
   the user still exists, deletes the user (Eloquent or file, last) and checks that it is
   really gone, then stores the result on the deletion request as row counts only. If
   anything fails, including a delete vetoed by a `UserDeleting` listener, the database rolls
   back, the account stays scheduled, and `AccountDeleting` counts as not having happened.
4. **Only then** fires `AccountDeleted` and sends `accounts-account-deleted`.

## What goes, what stays

| Addon | On deletion |
| --- | --- |
| Accounts | Address changes deleted. Deletion requests stay as the record, with address and meta cleared. |
| [Activity](/activity/) | Entries under the user id keep type and time and lose user, actor, properties and context (`activity:anonymize`, the ledger's own API). Entries recorded under *another* user id that mention the person are beyond that API and stay; the record says so. |
| [Entitlements](/entitlements/) | Grants held by the user and by the address deleted. Team grants stay with the team. |
| [LeadHub](/leadhub/) | Contact deleted with events, notes, follow-ups, tasks and revenue lines (database driver). |
| [Notifications](/notifications/) | Notifications, preferences and digest runs deleted. |
| Teams | Memberships removed. A team the person held alone, without other members, is deleted with its invitations and roles. An ownership shared with another owner passes to them. |
| [Payments](/payments/) | **Kept**, untouched: accounting records, ten years (§ 147 AO, § 14b UStG). |
| [Invoices](/invoices/) | **Kept**, untouched: tax documents, ten years. |

**What stays, pseudonymously:** the deletion request keeps the user id, with no address and
no name, as the record that the deletion happened. This addon's own ledger entries
(impersonation, a deletion scheduled or withdrawn by an admin) are written under the admin's
id and name the person only by id. After the deletion that id points at nothing.

## What blocks a deletion

Checked when the deletion is requested and again when it is due:

- **A subscription that still charges** (`pending`, `active`, `paused`, `suspended`). With
  `deletion.active_subscriptions = block`, the default, the request is refused with a link to
  the customer portal (`deletion.portal_url`, or Payments' own). With `cancel`, it is
  cancelled through Payments' `Subscriptions::cancel()` when the deletion is due, and blocks
  only if that fails.
- **Being the only owner of a team that has other members.** Transfer the ownership first.

## Your own data: an eraser

Any addon or site that stores personal data adds an eraser. It names what blocks a
deletion and deletes its share when the deletion runs.

```php
use Goldnead\Accounts\Contracts\ErasesPersonalData;
use Goldnead\Accounts\Facades\Accounts;
use Goldnead\Accounts\PersonalData\ErasureResult;
use Statamic\Auth\User;

class CourseProgressEraser implements ErasesPersonalData
{
    public function key(): string { return 'courses'; }
    public function label(): string { return 'Courses'; }
    public function available(): bool { return true; }

    // 'customer': "you …"; 'admin': third person, for the Control Panel.
    public function blockers(User $user, string $audience = 'customer'): array { return []; }

    public function erase(User $user): ErasureResult
    {
        $n = Progress::where('user_id', $user->id())->delete();

        return new ErasureResult('courses', deleted: ['progress' => $n]);
    }
}

Accounts::eraseData(CourseProgressEraser::class);
// or: $this->app->tag([CourseProgressEraser::class], 'accounts.personal-data-erasers');
```

An eraser runs inside the purge's transaction. A listener on `AccountDeleting` that throws
keeps that one account scheduled; the next run tries again.
