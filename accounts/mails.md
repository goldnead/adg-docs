# Mails

<AddonHeader />

Six mails, each a template slug in [Email Templates](/email-templates/):

| Config key (`mail.templates.*`) | Slug | Sent when |
| --- | --- | --- |
| `verify_email` | `accounts-verify-email` | a confirmation link is sent |
| `confirm_email_change` | `accounts-confirm-email-change` | a new address is requested, to the new address |
| `email_change_requested` | `accounts-email-change-requested` | a new address is entered, to the current address, before the change counts (since 0.2.0) |
| `email_changed` | `accounts-email-changed` | the change is confirmed, to the old address |
| `password_changed` | `accounts-password-changed` | the password was changed, whichever way: profile form, Control Panel, reset link, the host's own code. Not for a new account. Off with `password_change.notify` (since 0.2.0) |
| `deletion_scheduled` | `accounts-deletion-scheduled` | a deletion is requested, with the withdraw link |
| `deletion_blocked` | `accounts-deletion-blocked` | a due deletion is blocked, with the reasons and a withdraw link valid for 30 days |
| `account_deleted` | `accounts-account-deleted` | the account is gone |

Each slug is announced to Email Templates' registry with its occasion ("Accounts: …"), the
event, every placeholder with an example, and the shipped text. The template screen
therefore explains itself, and `php please email-templates:import` writes the defaults as
entries you can edit.

A slug without an entry, or a site without Email Templates, sends the default text shipped
in `lang/{de,en}/mail.php` (publish with `--tag=accounts-translations` to change it without
Email Templates). Mails are sent, not queued.

## Placeholders

| Placeholder | |
| --- | --- |
| `{{ user.name }}`, `{{ user.email }}` | The person. |
| `{{ action_url }}` | The signed link of this mail. |
| `{{ new_email }}`, `{{ old_email }}` | For the address change. |
| `{{ scheduled_for }}`, `{{ grace_days }}` | For the deletion. |
| `{{ expires_in_hours }}` | How long the link is valid. |
| `{{ changed_at }}` | When the password was changed, in the display timezone. |
| `{{ site_name }}` | `app.name`. |

## One confirmation mail, not two

Email Templates can also send Laravel's own `VerifyEmail` (template `core-verify-email`).
To keep a site from sending both, `verification.mail` picks one:

- **`auto`** (default): an Eloquent user model that implements Laravel's `MustVerifyEmail`,
  on a site with Laravel's `verification.verify` route, gets **Laravel's** notification
  (`$model->sendEmailVerificationNotification()`). Its link goes to the site's own route,
  and Laravel's `Verified` event becomes this addon's `EmailVerified`. Everyone else, and
  every Statamic file user (they never implement `MustVerifyEmail`), gets **this addon's**
  `accounts-verify-email`.
- **`accounts`** or **`laravel`**: force one.

Statamic's own registration form does not fire Laravel's `Registered` event, so on a
Statamic-only site nothing else sends a confirmation. A site that fires `Registered` itself
and also uses `auto` sends exactly one: Laravel's.
