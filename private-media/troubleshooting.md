# Troubleshooting

<AddonHeader />

Start with the code. A refusal answers with JSON, `{"error": {"code": "…"}}`, and the same code
is in the audit row and in `MediaRefused`. The table is on
[Security notes](/private-media/security#refusal-codes).

## The tag renders nothing

In order:

1. **Is the route on?** [`routes.enabled`](/private-media/configuration#routes) is off by
   default. Without the route there is nothing to sign.
2. **Is somebody signed in**, on the guard in `routes.guard`?
3. **Is the asset in the configured container?** An asset or `container::path` id from another
   container renders nothing. So does a path with `..`, a leading slash or a backslash.
4. **Is `resource` set**, and free of slashes?

## Everybody is refused as `no_access`

1. **Is Entitlements installed, at 1.3 or later?** Without it, and without a `MediaAccess`
   binding of your own, every request is refused. That is the default on purpose. See
   [Access and entitlements](/private-media/access).
2. **Does the user hold the product named by `resource`?** With Entitlements, the resource slug
   is the product slug.
3. **Is the subject type right?** The grant was written under one type and the package asks
   with another. On a flat-file site the type is `user` unless
   [`PRIVATE_MEDIA_SUBJECT_TYPE`](/private-media/configuration#entitlements-subject-type) says
   otherwise.

## Everybody is refused as `wrong_user`

The page with the link is statically cached, and every visitor gets the first visitor's link.
Wrap the tag in `{{ nocache }}…{{ /nocache }}`. See
[Signed links and the tag](/private-media/links#static-caching).

## A video stops after a while with `expired`

The link outlived its [`links.ttl`](/private-media/configuration#links-ttl) and the player
asked for another range. Raise the TTL above your longest video, or have the player fetch a new
link on a 403 `expired`. A page reload also makes a new one.

## Every request is `unauthenticated`

`routes.middleware` does not include what puts the signed-in user on the request. For a
session that is `web`, the default. If the user signs in on a different guard, set
`routes.guard`.

## Everything is `storage_unavailable`

- The container in `source.container` does not exist, or neither a container nor a disk is
  set. The log says which.
- `delivery.strategy` is `redirect` on a disk that cannot make temporary URLs, such as a local
  disk. Set it to `auto` or `stream`.
- The storage did not answer. The log line carries the exception; check the disk and its
  credentials.

## A file in the bucket answers `not_found`

With a container as source, a path is looked up in Statamic's asset listing, which is cached.
A file put into the bucket outside Statamic (CLI, provider console) answers `not_found` until
`php artisan statamic:assets:clear-cache` has run. Uploads through the Control Panel are seen at
once.

## A file answers `file_empty`

The file is there with zero bytes, most likely an aborted upload. Upload it again.

## Seeking in a long video is slow

The disk is remote and `delivery.strategy` is `stream`. Every seek reads forward from byte 0.
Use `auto` or `redirect` for remote disks.

## Players get 429

The [throttle](/private-media/configuration#routes) is too tight for the number of range
requests a player makes. Raise `PRIVATE_MEDIA_THROTTLE`, or set it empty to switch it off.

## The table does not exist

`php artisan migrate` has not run. The audit row is written on every refusal and every opening,
so a missing table fails the request.
