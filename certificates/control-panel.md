# The Certificates screen

<AddonHeader />

One screen: the current brand's issued certificates, with search, sort, a link to each
verification page, and revoke.

<Figure
  src="certificates-cp-list"
  alt="The Certificates listing in a German Control Panel: three certificates with learner, course, issue date, a green Valid badge and the formatted code; a row action menu at the end of each row"
  caption="The playground in German, shortly before release. 0.1.0 adds a sixth column, the revocation reason." />

## Who sees it

Users with the permission `manage certificates`, under the group **Certificates** in the role
editor. Without it the nav entry is missing and the URL is refused. Super users hold it.

The template settings are a separate permission, `manage certificates settings`; see
[Brand settings](/certificates/configuration#brand-settings).

The entry sits in the suite's shared nav section when [Payments](/payments/) provides one, and
under **Content** otherwise. [`cp.enabled`](/certificates/configuration#cp-enabled) removes the
entry and the route together.

## The columns

| Column | |
| --- | --- |
| Learner | the name frozen at issue time |
| Course | the title frozen at issue time |
| Issued | the issue date, in the Control Panel user's language |
| Status | Valid or Revoked |
| Code | formatted in groups of four |
| Revocation reason | what was entered when revoking; not sortable |

The listing is Statamic's own in client mode: search, sort and column choice happen in the
browser, because a course site issues hundreds of certificates, not hundreds of thousands.
Past 2,000 the screen shows the newest 2,000 and says how many there are in total.

**Only the current brand's certificates.** In multi-brand mode, switch the brand to see
another brand's.

## Revoking

Each row's action menu has **Open verification page** and, for a valid certificate,
**Revoke**.

<Figure
  src="certificates-cp-revoke"
  alt="The revoke dialog in a German Control Panel: a title, a sentence that the verification page will show the certificate as revoked and the download is blocked and that this cannot be undone, the learner and course, and a required reason field"
  caption="The reason is required and shown only in the Control Panel." />

The reason is required, up to 1,000 characters. It is shown in the Control Panel and nowhere
else, not on the verification page. What revoking does is on
[Issuing and the snapshot](/certificates/issuing#revoked-means-gone). It cannot be undone.

There is no bulk revoke: core's bulk actions cannot ask for a reason per row.

## Empty and unfinished installs

- **Migration not run:** a sentence saying so, and a warning in the log,
  `statamic-certificates: the certificates_issued table is missing; run php artisan migrate.`
  Not a 500.
- **No certificates yet:** a sentence saying that certificates are issued when someone
  completes a course, or with `php artisan certificates:issue`.
