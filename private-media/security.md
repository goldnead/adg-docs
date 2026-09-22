# Security notes

<AddonHeader />

What stands between a URL and a private file, in the order the route checks it. Each refusal
names itself with a code, and the same code is in the JSON answer, the audit row and
`MediaRefused`.

## The checks, in order

1. **Signature.** The URL is exactly what `PrivateMedia::url()` signed: resource, path,
   expiry and viewer token. Any edit breaks it.
2. **Expiry.** The signature matches and the deadline has not passed.
3. **Viewer.** Somebody is signed in, and it is the user the link was made for. The token is an
   HMAC of the user id under the app key, compared in constant time, so the id never appears in
   the URL.
4. **Path shape.** The path could be a file at all.
5. **Access.** `MediaAccess` allows this user this file of this resource. Asked before the
   file is looked up, so a user without access cannot find out which files exist.
6. **The file.** It is in the source, not empty, and the storage answers.
7. **The range.** The requested range lies inside the file.

## Path fences

Three, one after the other:

- **Shape.** Relative, forward slashes, no empty, `.` or `..` segment, no scheme, no drive
  letter, no control characters, no backslash, at most 1024 bytes. The router has already
  decoded `%2e%2e%2f` into `../` by then, so an encoded climb is caught as the plain one; a
  still-encoded `%2f`, `%5c` or `%2e` is refused, because no stored file needs one in its name.
- **The container.** The path is looked up in the configured asset container. Whatever the URL
  says, nothing outside it can be served.
- **The disk root.** On a local disk the file's real location must lie under the disk's real
  root. A symlink inside the container that points out of it fails here.

## What a response carries

- `Cache-Control: private, no-store` on every answer, refusals and redirects included.
- `Content-Security-Policy: sandbox` and `X-Content-Type-Options: nosniff` on every stream.
- **Active content goes out as an attachment.** Video, audio, raster images (PNG, JPEG, GIF,
  WebP, AVIF), PDF and plain text are sent `inline`. Everything else, HTML, SVG, XML,
  JavaScript and office files among it, is sent as `attachment`, so nothing runs script on the
  site's origin.
- File names in UTF-8, with an ASCII fallback.
- The file is opened before any header is sent. A file that cannot be opened is
  `storage_unavailable` (503), not a 200 whose body breaks off after the headers promised the
  full length.
- A `HEAD` request gets the headers and no body.

## Refusal codes

| Code | Status | When |
| --- | --- | --- |
| `signature` | 403 | the URL is not exactly what was signed (edited path, resource, expiry, token) |
| `expired` | 403 | the signature matches, the deadline has passed |
| `unauthenticated` | 401 | nobody is signed in |
| `wrong_user` | 403 | somebody else is signed in |
| `not_found` | 404 | the path could never be a file (`..`, absolute, scheme, backslash, control characters) |
| `no_access` | 403 | `MediaAccess` said no |
| `not_found` | 404 | no such file in the container, or a symlink out of the disk's root |
| `file_empty` | 404 | the file has zero bytes (an aborted upload) |
| `storage_unavailable` | 503 | the storage did not answer, the container is missing, or `redirect` on a disk without temporary URLs |
| `range_not_satisfiable` | 416 | the range starts at or past the end |

Refusals are JSON:

```json
{"error": {"code": "no_access", "message": "Your account has no access to this file."}}
```

The message is in the site's language (English and German ship), with umlauts and slashes
unescaped so it stays readable when the URL is opened in a tab. `file_empty` reads the same as
`not_found` to the user; the difference is in the code and in the log. Storage failures are
caught narrowly, as filesystem and AWS exceptions: a programming error stays a 500 with its
stack trace rather than being dressed up as an outage.

## What it does not protect against

A redirect hands the browser a provider URL that works for anyone holding it until it expires.
A signed link stops forwarding, not a user who saves the stream. See
[Limits and open questions](/private-media/limits).
