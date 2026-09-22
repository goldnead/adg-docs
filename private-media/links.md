# Signed links and the tag

<AddonHeader />

A private file is never linked by its path. A template asks for a link, and the link carries
the resource, the path, an expiry and a token bound to the user it was made for. Laravel signs
all of it.

## `{{ private_media:url }}`

```antlers
<video src="{{ private_media:url resource="cvt-101" asset="videos/intro.mp4" }}" controls></video>

{{# an assets field works too #}}
<video src="{{ private_media:url resource="cvt-101" :asset="lesson_video" }}" controls></video>
```

| Parameter | |
| --- | --- |
| `resource` | required; the slug of what access is granted to (with Entitlements: the product slug) |
| `asset` | a path in the container, a `container::path` id, or an asset from an assets field |
| `ttl` | minutes the link stays valid; default [`links.ttl`](/private-media/configuration#links-ttl) (240) |

An assets field with `max_files` above one hands over a collection; the first asset is the one
used.

**The tag renders nothing** for a guest, with the [route switched
off](/private-media/configuration#routes), for an empty resource or one containing a slash, and
for an asset from another container. A template never prints a link that would only be
refused.

## Static caching

The link belongs to one user. On a site with static caching, wrap the tag in `nocache`, or the
first visitor's link is cached and served to everyone, who is then refused as `wrong_user`:

```antlers
{{ nocache }}
  <video src="{{ private_media:url resource="cvt-101" :asset="lesson_video" }}" controls></video>
{{ /nocache }}
```

## From PHP

```php
use Goldnead\PrivateMedia\Facades\PrivateMedia;

$url = PrivateMedia::url($user, 'cvt-101', 'videos/intro.mp4', ttlMinutes: 30);
```

`null` in the same cases in which the tag renders nothing. `$user` is a Statamic user, any
`Authenticatable`, or an id.

## What the link binds

- **The URL itself.** Resource, path, expiry and viewer token are all signed. Editing any
  part, the deadline included, breaks the signature and the request is refused as
  `signature`.
- **The deadline.** Past it the request is refused as `expired`.
- **The user.** The viewer token is an HMAC of the user id under the app key, so the link does
  not print the id. Opened by somebody else who is signed in, it is refused as `wrong_user`;
  opened by nobody signed in, as `unauthenticated`.

A forwarded link therefore dies at the recipient's first request, an expired one at anyone's.
Rotating `APP_KEY` invalidates every link already handed out.

## Picking a `ttl`

Pick one longer than your longest video. A player that seeks after expiry is refused as
`expired`, and only a page reload makes a new link. A tab left open overnight hits exactly
that. Fetching a fresh link on a 403 `expired` belongs to the player; see
[Limits and open questions](/private-media/limits).

After a redirect ([`delivery.strategy`](/private-media/configuration#delivery) `redirect`, or
`auto` with a bucket), the provider's temporary URL has a deadline of its own,
`temporary_url_ttl`, and this addon no longer sees the requests made to it.
