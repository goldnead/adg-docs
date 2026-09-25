# Installation

<AddonHeader />

<Requirements laravel="12.40+ / 13.x" />

```bash
composer require goldnead/statamic-accounts
php artisan migrate
```

The migration creates one table, `account_requests`. It holds pending address changes and
deletion requests, and after a deletion the pseudonymous record that it happened.

## The scheduler

The purge runs daily at 03:40 through Statamic's addon scheduler (`accounts:purge`, without
overlapping). Make sure `php artisan schedule:run` runs on the server every minute, or no
account is ever deleted. See [Queues & scheduling](/guide/queues).

Mails are sent, not queued. There is no worker to run for this addon.

## What comes with it

No other goldnead package is required. Every sibling is optional and picked up when it is
installed:

| Package | What it adds |
| --- | --- |
| `goldnead/statamic-email-templates` | Every account mail editable in the Control Panel. Run `php please email-templates:import` once to write the defaults as entries. |
| `goldnead/statamic-brand-context` | Grace period, link lifetimes, notice page, switches and template slugs editable per brand under Settings. |
| `goldnead/statamic-activity` | Verifications, address changes, deletions, exports and impersonations in the activity ledger. |
| `goldnead/statamic-identity-contracts` | Everything done while impersonating is attributed to the customer, with the admin named alongside. |
| `goldnead/statamic-automations` | Every account event as an automation trigger. |
| `goldnead/statamic-webhook-manager` | Every account event as a webhook trigger. |
| `goldnead/statamic-payments` | Payments and subscriptions in the overview and the export; a running subscription blocks or is cancelled on deletion. |
| `goldnead/statamic-entitlements` | Access grants in the overview and the export; grants deleted with the account. |
| `goldnead/statamic-leadhub` | The CRM contact in the overview and the export, deleted with the account. |
| `goldnead/statamic-notifications` | Notifications and preferences in the export, deleted with the account. |
| `goldnead/statamic-teams` | Memberships in the overview and the export; a sole owner of a team with members cannot be deleted. |

## Elevated sessions

Changing the address, deleting the account and downloading the data are confirmed through
Statamic's elevated session (`statamic.users.elevated_sessions_enabled`). Leave it on. With
it off there is no second confirmation, the same as for core's own sensitive actions.

## Permissions

Four of its own, under **Accounts** in a role's permissions, plus two of core's:

| Permission | Allows |
| --- | --- |
| `view accounts` | the customer list, the overview, the wiring screen |
| `manage accounts` | send the confirmation link, mark as confirmed, withdraw a deletion |
| `export account data` | the export from the Control Panel |
| `manage accounts settings` | the settings screen (with Brand Context) |
| `delete users` (core) | schedule a deletion; a super admin only by a super admin |
| `impersonate users` (core) | "Sign in as" |

The Control Panel entries sit in core's **Users** section.

## Publishable tags

| Tag | What it publishes |
| --- | --- |
| `accounts-config` | `config/accounts.php` |
| `accounts-views` | The Blade views of the mails and pages |
| `accounts-translations` | `lang/{de,en}`, including the default mail texts |
