# Limits and open questions

<AddonHeader />

What the package does not do, and the decisions that are still open. Each open question is
listed in `docs/EXTRACTION.md` in the package, and none of them is answered in 0.1.0.

## Limits

- **After a redirect the file leaves the fence.** Local disks are streamed, remote disks
  redirect to the provider's temporary URL, as in the source site. After the redirect that URL
  works for anyone holding it until it expires
  ([`delivery.temporary_url_ttl`](/private-media/configuration#delivery)), and this addon no
  longer sees those requests.
- **No limit on concurrent devices.** One user can play the same file on as many devices as
  they like; each gets its own link.
- **No transcoding, HLS or DRM.** A signed link stops forwarding, not a user who saves the
  stream.
- **One range per request.** A multi-range request gets the whole file, not a multipart answer.
- **Streaming from a remote disk reads forward from byte 0** on every seek. See
  [Configuration](/private-media/configuration#delivery).
- **Files uploaded straight to a bucket** answer `not_found` until
  `php artisan statamic:assets:clear-cache` has run. See
  [Troubleshooting](/private-media/troubleshooting#a-file-in-the-bucket-answers-not-found).
- **Not brand-scoped.** The audit table carries no `brand_id`, and the package neither
  requires nor detects Brand Context. A resource slug is already unique per site.

## Open questions

1. **Concurrent devices.** The same person on four devices is not addressed. It would need a
   session or heartbeat table and a policy (kick the oldest, refuse the newest). The signed
   link does not help, since each device gets its own.
2. **Redirect or stream for course videos.** After a 302 the provider URL is a bearer token for
   its lifetime. Streaming everything keeps the check on every request but costs bandwidth on
   the app server. Which one course videos should use is not decided.
3. **Link lifetime against long videos.** The default is 240 minutes. A tab left open overnight
   gets `expired` on the next seek. A player that fetches a new link on a 403 `expired` would
   fix it, and that belongs to the consumer: [Courses](/courses/) or a site's own player.
4. **Does the path belong to the resource?** The Entitlements default does not check that the
   file belongs to the resource. A user cannot swap it in a signed link, but a template can
   sign any pairing. Whether the default should require the path to lie under a folder named
   after the resource, behind a config switch, is open. Until then, bind your own
   [`MediaAccess`](/private-media/access#the-default-does-not-look-at-the-path).
5. **Moving adriangoldner.com over.** The source site still has its own media route, with its
   own player, keys and legacy manifest. On its staging branch the package is wired in behind a
   switch whose default is still the site's own code; the move is not finished.
