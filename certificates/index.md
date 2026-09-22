# Certificates

<AddonHeader />

Completion certificates for Statamic 6. When a learner finishes a course in
[Courses](/courses/), a certificate is issued: a PDF with the learner's name, the course, the
date and your brand, and a public verification page where anyone holding the certificate's
code can check that it is genuine and not revoked.

<Figure
  src="certificates-pdf"
  alt="A certificate of completion on an A4 landscape page: a logo and the issuer at the top, the title, the learner's name, the course, the date on the left, a signature with the signatory's name and title on the right, and the footer with the certificate code and the verification URL"
  caption="The packaged view, rendered in the playground with a logo, a signature, an accent colour and a footer set for the brand." />

## What it is

- **A certificate per learner and course**, issued when Courses fires `CourseCompleted`, by
  `Certificates::issue()`, or with `php artisan certificates:issue`. A unique index decides
  that there is only ever one. See [Issuing and the snapshot](/certificates/issuing).
- **A PDF**, A4 landscape, rendered with dompdf: pure PHP, no Chrome, no binary. Issuer,
  logo, signature, signatory, accent colour and footer are set per brand. See
  [The PDF and its view](/certificates/pdf).
- **A public verification page** at `/certificates/verify/{code}` that says valid, revoked or
  unknown, and an owner-only download route. See
  [The verification page](/certificates/verify).
- **Two Antlers tags** for the signed-in learner's certificates. See
  [Antlers tags](/certificates/tags).
- **One Control Panel screen**, Certificates, with search and revoke. See
  [The Certificates screen](/certificates/control-panel).
- **Optional mail** with the PDF attached, off by default.

## What it is not

- **Not a course engine.** What "completed" means is decided by Courses, not here. That
  includes lessons skipped by a test-out. See [Limits](/certificates/limits).
- **Not a design tool.** The template is a handful of fields. A different layout is a
  published and edited Blade view.
- **Not a mail campaign.** The optional mail is one message with the PDF attached, sent
  through the default mailer. A site that already sends its own "course finished" mail can
  link to the download instead.

## How it fits

```
Courses fires CourseCompleted(userId, courseId)
  → IssueCertificateOnCourseCompleted
      ├─ refused (no name, course gone)
      │    → CertificateNotIssued, a warning in the log
      └─ certificates_issued row, snapshot taken
           ├─ CertificateIssued
           └─ MailCertificate, only when mail is on
                → queued mail with the PDF

learner → {{ certificates }}               download_url, verify_url
        → GET /certificates/{code}/download  the PDF, owner only
anyone  → GET /certificates/verify/{code}    valid, revoked or unknown
```

**A failure does not break the learner's request.** The listener runs inside the request that
completed the last lesson. A refusal is announced and logged, any other error goes to the
exception handler, and the backfill picks up whatever was missed.

## Next

- [Installation](/certificates/installation)
- [Configuration](/certificates/configuration)
- [Issuing and the snapshot](/certificates/issuing)
- [The PDF and its view](/certificates/pdf)
- [The verification page](/certificates/verify)
- [Antlers tags](/certificates/tags)
- [The Certificates screen](/certificates/control-panel)
- [Console and backfill](/certificates/console)
- [Limits](/certificates/limits)
- [Reference](/certificates/reference): facade, events, exceptions, table, routes, permissions
- [Troubleshooting](/certificates/troubleshooting)
