# The PDF and its view

<AddonHeader />

The PDF is rendered by dompdf from a Blade view, on one A4 landscape page. dompdf is pure
PHP: no Chrome, no binary, nothing to install on the server beyond Composer.

<Figure
  src="certificates-pdf-long-title"
  alt="The same certificate with a long learner name full of umlauts and a course title that wraps onto two lines; everything, the code and the verification URL included, stays inside the frame"
  caption="Long names and titles step down in size, so the whole certificate stays inside the frame on one page." />

## What is on it

From top to bottom: logo, issuer name, the title "Certificate of Completion", the learner's
name, the course title, the date and the signature line with the signatory's name and title,
the footer, and a line with the certificate code and the verification URL.

The fixed wording comes from the language files (`certificates::messages.pdf.*`), English and
German. What a brand can set is on [Configuration](/certificates/configuration#brand-settings),
and what is frozen at issue time on
[Issuing and the snapshot](/certificates/issuing#the-snapshot).

## Rendered in the certificate's brand

The template values are per-brand settings. A download or a queued mail may run under another
brand or none, so the render switches to the brand stored on the certificate and back. With
multi-brand off there is only one brand, and nothing switches.

## Nothing remote

Logo and signature are read from Statamic assets and embedded as data. dompdf's remote loading
stays off, and so does its PHP evaluation. A certificate that fetched its logo over the network
would be a broken document once that host moved.

## The same certificate, the same bytes

dompdf otherwise stamps "now" and a random file id into every file. The renderer sets the
creation date and the file id from the certificate's code and issue date, so rendering the
same certificate again gives the same file.

## Storage

The rendered file is kept on [`storage.disk`](/certificates/configuration#storage) under
`certificates/{code}.pdf`. The row is the record and the file is a cache: a missing file is
rendered again on the next download, and revoking deletes it. A changed logo, colour or footer
applies to PDFs rendered afterwards; delete the folder to re-render existing ones.

## Overriding the view

```bash
php artisan vendor:publish --tag=certificates-views
```

This copies three views into `resources/views/vendor/certificates/`:

| View | What |
| --- | --- |
| `pdf.blade.php` | the certificate |
| `verify.blade.php` | the public verification page; see [The verification page](/certificates/verify) |
| `mail.blade.php` | the plain-text body of the optional mail |

**dompdf reads CSS 2.1 and a little more.** The packaged layout is therefore one table of fixed
height, with no absolute positioning, no flexbox and no grid. Absolutely placed boxes are drawn
below the page, where no viewer shows them. Keep to tables when you change the layout.

The `@page` margin is carried on the root element: put page margins in `@page`, not on `html`.

## What the view receives

The whole contract is in one public method, `CertificatePdf::viewData()`:

| Variable | Type | Source |
| --- | --- | --- |
| `$certificate` | `Certificate` | the model |
| `$learnerName` | string | frozen at issue time |
| `$courseTitle` | string | frozen at issue time |
| `$issuedAt` | Carbon | the issue date |
| `$code` | string | the code, formatted in groups of four |
| `$verifyUrl` | ?string | `null` when [the routes](/certificates/configuration#routes) are off |
| `$issuerName` | ?string | frozen at issue time |
| `$signatoryName` | ?string | frozen at issue time |
| `$signatoryTitle` | ?string | frozen at issue time |
| `$footer` | ?string | live, from the brand's settings |
| `$accentColor` | string | live, a hex colour; `#1f2937` when the setting is not one |
| `$logo` | ?string | live, a `data:` URI, or `null` |
| `$signature` | ?string | live, a `data:` URI, or `null` |

A published view does not update itself when the package does. Compare it with the packaged one
after an upgrade.
