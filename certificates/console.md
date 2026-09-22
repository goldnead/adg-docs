# Console and backfill

<AddonHeader />

One command, `certificates:issue`, in two modes: one certificate by hand, or every missing one
from the completed enrollments in [Courses](/courses/).

```bash
php artisan certificates:issue {user} {course} [--force] [--no-mail] [--brand=]
php artisan certificates:issue --backfill [--dry-run] [--mail] [--brand=]
```

Idempotent either way: an existing certificate is reported, not duplicated.

## One by hand

```bash
php artisan certificates:issue ada@example.com {course-entry-id-or-slug}
```

| Argument | |
| --- | --- |
| `user` | the user's id or email address |
| `course` | the course entry's id, or its slug in the courses collection of Courses |

**Only for a completed course.** The learner needs a completed enrollment in Courses, and the
certificate is dated at that enrollment's completion. Without one the command refuses and says
so.

| Option | |
| --- | --- |
| `--force` | issue without a completed enrollment, for a course finished outside the site; dated now |
| `--no-mail` | do not mail this certificate, whatever the mail setting says |
| `--brand=<handle>` | the brand to issue in; see [the brand on the console](#the-brand-on-the-console) |

Without `--no-mail`, a certificate issued by hand is mailed as configured. The output is
`Issued: <code>`, or `Already issued: <code>` when there was one.

## The backfill

For courses finished before the addon was installed, or certificates the listener could not
issue at the time (a learner without a name, for example):

```bash
php artisan certificates:issue --backfill --dry-run   # what would be issued
php artisan certificates:issue --backfill             # dated at each completion, no mail
php artisan certificates:issue --backfill --mail      # the same, mailing as configured
```

The backfill walks every enrollment in Courses with a completion date, skips those that already
have a certificate, and issues the rest, each dated at its enrollment's completion.

| Option | |
| --- | --- |
| `--dry-run` | list what would be issued, with the brand, and issue nothing |
| `--mail` | mail the certificates as configured |
| `--brand=<handle>` | the brand to issue in, for every certificate of this run |

**The backfill does not mail unless `--mail` is passed.** Mailing a learner a certificate for a
course finished months ago is a surprise, not a service. Even with `--mail`, a certificate is
only mailed where [`mail.enabled`](/certificates/configuration#mail-enabled) is on for its brand.

It ends with a count: issued, already had one, failed. A row that fails is reported as
`Failed: user …, course …: <reason>` and the run continues; the exit code is non-zero when
anything failed.

## The brand on the console

The console has no current brand. Each certificate is issued in a brand, because the brand
decides the issuer and the signatory that are frozen on it:

| Setup | Brand used |
| --- | --- |
| multi-brand off | the default brand |
| `--brand=<handle>` given | that brand |
| multi-brand on, the course's Statamic site mapped in `brand-context.sites` | the brand of that site |
| multi-brand on, one brand only | that brand |
| multi-brand on, several brands, and neither of the above | **refused** |

The refusal names the course and asks for `--brand`. It refuses rather than stamp the default
brand's issuer on another brand's certificate. In a backfill a refusal counts as one failed row.

Issuing from your own job or command follows the same rule: `Certificates::issue()` runs in the
current brand, so call it inside `BrandContext::runFor()`.
