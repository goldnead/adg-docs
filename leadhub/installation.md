# Installation

<AddonHeader />

<Requirements laravel="12.x or 13.x" database="MySQL, PostgreSQL or SQLite — eloquent driver only" queue="Required for CRM pushes and queued exports" />

```bash
composer require goldnead/statamic-leadhub
php artisan migrate          # eloquent driver only, which is the default
```

That is it. **No front-end build step is required**: LeadHub ships its compiled Control
Panel assets (Inertia + Vue 3 + Tailwind v4) under `resources/dist/`, and Statamic
publishes them to `public/vendor/` automatically on install.

To republish them by hand:

```bash
php artisan vendor:publish --tag=statamic-leadhub --force
```

Optionally publish the config to customise statuses, redaction rules and feature flags:

```bash
php artisan vendor:publish --tag=leadhub-config
```

After installation, a **LeadHub** entry appears in the Control Panel sidebar.

## What comes with it

LeadHub has one addon dependency, and it is a hard `require`, not a suggestion:

| Package | Constraint | |
| --- | --- | --- |
| [`goldnead/statamic-brand-context`](/brand-context/) | `^1.6` | Installed automatically. It owns the brand a contact belongs to, and every LeadHub table is scoped by it. |

The floor is `^1.6` for a reason: `^1.0` allowed a v1.0.0 that predates `RunsForEachBrand`,
and that combination fails at boot for the whole suite. It was raised in **1.12.0**.

Composer also pulls `inertiajs/inertia-laravel` (`^1.0|^2.0`), which the Control Panel
screens are built on, and `symfony/yaml` (`^6.0|^7.0`), used by the flat-file driver.

Nothing here needs a `repositories` entry in your project's `composer.json`. Every package
in the suite resolves from Packagist.

## Quick start

### 1. Connect your first form

1. **Control Panel → LeadHub → Forms**
2. **Configure** on the Statamic form you want to capture
3. Toggle **Enable LeadHub for this form**
4. Map the form's **email field** (required) and any other fields you want
5. Save

The next submission creates a contact in **LeadHub → Contacts**.

::: tip Nothing happens until you map a form
A form with no mapping, or a disabled mapping, is skipped. That is deliberate — installing
LeadHub does not silently start harvesting every form on the site — and it is the single
most common "it does nothing" cause.
:::

### 2. Work the leads

Click a contact for the full timeline. Add notes, change status, set follow-ups, attach
tags. Filter the list by status, source, tag or follow-up state, and export filtered
subsets as CSV.

### 3. Optionally customise statuses

```php
// config/leadhub.php
'statuses' => [
    'new'       => 'New',
    'contacted' => 'Contacted',
    'qualified' => 'Qualified',
    'proposal'  => 'Proposal sent',   // your own
    'won'       => 'Won',
    'lost'      => 'Lost',
    'archived'  => 'Archived',
],
```

## A queue worker

CRM connector pushes run on the queue, and CSV exports past
`exports.queue_threshold` do too.

```bash
php artisan queue:work
```

With `sync`, a HubSpot outage becomes a slow form submission. The pipeline is fail-safe so
nothing breaks, but the person submitting the form waits for the timeout.

## The scheduler

Three commands are registered automatically:

| Command | Frequency | Without the scheduler |
| --- | --- | --- |
| `leadhub:followups:digest` | daily, at `notifications.digest.time` | no daily summary |
| `leadhub:followups:due` | daily | `LeadHubFollowupDue` never fires |
| `leadhub:segments:sweep` | daily | time-based segment rules go stale |

```bash
php artisan schedule:work    # or a cron entry calling schedule:run
```

The segment one is worth understanding: mutation-driven rules stay perfectly fresh without
the scheduler, and time-based ones (`within_days`, `older_than_days`) do not — producing a
segment that is half-correct, which is worse than one that is obviously broken.

## Turning the CRM-core modules on

All of them need the eloquent driver.

```php
'features' => [
    'ingestion' => true,
    'companies' => true,
    'tasks' => true,
    'pipelines' => true,
    'merge' => true,
    'scoring' => true,
],
```

Turn on what you will use. Each adds CP screens and, for most of them, tables.

**Segments are not in this list.** There is no `features.segments`; they are available on
every install and on both drivers, gated only by permissions.

## Multiple Control Panel users

Assigning leads to different team members means more than one CP user, which requires
**Statamic Pro**:

```dotenv
STATAMIC_PRO_ENABLED=true
```

Without it, assignment works and there is only ever one person to assign to.

## Verifying the install

On a MySQL or PostgreSQL database, check that the per-brand unique indexes are actually in
place — which is not the same question as whether the migrations ran:

```bash
php artisan leadhub:brand-integrity
```

It reports and changes nothing. See
[Storage drivers](/leadhub/storage#checking-per-brand-uniqueness).

Then submit a real form and look at the contact's timeline.

## End-to-end smoke test

From a clone, `./scripts/smoke-test.sh` builds a throwaway Statamic 6 project, wires
LeadHub as a path repository, creates a form, submits through the real
`SubmissionCreated` listener, asserts the contact landed, migrates to the flat driver,
and asserts it is still visible. Three to five minutes, and it exits non-zero on the first
failed step while leaving the broken project in place.

That is the fastest way to prove a bug is in the addon rather than in your project.

## Licence

Commercial: `composer.json` says `proprietary`. See [Licensing](/guide/licensing) for how the commercial addons in the suite resolve their licence.
