# The verification page

<AddonHeader />

What separates a certificate from a nicely typeset PDF is that a third party can check it.
Every certificate prints its code and a URL; the page behind that URL says whether the
certificate is genuine and whether it still stands.

<Figure
  src="certificates-verify"
  alt="The verification page on a phone: the heading Verify a certificate, the line This certificate is valid in green, and the learner, course, issue date, issuer and code, long values wrapped"
  caption="The packaged page at 390 pixels wide, shown on a wider strip of its own background. Long names and titles wrap inside the card." />

## Two routes

Both sit inside the `web` group, both are throttled with
[`routes.throttle`](/certificates/configuration#routes) (default `30,1`), and both disappear
with `CERTIFICATES_ROUTES_ENABLED=false`.

| Route | Name | What |
| --- | --- | --- |
| `GET /certificates/verify/{code}` | `certificates.verify` | Public. Valid, revoked or unknown, with learner, course, date and issuer. |
| `GET /certificates/{code}/download` | `certificates.download` | The PDF, for the signed-in owner only. |

The prefix `certificates` is [`routes.prefix`](/certificates/configuration#routes).

## What the page says

| Status | Heading | Shown |
| --- | --- | --- |
| valid | This certificate is valid. | issued to, course, issued on, issuer, code |
| revoked | This certificate has been revoked. | the same, plus the revocation date |
| unknown | There is no certificate with this code. | nothing else |

Learner, course and issuer are the values frozen when the certificate was issued, never the
brand's current settings. The issuer line is left out when no issuer name was set.

**The revocation reason is not shown.** It is entered in the Control Panel and stays there.

## Nobody can probe for codes

An unknown code and a malformed one get the same page, the same status code (200) and the same
headers. Only the lookup differs, and a malformed code still runs one, so the answer does not
arrive measurably faster. The throttle sits on top, and the code itself is 100 random bits.

The code is looked up across brands: it is unique over the whole table, and a visitor holding
one has no brand in the session.

Every answer carries `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store, private`,
so the page stays out of search engines and out of shared caches.

## The download

The PDF is served as an attachment named after the course and the code, with
`Cache-Control: no-store, private`.

| Who asks | Answer |
| --- | --- |
| a guest | 403 |
| a signed-in user who does not own the certificate | 404, the same as for a code that does not exist |
| the owner of a revoked certificate | 410 |
| the owner | the PDF |

The 404 for another user's code means the route confirms a code to nobody but its owner.

## Changing the page

The page is plain HTML with its own small stylesheet, so it works without a theme. To change
it, publish the views and edit `verify.blade.php`:

```bash
php artisan vendor:publish --tag=certificates-views
```

It receives `$status` (`valid`, `revoked` or `unknown`), `$certificate` (`null` for `unknown`),
`$code` (formatted, `null` for `unknown`) and `$issuerName`. An unknown and a malformed code
reach the view with the same values, so a changed template cannot tell them apart either.
