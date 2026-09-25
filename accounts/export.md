# The data export

<AddonHeader />

A customer downloads their data from `{{ accounts:export_url }}` after confirming with an
elevated session. An admin with `export account data` downloads it from the
[customer overview](/accounts/control-panel). Both produce the same file: a ZIP with one
JSON file per contributor and a `manifest.json` that names the sections and any contributor
that failed. Without `ext-zip` the export is a single JSON file.

`PersonalDataExported` fires with the sections and who requested it.

## What is in it

Shipped contributors, each active only when its addon's tables exist:

| Section | What it holds |
| --- | --- |
| `account` | The user record, without password hash or tokens. |
| `payments` | Payments, items, subscriptions, withdrawals and cancellations by address. |
| `entitlements` | Grants held by the address or by the user. |
| `leadhub` | The contact by address or user id, with events, notes, follow-ups and revenue (database driver only). |
| `notifications` | Items, preferences, digests. |
| `teams` | Memberships. |
| `invoices` | Invoices and lines by buyer address. |
| `activity` | Ledger entries under the user id. |

They read the siblings' tables directly, **across all brands**, and leave out password
hashes, tokens and IP hashes.

## Your own data: a contributor

```php
use Goldnead\Accounts\Contracts\ContributesPersonalData;
use Goldnead\Accounts\Facades\Accounts;
use Statamic\Auth\User;

class CourseProgress implements ContributesPersonalData
{
    public function key(): string { return 'courses'; }   // becomes courses.json
    public function label(): string { return 'Courses'; }
    public function available(): bool { return true; }
    public function collect(User $user): array { return ['progress' => /* … */]; }
}

Accounts::contributeData(CourseProgress::class);
// or: $this->app->tag([CourseProgress::class], 'accounts.personal-data');
```

A contributor registered later under the same key replaces the shipped one.

## Switching it off

`export.enabled = false` makes the export answer 404, for the customer and in the Control
Panel alike.
