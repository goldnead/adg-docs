# Reference

<AddonHeader />

## Console

| Command | |
| --- | --- |
| `php artisan certificates:issue {user} {course}` | Issues one certificate for a completed course. `--force`, `--no-mail`, `--brand=`. |
| `php artisan certificates:issue --backfill` | Issues every missing certificate from completed enrollments, without mail. `--dry-run`, `--mail`, `--brand=`. |

Details on [Console and backfill](/certificates/console).

## Facade

`Goldnead\Certificates\Facades\Certificates`, alias `Certificates`. `$user` is a Statamic user,
the auth guard's user model, or a user id. Any other Eloquent model is stored under its morph
class.

| Method | |
| --- | --- |
| `issue($user, string $courseEntryId, ?DateTimeInterface $issuedAt = null): Certificate` | idempotent; fires `CertificateIssued` only when it created the row; runs in the current brand |
| `find($user, string $courseEntryId): ?Certificate` | across brands |
| `for($user): Collection` | the user's certificates in the current brand, newest first |
| `findByCode(string $code): ?Certificate` | across brands; lower case, spaces and dashes are accepted |
| `revoke(Certificate $certificate, string $reason): Certificate` | fires `CertificateRevoked`; a second call keeps the first date |
| `pdf(Certificate $certificate): string` | the PDF bytes, rendered and stored first if missing; throws `CertificateIsRevoked` |
| `verifyUrl(Certificate $certificate): ?string` | `null` when the routes are off |
| `downloadUrl(Certificate $certificate): ?string` | `null` when the routes are off |
| `withoutMail(callable $callback): mixed` | runs the callback without mailing what it issues |

```php
use Goldnead\Certificates\Facades\Certificates;

$certificate = Certificates::issue($user, $courseEntryId);
Certificates::withoutMail(fn () => Certificates::issue($user, $courseEntryId));
```

`issue()` throws a `CertificateRefused` when it cannot issue. From a job or a command, call it
inside `BrandContext::runFor()`, so the issuer and signatory are taken from the right brand.

## Events

| Event | Payload | When |
| --- | --- | --- |
| `Goldnead\Certificates\Events\CertificateIssued` | `$certificate` | once per certificate, when the row is created |
| `Goldnead\Certificates\Events\CertificateRevoked` | `$certificate` | when a certificate is revoked |
| `Goldnead\Certificates\Events\CertificateNotIssued` | `$subjectId`, `$courseId`, `$reason`, `$message` | from the `CourseCompleted` listener only, when issuing was refused |

The package listens to `Goldnead\Courses\Events\CourseCompleted` from
[Courses](/courses/reference#events), and to its own `CertificateIssued` for the optional mail.

## Exceptions

| Exception | `reason()` | Thrown when |
| --- | --- | --- |
| `Goldnead\Certificates\Exceptions\LearnerNameMissing` | `learner_name_missing` | the learner has no name to print |
| `Goldnead\Certificates\Exceptions\CourseNotFound` | `course_not_found` | there is no entry with that id |
| `Goldnead\Certificates\Exceptions\CertificateIsRevoked` | | a revoked certificate is asked for its PDF |

The first two extend `CertificateRefused`, which carries the machine-readable `reason()`. The
same code is the `$reason` of `CertificateNotIssued`.

## Routes

| Method | URL | Name | |
| --- | --- | --- | --- |
| GET | `/certificates/verify/{code}` | `certificates.verify` | `web` group, `throttle:30,1`, public |
| GET | `/certificates/{code}/download` | `certificates.download` | `web` group, `throttle:30,1`, owner only |
| GET | `{cp}/certificates` | `statamic.cp.certificates.index` | `can:manage certificates` |
| POST | `{cp}/certificates/{id}/revoke` | `statamic.cp.certificates.revoke` | `can:manage certificates`, `reason` required |

The two front-end routes follow [`routes.*`](/certificates/configuration#routes); the two
Control Panel routes follow [`cp.enabled`](/certificates/configuration#cp-enabled).

## Permissions

| Permission | |
| --- | --- |
| `manage certificates` | the Certificates screen, list and revoke |
| `manage certificates settings` | the Certificates section on the shared settings screen |

## Table

`certificates_issued`, one row per issued certificate:

| Column | |
| --- | --- |
| `id` | |
| `brand_id` | the brand, `0` without one |
| `code` | 20 characters, unique |
| `subject_type`, `subject_id` | `user` and the auth identifier, or a morph class and key |
| `course_id` | the course entry id |
| `learner_name`, `course_title` | frozen at issue time |
| `issuer_name`, `signatory_name`, `signatory_title` | frozen at issue time, nullable |
| `brand_handle` | frozen at issue time, nullable |
| `issued_at` | |
| `revoked_at`, `revoked_reason` | nullable |
| `created_at`, `updated_at` | |

Unique on `subject_type` + `subject_id` + `course_id`: that index, not a lock, is what makes
issuing idempotent. `subject_id` is a string without a foreign key, so a flat-file Statamic
user works as well as an Eloquent one.

## Configuration

| Key | Default |
| --- | --- |
| `issue_on_completion` | `true` |
| `template.issuer_name` | `CERTIFICATES_ISSUER_NAME`, else `APP_NAME` |
| `template.logo` | `null` |
| `template.signature` | `null` |
| `template.signatory_name` | `null` |
| `template.signatory_title` | `null` |
| `template.accent_color` | `'#1f2937'` |
| `template.footer` | `null` |
| `storage.disk` | `'local'` (`CERTIFICATES_DISK`) |
| `storage.path` | `'certificates'` |
| `mail.enabled` | `false` (`CERTIFICATES_MAIL_ENABLED`) |
| `routes.enabled` | `true` (`CERTIFICATES_ROUTES_ENABLED`) |
| `routes.prefix` | `'certificates'` |
| `routes.throttle` | `'30,1'` |
| `cp.enabled` | `true` |
