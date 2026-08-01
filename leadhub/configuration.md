# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=leadhub-config
```

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
