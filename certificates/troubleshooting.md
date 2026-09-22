# Troubleshooting

<AddonHeader />

## A learner completed a course and got no certificate

In order:

1. **Did Courses fire `CourseCompleted`?** Only a course with every lesson completed counts.
   See [Courses → Reference](/courses/reference#events).
2. **Is [`issue_on_completion`](/certificates/configuration#issue-on-completion) on?**
3. **Look in the log.** A refusal is logged as a warning with its reason:
   - `learner_name_missing`: the user has no name, or only their email address in the name
     field. Add the name, then run `php artisan certificates:issue --backfill`.
   - `course_not_found`: the course entry is gone.
4. **Anything else** was reported to the exception handler, with the error. Fix it, then run
   the backfill.

The learner's own request was not affected either way: a failed certificate never turns the
completion of the last lesson into an error.

## The command says the learner has not completed the course

`certificates:issue {user} {course}` needs a completed enrollment in Courses. If the course
really was finished elsewhere, pass `--force`. If the course is given by slug, check that it
is the slug in Courses' courses collection; the entry id always works.

## The command refuses: no brand is mapped

```
The course [...] is in a site no brand is mapped to (brand-context.sites). Pass --brand=<handle>.
```

Multi-brand is on, there is more than one brand, and the course's Statamic site is not mapped
to one in `brand-context.sites`. Pass `--brand=<handle>`, or map the site. See
[Console and backfill](/certificates/console#the-brand-on-the-console).

## The PDF shows no logo or signature

The asset reference does not resolve to an image asset. It has to be `container::path`, for
example `assets::logos/logo.png`. The log says which:
`statamic-certificates: the logo asset [...] is not an image asset; the PDF renders without it.`

## A changed logo, colour or footer does not show

The PDF on disk is a cache. PDFs rendered before the change keep the old look. Delete the
files under [`storage.path`](/certificates/configuration#storage) on the storage disk; each is
rendered again on its next download.

A changed issuer or signatory never shows on an existing certificate. Those are frozen when it
is issued. See [Issuing and the snapshot](/certificates/issuing#the-snapshot).

## The verification link or the download answers 404

- [`CERTIFICATES_ROUTES_ENABLED`](/certificates/configuration#routes) is `false`, or was
  changed without clearing the route cache.
- For the download: the signed-in user does not own the certificate. Another user's code gets
  a 404 on purpose. A guest gets 403, the owner of a revoked certificate 410.

## The verification page answers 429

The throttle, [`routes.throttle`](/certificates/configuration#routes), default thirty requests
a minute. It applies to the download as well.

## The certificate mail never arrives

- `mail.enabled` is off, globally or for the certificate's brand. It is off by default.
- It was issued by the backfill without `--mail`, or with `--no-mail`.
- No queue worker is running.
- The owner has no email address; the log says so.
- The certificate was revoked before the queued mail was sent; the mail is dropped and the log
  says so.

## The Certificates screen says the table is missing

`php artisan migrate` has not run. The log says the same:
`statamic-certificates: the certificates_issued table is missing; run php artisan migrate.`

## The Certificates entry is not in the navigation

The user lacks `manage certificates`, or [`cp.enabled`](/certificates/configuration#cp-enabled)
is off. With Payments installed the entry sits in the suite's shared section rather than under
Content.

## A certificate is missing from the screen or from the tags

Both show the current brand's certificates only. In multi-brand mode, a certificate issued in
another brand is listed under that brand.
