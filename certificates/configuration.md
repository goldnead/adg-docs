# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=certificates-config
```

Fifteen keys in `config/certificates.php`, four of them with an environment variable. Eight of them, the template and the mail switch,
can also be set per brand on the shared settings screen; see
[Brand settings](#brand-settings) below.

| Key | Default | What happens when it is wrong |
| --- | --- | --- |
| `issue_on_completion` | `true` | Off, `CourseCompleted` issues nothing. Certificates come only from `Certificates::issue()` or the command. |
| `template.issuer_name` | `CERTIFICATES_ISSUER_NAME`, else `APP_NAME` | The name above the title and on the verification page. Frozen on each certificate when it is issued. |
| `template.logo` | `null` | An asset reference that does not resolve is logged and the PDF renders without it. |
| `template.signature` | `null` | The same, for the signature image. |
| `template.signatory_name` | `null` | Frozen on the certificate when it is issued. |
| `template.signatory_title` | `null` | The same. |
| `template.accent_color` | `'#1f2937'` | Anything but a hex colour falls back to the default. |
| `template.footer` | `null` | Small print at the bottom of the PDF. |
| `storage.disk` | `'local'` (`CERTIFICATES_DISK`) | A public disk would put PDFs where anyone can fetch them. Use a private one. |
| `storage.path` | `'certificates'` | The folder on that disk. |
| `mail.enabled` | `false` (`CERTIFICATES_MAIL_ENABLED`) | On, every issued certificate is mailed with the PDF attached. |
| `routes.enabled` | `true` (`CERTIFICATES_ROUTES_ENABLED`) | Off, the verification page and the download do not exist, and the tags return no URLs. |
| `routes.prefix` | `'certificates'` | Changes both URLs. Certificates already handed out carry the old verification URL. |
| `routes.throttle` | `'30,1'` | A Laravel throttle string, applied to both routes. |
| `cp.enabled` | `true` | Off, the Certificates screen and its nav entry are gone. |

## `issue_on_completion`

The listener on `CourseCompleted` checks this first. Turn it off when certificates should be
issued on some other occasion, by your own code or by hand.

## `template`

```php
'template' => [
    'issuer_name' => env('CERTIFICATES_ISSUER_NAME', env('APP_NAME')),
    'logo' => null,
    'signature' => null,
    'signatory_name' => null,
    'signatory_title' => null,
    'accent_color' => '#1f2937',
    'footer' => null,
],
```

What the PDF and the verification page show besides the learner, the course and the date.
These values are the fallback for a brand that set none on the settings screen.

`logo` and `signature` are asset references in the form `container::path`, for example
`assets::logos/logo.png`. They are read from the asset and embedded into the PDF as data;
the renderer never fetches anything over the network. A reference that is not an image
asset is logged, and the PDF renders without it.

`accent_color` colours the border and the title. Only a hex value (`#abc` or `#aabbcc`)
reaches the stylesheet; anything else falls back to `#1f2937`.

**Some of these are frozen, some stay live.** Issuer, signatory name and signatory title are
copied onto the certificate when it is issued. Logo, signature image, accent colour and footer
are read whenever the PDF is rendered. See
[Issuing and the snapshot](/certificates/issuing#the-snapshot).

## `storage`

```dotenv
CERTIFICATES_DISK=local
```

Generated PDFs live on this disk under `{path}/{code}.pdf`. The row is the record and the
file is a cache: a missing file is rendered again on the next download, and revoking a
certificate deletes its file. Use a private disk. Files are only served through the download
route, which checks that the signed-in user owns the certificate.

## `mail.enabled`

```dotenv
CERTIFICATES_MAIL_ENABLED=true
```

Queues a mail with the PDF attached when a certificate is issued. Off by default: most sites
already send their own "course finished" mail and would rather link to the download than
attach a second copy. The switch is also a per-brand setting, and it is read in the
certificate's brand. The backfill does not mail unless `--mail` is passed. See
[Limits](/certificates/limits#mail) for how the mail goes out.

## `routes`

```dotenv
CERTIFICATES_ROUTES_ENABLED=false
```

```php
'routes' => [
    'enabled' => (bool) env('CERTIFICATES_ROUTES_ENABLED', true),
    'prefix' => 'certificates',
    'throttle' => '30,1',
],
```

`enabled` removes both front-end routes, the verification page and the download. The switch
is checked where the routes are registered, so a disabled route does not exist, and again in
the controllers, so a route cache built while it was on cannot keep it open. The tags then
return `null` for `download_url` and `verify_url`, and the PDF prints no verification URL.

These values are read when routes are registered, so a change needs a route cache clear.

`throttle` is applied to both routes. The default, `30,1`, is thirty requests a minute. It is
what keeps the verification page from being used to try codes in bulk, on top of the code
itself being 100 random bits. See [The verification page](/certificates/verify).

## `cp.enabled`

Removes the nav entry and the route together: a hidden entry with a reachable URL would not
be a disabled screen.

## Brand settings

Under **Settings** in the Control Panel, on the shared settings screen that
[Brand Context](/brand-context/settings) provides, Certificates adds a section with two
groups. Values are stored per brand; only overrides are stored, and an unset field keeps
following `config/certificates.php`.

| Group | Field | Config key |
| --- | --- | --- |
| Certificate template | Issuer | `template.issuer_name` |
| | Logo | `template.logo` |
| | Signature | `template.signature` |
| | Signed by | `template.signatory_name` |
| | Title | `template.signatory_title` |
| | Accent colour | `template.accent_color` (at most 7 characters) |
| | Footer | `template.footer` (at most 500 characters) |
| Delivery | Send by mail | `mail.enabled` |

The section needs the permission `manage certificates settings`.

**Not on the settings screen, on purpose:** `routes.*` and `cp.enabled` are read while routes
and nav are registered, before the settings layer applies its values, so a change there would
never arrive. `storage.*` is a deployment detail. `issue_on_completion` stays in config as
well.

A certificate belongs to the brand that was current when it was issued. Its PDF is rendered
in that brand, whichever brand serves the download or sends the mail.
