# Installation

<AddonHeader />

<Requirements database="MySQL or SQLite" />

```bash
composer require goldnead/statamic-assessments
php artisan migrate
php artisan vendor:publish --tag=statamic-assessments
```

Assessments then live under **Tools → Assessments**.

<Figure
  src="assessments-list"
  alt="The Assessments listing with title, handle, question and response counts, a Live badge and the brand"
  caption="One row per assessment. The response count links to the responses page." />

## What comes with it

One package is a hard dependency and installs alongside it:

| Package | Constraint | Why |
| --- | --- | --- |
| `goldnead/statamic-brand-context` | `^1.8` | Every assessment and every response belongs to a brand. On a single-brand site that is invisible. |

There is no build step. The addon ships its compiled Control Panel assets under
`dist/build/`; the third command copies them to `public/vendor/statamic-assessments/`.
Without it the Control Panel pages render without their JavaScript.

## Optional siblings

Used when installed, never required, and each can be switched off in
[configuration](/assessments/configuration#integrations):

| Package | What it adds |
| --- | --- |
| `goldnead/statamic-leadhub` | A contact per address and a timeline event `assessment.completed` with the result |
| `goldnead/statamic-automations` | The trigger `assessments.completed`, filterable by assessment and level |

## Permissions

Three, under the group **Assessments** in a role's permissions:

| Permission | Allows |
| --- | --- |
| `view assessments` | the listing, and previewing an unpublished assessment on the front end |
| `edit assessments` | create, edit, delete |
| `view assessment responses` | the responses page and the CSV export |

Super users hold all three.

## Other publishable tags

| Tag | What it publishes |
| --- | --- |
| `assessments-config` | `config/assessments.php` |
| `assessments-views` | The three shipped templates, into `resources/views/vendor/assessments/` |
| `assessments-translations` | The language files, into `lang/vendor/assessments/` |
