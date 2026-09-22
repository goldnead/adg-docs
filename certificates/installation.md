# Installation

<AddonHeader />

<Requirements laravel="12.40+ / 13.x" />

```bash
composer require goldnead/statamic-certificates
php artisan migrate
```

That is all. The migration creates one table, `certificates_issued`, and the next
`CourseCompleted` issues a certificate. There is no install command and no scheduled task.

For courses finished before the addon was installed, run the backfill once. See
[Console and backfill](/certificates/console).

```bash
php artisan certificates:issue --backfill --dry-run   # what would be issued
php artisan certificates:issue --backfill             # dated at each completion, no mail
```

## What comes with it

Three packages are required and arrive with Composer:

| Package | Constraint | Why |
| --- | --- | --- |
| `goldnead/statamic-courses` | `^0.1` | The `CourseCompleted` event and the completed enrollments the backfill reads. Without Courses there is nothing to certify. |
| `goldnead/statamic-brand-context` | `^1.13` | The per-brand template settings, and the brand a certificate belongs to. |
| `dompdf/dompdf` | `^3.1` | Renders the PDF. Pure PHP, no Chrome, no binary. |

When [Payments](/payments/) is installed, the Certificates entry sits in the suite's shared
nav section. Otherwise it sits under Content.

## The queue

The optional mail is queued, and the PDF is rendered when the mail is built, on the worker.
With `QUEUE_CONNECTION=sync` that render happens inside the request that completed the last
lesson. Mail is off by default, so a site that never turns it on queues nothing. See
[Queues & scheduling](/guide/queues).

## Permissions

Two, under the group **Certificates** in a role's permissions:

| Permission | Allows |
| --- | --- |
| `manage certificates` | the [Certificates](/certificates/control-panel) screen: list, search, revoke |
| `manage certificates settings` | the Certificates section on the shared settings screen |

## Publishable tags

| Tag | What it publishes |
| --- | --- |
| `certificates-config` | `config/certificates.php` |
| `certificates-migrations` | The migration, into `database/migrations/` |
| `certificates-views` | `pdf.blade.php`, `verify.blade.php` and `mail.blade.php`, into `resources/views/vendor/certificates/` |
| `certificates-translations` | The language files (English and German), into `lang/vendor/certificates/` |

`certificates-config` is the tag Statamic registers on its own, because the config file
matches the addon slug. The Control Panel bundle ships compiled under `dist/build/` and
Statamic publishes it on install. A fresh install whose migration has not run gets a
sentence on the Certificates screen, not an error.

## Licence

Commercial: `composer.json` says `proprietary`, with no editions. It is on Packagist, but it
is not sold today, neither on its own nor as part of the Suite: Schedule A of the
[Suite EULA](/guide/suite-eula) lists it with the packages that agreement does not cover.
See [Licensing](/guide/licensing).
