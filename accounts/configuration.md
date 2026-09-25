# Configuration

<AddonHeader />

`config/accounts.php`, published with:

```bash
php artisan vendor:publish --tag=accounts-config
```

With [Brand Context](/brand-context/) installed, the grace period, link lifetimes, notice
page, switches and template slugs are editable per brand under **Settings**, and the
settings screen needs `manage accounts settings`.

## Verification

| Key | Default | |
| --- | --- | --- |
| `verification.enabled` | `true` | Off: the middleware lets everyone through and the notice tag renders nothing. |
| `verification.field` | `email_verified_at` | Where the moment of confirmation is stored on the user. |
| `verification.send_on_register` | `true` | Send the link after core's registration form. |
| `verification.expire_minutes` | `1440` | Link lifetime. |
| `verification.notice_url` | `/` | Where the middleware sends unconfirmed users. |
| `verification.redirect` | `/` | Where the link lands. |
| `verification.mail` | `auto` | Which confirmation mail goes out: `auto`, `accounts` or `laravel`. See [Mails](/accounts/mails#one-confirmation-mail-not-two). |

## Changing the address

| Key | Default | |
| --- | --- | --- |
| `email_change.expire_minutes` | `1440` | Link lifetime. |
| `email_change.notify_old_address` | `true` | Tell the old address once the change is confirmed. |
| `email_change.redirect` | `/` | Where the link lands. |

## Deletion

| Key | Default | |
| --- | --- | --- |
| `deletion.grace_days` | `14` | At least 1. |
| `deletion.active_subscriptions` | `block` | `block` refuses while a subscription still charges; `cancel` cancels it through Payments when the deletion is due. See [Deleting an account](/accounts/deletion). |
| `deletion.portal_url` | `''` | Where the subscription blocker links. Empty: Payments' customer portal. |
| `deletion.logout` | `false` | Sign the customer out after the request. |
| `deletion.redirect` | `/` | Where the withdraw link lands. |

## Export

| Key | Default | |
| --- | --- | --- |
| `export.enabled` | `true` | Off: the customer's download answers 404. The Control Panel export for admins with `export account data` stays, so a request under Art. 15 GDPR can always be answered. |
| `export.throttle` | `3,60` | `max,minutes` per person for the customer's download, read on each request (rate limiter `accounts-export`). Since 0.1.1; in 0.1.0 it was not read. |

## Everything else

| Key | Default | |
| --- | --- | --- |
| `mail.templates.*` | `accounts-…` | The Email Templates slug for each mail. See [Mails](/accounts/mails). |
| `impersonation.redirect` | `/` | Landing page for a customer without Control Panel access. |
| `integrations.automations` | `true` | Register the automation triggers. Read while booting. |
| `integrations.webhook_manager` | `true` | Register the webhook triggers. Read while booting. |
| `integrations.activity` | `true` | Write to the activity ledger. Read while booting. |
| `subject_types` | — | Extra `subject_type` values under which Entitlements stores users, so the overview, export and deletion find their grants. |
