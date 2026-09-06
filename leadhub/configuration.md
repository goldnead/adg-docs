# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=leadhub-config
```

Since **2.3.0** the config file is no longer the only place these values come from: 28 of
them are editable in the Control Panel and stored in the database, where they take
precedence. The rest of this page describes the file, which is still the default for every
key nobody has touched. Read [Settings in the Control Panel](#settings-in-the-control-panel)
first if a value in the file does not match what the addon is doing.

## Settings in the Control Panel

Under **Settings → Addon Settings**, with the `manage leadhub settings` permission, 28
fields are editable: submission handling, payload redaction, all feature flags, the export
target and queue threshold, the scoring fallbacks, the click-tracking dedupe window and the
notification switches.

::: warning Moved in 2.11.0
The screen used to live at **LeadHub → Settings**, with its own table `leadhub_settings`. It is
now one section on the shared screen every addon in the suite registers with, provided by
`goldnead/statamic-brand-context` 1.12 or newer — see
[Addon settings](/brand-context/settings). The old URL redirects, the permission name is
unchanged, and an upgrade migration carries your stored values across. Nothing to do by hand
beyond `php artisan migrate`.

`leadhub_settings` is left in place for one minor version so a rollback keeps its values.
:::

### Only the difference is stored

One row per changed key in the `brand_settings` table, applied over the config at boot.

Three consequences worth having in mind:

- **Setting a value back to what the file says deletes its row again.** The file is the
  default, not a snapshot taken the day somebody first opened the screen, so a later release
  can still move that default and have it apply.
- **An install that never opens the screen is indistinguishable from one on an earlier
  release.** Nothing is written until something is changed.
- **The values are brand-scoped** since 2.11.0, unlike the table they replaced. On a
  single-brand install nothing changes; on a multi-brand one each brand carries its own set,
  and the switcher in the header decides which you are editing.

The form, the validation and the boot-time override all read one definition
(`src/Support/Settings.php`). The overrides are applied once every provider has booted, so a
queue worker that comes up later — an export, the digest — sees the same values.

### What is editable

| Group | Keys |
| --- | --- |
| Behaviour | `default_status`, `overwrite_existing_fields_from_submissions`, `store_full_submission_payload` |
| Payload redaction | `timeline_payload_redaction` |
| Feature flags | all thirteen: `manual_contacts`, `csv_export`, `attribution`, `ingestion`, `merge`, `companies`, `tasks`, `pipelines`, `scoring`, `webhooks`, `crm_destinations`, `webhook_manager`, `click_tracking` |
| Exports | `exports.queue_threshold`, `exports.disk`, `exports.directory` |
| Lead scoring | `scoring.default`, `scoring.timeline` |
| Click tracking | `click_tracking.dedupe_window`, `click_tracking.ignored_query_parameters` |
| Notifications | `notifications.new_lead`, `on_assignment`, `on_task_assignment`, `digest.enabled` |

`default_status` is a select over the statuses the file defines, and `exports.disk` a select
over the disks in `config/filesystems.php`, so neither can be set to something that does not
exist.

### What is not, and why

| Not offered | Because |
| --- | --- |
| `crm.destinations.*` | Credentials. A database row would take a token out of the secret store and into every backup — and the screen refuses to serialise them to the browser at all. |
| Everything env-resolved: `storage.driver`, `storage.flat.*`, `notifications.enabled`, `notifications.recipients`, `notifications.digest.time`, `notifications.digest.fallback_recipients` | The deployment owns them. A database row that silently outranks an env var is a setting that changes back on the next deploy. Switching `storage.driver` also means **moving** the data, which is what `leadhub:storage:migrate` is for. |
| `statuses` | A map of handle to label is not a field. Removing a status strands every contact holding it. |
| `attribution.fields` | The same shape for the same reason, and the left-hand side is a database column: a typo there stops capturing UTM data without saying so. |
| `scoring.events` | Since 1.8.0 this block is only the **fallback** for a brand with no rows in the scoring table, so editing it here would look effective and do nothing. Two of its keys also carry literal dots (`purchase.completed`), which dotted-path addressing cannot express. |
| `email_normalization.*` | Not a preference but a data-consistency rule. Change it later and existing rows stay normalised by the old one, so deduplication quietly stops matching. |

The env-resolved values **are shown**, read-only, so you can check what is active without
opening `.env` on the server: storage driver, flat path, the notifications master switch,
the new-lead recipients, the digest time and its fallback recipients. The statuses are
printed the same way.

### On the flat driver the screen is read-only

`brand_settings` is a database table, and a flat-driver install is not asked to run
migrations. Rather than answering a save with a SQL error, the screen hides the save button and
says why: the table does not exist, and `php artisan migrate` will create it. On a
non-eloquent driver that command creates only the tables `goldnead/statamic-brand-context`
ships, and nothing of LeadHub's own.

Until then the values shown are what `config/leadhub.php` says.

### `config:cache` is safe

The overrides are deliberately **not** applied while `config:cache` builds its file. Baking
them in would let an override outlive the row it came from — a deleted setting would keep
working until the next `config:clear` — and the next boot would read the baked value as the
shipped default, so a value reset to the file's would count as a difference and be stored
instead of deleted. The cached file carries the file's values; each process lays its
overrides over them at its own boot.

## Statuses

```php
'statuses' => [
    'new'       => 'New',
    'contacted' => 'Contacted',
    'qualified' => 'Qualified',
    'won'       => 'Won',
    'lost'      => 'Lost',
    'archived'  => 'Archived',
],
'default_status' => 'new',
```

Add your own. Removing a status that contacts already hold leaves those contacts with a
value the UI cannot label, so retire a status by no longer using it rather than by
deleting the key.

## Submission handling

```php
'overwrite_existing_fields_from_submissions' => false,
'store_full_submission_payload' => true,
'timeline_payload_redaction' => [
    'password', 'passwort', 'token', 'secret',
    'api_key', 'credit_card', 'card_number',
],
```

`overwrite_existing_fields_from_submissions` defaults to **false**, and that default is
load-bearing: a second submission does not overwrite a contact somebody has since edited
by hand. Turning it on means the newest form wins over your salesperson's correction.

The redaction list applies to the payload copy LeadHub stores on the timeline. The original
Statamic submission is never modified. Add whatever your own fields are called — nothing
here catches `kundennummer` or `iban`.

## Exports

```php
'exports' => [
    'queue_threshold' => 1000,
    'disk' => 'local',
    'directory' => 'leadhub/exports',
],
```

Exports above the threshold are queued, which requires a worker and the eloquent driver.

## Features

```php
'features' => [
    'manual_contacts' => true,
    'csv_export' => true,
    'webhooks' => false,
    'crm_destinations' => false,
    'attribution' => true,
    'webhook_manager' => true,

    // CRM-core modules — eloquent driver only
    'ingestion' => true,
    'scoring' => false,
    'merge' => true,
    'companies' => false,
    'tasks' => false,
    'pipelines' => false,

    // Email link-click tracking, consent-first
    'click_tracking' => false,
],
```

That is the whole block. **There is no `features.segments`.** Segments are ungated: the key
does not exist in the config file and nothing in the addon reads it. The Segments screen and
the segment rules are available on any install, subject only to the
`view leadhub segments` / `manage leadhub segments` permissions.

`webhook_manager` auto-wires LeadHub's lifecycle events into
[Webhook Manager](/webhook-manager/) when that addon is installed, and has no effect
otherwise. Set it to `false` to opt out.

`click_tracking` is the master switch for email link-click scoring. See
[Click tracking](#click-tracking) below.

Notifications are **not** in this block. They are switched with `notifications.enabled`;
see [Assignment & notifications](/leadhub/assignment).

::: warning The CRM-core modules need the eloquent driver
`ingestion`, `companies`, `tasks`, `pipelines`, `merge` and `scoring` are relational. On the
flat driver they are unavailable, not degraded. Segments work on both drivers — see the
[driver capability matrix](/leadhub/reference#driver-capability-matrix).
:::

## Scoring

```php
'scoring' => [
    'default' => 1,
    'timeline' => true,
    'events' => [
        'submission_received' => 2,
        'LeadHubSubmissionAttached' => 2,
        'purchase.completed' => 10,
        'booking.confirmed' => 5,
        'email_link_clicked' => 3,
    ],
],
```

Since 1.8.0 the point table lives **in the database, per brand**, edited under
**LeadHub → Scoring**. This config block is the **fallback**: while a brand has no rules,
the file decides, exactly as before.

Copy it into the table when you are ready:

```bash
php artisan leadhub:scoring:import --dry-run
php artisan leadhub:scoring:import
```

`timeline => true` writes a timeline entry on every real score change. Without it a
contact's score has a value and no history. The `LeadHubContactScoreChanged` event fires
either way.

## Click tracking

```php
'click_tracking' => [
    'dedupe_window' => 60,   // minutes
],
```

Repeated clicks of the same link by the same contact inside the window are recorded once
and scored once.

Email link-click tracking is opt-in and **consent-first**: even when enabled, a click is
only scored when the contact has marketing consent.

## Attribution

```php
'attribution' => [
    'fields' => [
        'utm_source' => 'utm_source',
        'utm_medium' => 'utm_medium',
        'utm_campaign' => 'utm_campaign',
        'utm_term' => 'utm_term',
        'utm_content' => 'utm_content',
        'referrer' => 'referrer',
        'landing_page' => 'landing_page',
    ],
],
```

The key is the contact field, the value is the **submission** field it comes from. Remap
the right-hand side to match your own form field names.

Capture works as long as those values reach the submission, which normally means hidden
fields populated from the query string and `document.referrer`.

## Notifications

```php
'notifications' => [
    'enabled' => env('LEADHUB_NOTIFICATIONS', true),

    'new_lead' => true,           // a brand-new lead arrived
    'on_assignment' => true,      // a lead was assigned to an owner
    'on_task_assignment' => true, // a task was handed to someone else

    // Comma-separated in .env, an array in config.
    'recipients' => env('LEADHUB_NOTIFY_EMAILS'),

    'digest' => [
        'enabled' => true,
        'time' => env('LEADHUB_DIGEST_TIME', '08:00'),   // server time, daily
        'fallback_recipients' => env('LEADHUB_DIGEST_EMAILS'),
    ],
],
```

`enabled` is the master switch. There is no `features.notifications`.

`recipients` and `digest.fallback_recipients` are read as **arrays**. The shipped config
builds them by splitting `LEADHUB_NOTIFY_EMAILS` and `LEADHUB_DIGEST_EMAILS` on commas and
trimming, so `team@example.com, sales@example.com` in `.env` works. If you edit the config
file directly, write a list.

`recipients` receives the new-lead notification for **unassigned** leads. An assigned lead
notifies its owner instead, and `recipients` is not copied.

`digest.fallback_recipients` receives the digest rows for contacts nobody owns. Leave it
empty and it falls back to `recipients`, so most installs only ever set one of the two.

`on_task_assignment` runs through [Notifications](/notifications/) rather than the mail
notifier, and is inert when that addon is not installed. Assigning a task to yourself never
notifies.

See [Assignment & notifications](/leadhub/assignment).

## Segments

The sweep time is read from `leadhub.segments.sweep_time` and defaults to `03:00`. The key
is **not** in the published config file, so add it if you want to move the sweep:

```php
'segments' => [
    'sweep_time' => '04:30',
],
```

Segments themselves are not gated by a feature flag. See [Segments](/leadhub/segments).

## CRM destinations

```php
'crm' => [
    'destinations' => [
        'hubspot' => ['driver' => 'hubspot', 'enabled' => true, 'token' => env('LEADHUB_HUBSPOT_TOKEN'), 'triggers' => ['created', 'status_changed']],
        'brevo' => ['driver' => 'brevo', 'enabled' => true, 'api_key' => env('LEADHUB_BREVO_KEY'), 'list_id' => env('LEADHUB_BREVO_LIST')],
        'zapier' => ['driver' => 'webhook', 'enabled' => true, 'url' => env('LEADHUB_WEBHOOK_URL'), 'secret' => env('LEADHUB_WEBHOOK_SECRET')],
    ],
],
```

See [CRM connectors](/leadhub/crm-connectors).

## Email normalisation

```php
'email_normalization' => [
    'trim' => true,
    'lowercase' => true,
],
```

Deduplication happens on `email_normalized`, and this is what produces it. Both defaults
are on, and turning either off means `Adrian@Example.com ` and `adrian@example.com` become
two contacts.

## Storage

```php
'storage' => [
    'driver' => env('LEADHUB_DRIVER', 'eloquent'),   // eloquent | flat
    'flat' => [
        'path' => env('LEADHUB_FLAT_PATH', base_path('content/leadhub')),
        'index_disk' => env('LEADHUB_INDEX_DISK', 'local'),
        'index_path' => env('LEADHUB_INDEX_PATH', 'leadhub/index'),
    ],
],
```

See [Storage drivers](/leadhub/storage).

## Environment summary

```dotenv
LEADHUB_DRIVER=eloquent
LEADHUB_FLAT_PATH=
LEADHUB_INDEX_DISK=local
LEADHUB_INDEX_PATH=leadhub/index
LEADHUB_NOTIFY_EMAILS=team@example.com
LEADHUB_HUBSPOT_TOKEN=
LEADHUB_BREVO_KEY=
LEADHUB_BREVO_LIST=
LEADHUB_WEBHOOK_URL=
LEADHUB_WEBHOOK_SECRET=
```
