# Issuing and the snapshot

<AddonHeader />

A certificate is issued in one of three ways, and all three end in the same call,
`Certificates::issue()`:

- **Automatically**, when [Courses](/courses/) fires `CourseCompleted` and
  [`issue_on_completion`](/certificates/configuration#issue-on-completion) is on.
- **From your code**, with `Certificates::issue($user, $courseEntryId)`.
- **From the console**, with `php artisan certificates:issue`, one at a time or as a backfill.
  See [Console and backfill](/certificates/console).

## When a course counts as completed

Whenever Courses fires `CourseCompleted`: every lesson completed, milestones included. That is
Courses' definition, not this addon's, and it includes lessons **skipped by a test-out**. A
learner who tested out of a phase gets the certificate without having opened those lessons.
If a certificate should mean "did every lesson", that is a decision for the course design (no
test-out lessons), not a setting here. See [Limits](/certificates/limits).

## One certificate per learner and course

A unique index on subject and course decides, not a lock. Two completion events racing each
other still end in one row: the losing insert fails on the index and the writer reads the
winner. Asking again returns the existing certificate, and `CertificateIssued` fires only for
the call that created the row. A revoked certificate stays revoked; issuing again does not
replace it.

The subject is stored as a type and an id. A site user is `user` plus the auth identifier,
whether the caller passed a Statamic user, the auth guard's model or just the id. That is the
same id Courses keys progress on and puts on `CourseCompleted`, so a certificate issued from
the event and one issued by hand for the same person collide on the index, as they must. Any
other Eloquent model is stored under its morph class and key.

## The snapshot

When a certificate is issued, these are copied onto its row:

| Copied at issue time | From |
| --- | --- |
| learner name | the user's `name`, or `first_name` and `last_name` |
| course title | the course entry's `title`, or its slug |
| issuer name | `template.issuer_name` in the certificate's brand |
| signatory name | `template.signatory_name` |
| signatory title | `template.signatory_title` |
| brand handle | the current brand |
| issue date | now, or the enrollment's completion date from the console |

A certificate states what was true when it was issued. **Renaming the course, the user or the
brand's settings afterwards does not change what the PDF and the verification page say.**

These stay live and are read whenever the PDF is rendered:

| Read at render time | From |
| --- | --- |
| logo | `template.logo` in the certificate's brand |
| signature image | `template.signature` |
| accent colour | `template.accent_color` |
| footer | `template.footer` |

They are looks, not statements. A re-rendered PDF picks up the current ones. Because the PDF
file on disk is a cache, a changed logo, colour or footer only shows on PDFs rendered after
the change; delete the storage folder to re-render existing ones. Issuer and signatory stay as
issued either way.

Name and title are cut at 255 characters when they are copied.

## No name, no certificate

The name is printed on a public page, so a user without one (neither `name` nor
`first_name`/`last_name`, or a name that is just the email address) is refused rather than
certified under their email address.

- **From your code or the console:** `issue()` throws `LearnerNameMissing`.
- **From the event:** the listener logs a warning and fires `CertificateNotIssued` with the
  reason `learner_name_missing`.

Add the name and run the backfill.

## The code

20 characters of Crockford base32 from `random_bytes()`, 100 bits, printed in groups of four:
`ABCD-EFGH-JKMN-PQRS-TVWX`. It is not derived from the row id, the learner or the date, so
nothing about one code tells anything about another.

Typing it in lower case, with or without dashes or spaces, works, and so do the letters
Crockford maps onto digits: `O` reads as `0`, `I` and `L` as `1`.

## When issuing fails inside the learner's request

The listener runs inside the request that completed the last lesson. A certificate that
cannot be issued must not turn that write into a 500:

- A refusal with a known reason, no learner name or a course entry that is gone, is logged
  and announced as `CertificateNotIssued` with the reason `learner_name_missing` or
  `course_not_found`.
- Any other error is reported to the exception handler.

Neither is swallowed and neither is rethrown. `certificates:issue --backfill` issues whatever
was missed.

## Revoked means gone

A certificate is revoked in the [Control Panel](/certificates/control-panel) or with
`Certificates::revoke($certificate, $reason)`. Revoking:

- keeps the row, so the verification page says "revoked" rather than "unknown";
- deletes the stored PDF, and the PDF is not rendered again (`CertificateIsRevoked`);
- blocks the download (410 for the owner);
- drops a mail that was queued before the revocation, when it comes to be sent;
- fires `CertificateRevoked`.

Revoking twice keeps the first date. There is no un-revoke.
