# Private Media

<AddonHeader />

Private media for Statamic 6: files in an asset container that only the right user can open.
A template asks for a link, the link is signed, expires, and works only for the user it was made
for. The route checks signature, user and access, then streams the file with byte ranges, so a
video can seek, or redirects to a temporary URL of the storage provider. Every refusal and every
opening is written to an audit table.

Who may open what is asked of [Entitlements](/entitlements/) by default, or of your own
`MediaAccess` binding.

## What it is

- **Signed links bound to the viewer.** `{{ private_media:url }}` and `PrivateMedia::url()`
  make a link for the signed-in user. Opened by anybody else it is refused as `wrong_user`;
  after its deadline as `expired`. See [Signed links and the tag](/private-media/links).
- **One delivery route**, off until a site switches it on, with a configurable prefix,
  middleware and throttle. See [Configuration](/private-media/configuration#routes).
- **Two ways out.** Local disks are streamed by the app, with single byte ranges; disks that
  make temporary URLs (S3 and compatible) get a 302 to one. See
  [Configuration](/private-media/configuration#delivery).
- **An access seam**, `MediaAccess`, answered by Entitlements when it is installed and closed
  when it is not. See [Access and entitlements](/private-media/access).
- **An audit table** and a prune command, plus two events. See
  [Audit trail and pruning](/private-media/audit).

## What it is not

- **Not a Control Panel screen.** There is nothing to configure per entry, and the audit table
  is meant for queries and reports, not browsing.
- **Not a player.** It hands a template a URL. The `<video>` element, or whatever plays the
  file, is the site's.
- **Not DRM.** No transcoding, no HLS, no limit on devices. A signed link stops forwarding, not a
  user who saves the stream. See [Limits and open questions](/private-media/limits).

## How it fits

```
template → {{ private_media:url resource="…" asset="…" }}
             signed link: resource, path, expiry, viewer token
browser  → GET /private-media/{resource}/{path}
             ├─ signature, expiry, viewer ─▶ refused with a code
             ├─ MediaAccess ─▶ Entitlements::allows(subject, resource)
             ├─ path in the container ─▶ not_found / file_empty
             └─ stream (206 ranges) or 302 to a temporary URL
                  ├─ audit row
                  └─ MediaServed / MediaRefused
```

**Without Entitlements every request is refused**, unless you bind your own `MediaAccess`. A
site that forgot to install it should find its media shut, not handed to everyone with an
account.

## Where it came from

The package is extracted from adriangoldner.com, where the same streaming, redirect and audit
logic serves the site's private videos. The signed viewer-bound links, the path fences, the 416 answer,
the strategy switch, the events and the prune command are new. What was taken, what was built
new and what stayed behind is recorded in `docs/EXTRACTION.md` in the package.

## Next

- [Installation](/private-media/installation)
- [Configuration](/private-media/configuration)
- [Signed links and the tag](/private-media/links)
- [Access and entitlements](/private-media/access)
- [Audit trail and pruning](/private-media/audit)
- [Security notes](/private-media/security)
- [Limits and open questions](/private-media/limits)
- [Reference](/private-media/reference): facade, events, route, table, command
- [Troubleshooting](/private-media/troubleshooting)
