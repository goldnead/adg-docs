# Limits

<AddonHeader />

What the package does not do in 0.1.0, stated plainly so nobody finds it out on a live course.

## A test-out counts as completed

A certificate is issued when [Courses](/courses/) fires `CourseCompleted`, and Courses counts
lessons skipped by a [test-out](/courses/locks) as completed. A learner who tested out of a
phase gets the certificate without having opened those lessons.

That is Courses' definition, and this package does not second-guess it. If a certificate
should mean "did every lesson", build the course without test-out lessons.

## Mail

- **Through the default mailer and sender.** The mail has no mailer or from-address setting of
  its own, per brand or otherwise. A multi-brand site whose brands send from different
  addresses gets the application's default for every certificate.
- **Plain text, one template.** `mail.blade.php` is a text body; the subject and the lines come
  from the language files. Publish the views to change it.
- **Queued.** The PDF is rendered when the mail is built, on the queue worker. Without a
  worker on a real queue connection, nothing is sent; with `sync`, the render happens in the
  request that completed the course.
- **Off by default,** and never sent by the backfill unless `--mail` is passed.
- **Only to an address the owner has.** A certificate whose owner has no email address is
  issued, and the mail is skipped with a warning in the log.

## Other limits

- **One certificate per learner and course.** A course taken twice keeps the first certificate.
  There is no reissue with a new date; revoking and issuing again returns the revoked one.
- **No un-revoke.** Revoking cannot be undone from the Control Panel or the facade.
- **No layout editor.** The template is a handful of fields. Anything else is a published Blade
  view, written for dompdf's CSS 2.1. See [The PDF and its view](/certificates/pdf).
- **No certificate without a name.** A learner with no name on their account is refused, never
  certified under their email address. See
  [Issuing and the snapshot](/certificates/issuing#no-name-no-certificate).
- **Up to 2,000 rows on the Certificates screen.** Past that the screen shows the newest and
  says how many there are.
- **English and German.** Those are the language files that ship.
