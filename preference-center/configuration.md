# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=preference-center-config
```

Five groups. Most installations change one line in `.env` and never publish the file at all.

```php
// config/preference-center.php

return [
    'routes' => [...],
    'sources' => [...],
    'magic_link' => [...],
    'delivery' => [...],
    'audit' => [...],
];
```

## `routes`

```php
'routes' => [
    'enabled' => env('PREFERENCE_CENTER_ROUTES', true),
    'prefix' => env('PREFERENCE_CENTER_ROUTE_PREFIX', '!/preference-center'),
    'middleware' => ['web'],
],
```

`enabled` mounts or unmounts all seven routes. With it off, both
[`urlForToken()` and `requestUrl()`](/preference-center/extending) return `null`, which is
the answer a sibling package needs in order to fall back to its own path rather than
publishing a dead link into a mail.

The prefix is deliberately **not** `/preferences`. A host that already owns that URL should
not have to fight an addon for it. `!/` is Statamic's convention for a route that belongs to
the system rather than to the content tree.

`middleware` must keep a session driver in it. The magic-link entrance stores a short-lived
note in the session, and the `web` group is what gives it one.

## `sources`

```php
'sources' => [
    'marketing' => env('PREFERENCE_CENTER_SOURCE_MARKETING', 'auto'),
    'notifications' => env('PREFERENCE_CENTER_SOURCE_NOTIFICATIONS', 'auto'),
    'suppression' => env('PREFERENCE_CENTER_SOURCE_SUPPRESSION', 'auto'),
],
```

`auto` asks the class map. `false` turns a block off even where the package is installed.
Nothing turns a block **on** where the classes are missing, because there would be nothing
to call.

Turning a source off is not cosmetic and does not hide it from a determined poster: the
write paths refuse an absent source as firmly as the render path omits it. See
[Sources](/preference-center/sources).

::: warning Switching Marketing off unmounts the token door
`preference-center.sources.marketing => false` removes the two `/t/{pcToken}` routes, and
`urlForToken()` starts returning `null` for every token. That is intended, and it is why the
discovery interface reports the switch rather than trusting `Route::has()` alone.
:::

## `magic_link`

```php
'magic_link' => [
    'enabled' => env('PREFERENCE_CENTER_MAGIC_LINK', true),
    'ttl_minutes' => env('PREFERENCE_CENTER_MAGIC_LINK_TTL', 30),
    'session_minutes' => env('PREFERENCE_CENTER_MAGIC_LINK_SESSION', 60),
    'min_response_ms' => env('PREFERENCE_CENTER_MAGIC_LINK_FLOOR_MS', 350),
    'allow_unknown_addresses' => env('PREFERENCE_CENTER_MAGIC_LINK_ALLOW_UNKNOWN', false),
    'throttle' => [
        'per_address' => [
            'max' => env('PREFERENCE_CENTER_THROTTLE_ADDRESS_MAX', 3),
            'decay_minutes' => env('PREFERENCE_CENTER_THROTTLE_ADDRESS_DECAY', 60),
        ],
        'per_origin' => [
            'max' => env('PREFERENCE_CENTER_THROTTLE_ORIGIN_MAX', 10),
            'decay_minutes' => env('PREFERENCE_CENTER_THROTTLE_ORIGIN_DECAY', 60),
        ],
    ],
    'from' => [
        'address' => env('PREFERENCE_CENTER_MAIL_FROM'),
        'name' => env('PREFERENCE_CENTER_MAIL_FROM_NAME'),
    ],
],
```

| Key | Meaning |
| --- | --- |
| `enabled` | `false` makes both `/request` routes answer 404. The other two doors are unaffected |
| `ttl_minutes` | Life of the signed URL. Short on purpose: there is no token table, so the lifetime is the whole revocation story |
| `session_minutes` | Life of the note a followed link leaves in the session, independent of the host's session lifetime |
| `min_response_ms` | Floor under the response time of a link request, so a stopwatch cannot tell the fast path from the slow one |
| `allow_unknown_addresses` | Off, and it should stay off |

`ttl_minutes` is not the same trade-off as a Marketing unsubscribe token, which never
expires because an unsubscribe link in a two-year-old mail must still work. Nothing in a
two-year-old mail points here.

Raise `min_response_ms` if your mailer is slower than the floor on the machine that serves
the request. A floor lower than the real send time reintroduces the timing oracle it exists
to remove.

::: danger `allow_unknown_addresses` is an open relay with extra steps
On, this endpoint mails a signed link to anything typed into it. It exists for one honest
case: an installation with neither a marketing list nor a contact store, where nobody is
known yet. Turn it off again as soon as one of the two exists.
:::

Both limiters are needed and neither is sufficient. Per-address alone lets one client mail
ten thousand different people; per-origin alone lets ten thousand clients mail one person.
[Magic links](/preference-center/magic-links) has the detail.

`from` overrides the application's default sender for this one mailable. Leave it null to
use `mail.from`.

## `delivery`

The group that exists because a link does not always arrive as it was sent.

```php
'delivery' => [
    'mail_headers' => [
        // 'X-Mailgun-Track-Clicks' => 'no',
    ],
    'ignored_query_parameters' => [
        '_se',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'mc_cid', 'mc_eid',
        '_hsenc', '_hsmi',
        'mkt_tok',
    ],
],
```

### `mail_headers`

Anything listed here is added verbatim to the outgoing magic-link message. Most providers
take a per-message header that switches click tracking off for that one message, which is
the right setting for a transactional link: nobody wants a click rate for it, and an
untouched link cannot be broken.

Empty by default, because an addon that guessed your provider and changed how it behaves
would be worse than one that asks. The values below are the ones the config file names, each
verified against the vendor's own documentation in July 2026:

| Provider | Header |
| --- | --- |
| Mailgun | `X-Mailgun-Track-Clicks: no` |
| Postmark | `X-PM-TrackLinks: None` |
| SparkPost | `X-MSYS-API: {"options":{"click_tracking":false}}` |
| SendGrid | `X-SMTPAPI: {"filters":{"clicktrack":{"settings":{"enable":0}}}}` |
| Mailjet | `X-Mailjet-TrackClick: 0` |
| Mandrill | `X-MC-Track: opens` (an allow-list; anything unnamed is off) |
| Elastic Email | `trackclicks: false` |

Three providers need nothing here. Amazon SES rewrites links only when the configuration set
named in `X-SES-CONFIGURATION-SET` publishes click events, so sending without that header is
already the off position. Resend has tracking off by default, per domain. **Brevo has no such
header and none is coming**, which is why the ignore list below is not defence in depth on
Brevo — it is the only thing that works.

### `ignored_query_parameters`

These names are left out of the signature check. Every one of them is a parameter a mail
provider appends to somebody else's URL on the way through its click redirector.

Two guarantees bound the cost, and both have to hold:

1. **The payload is in the path.** `/link/{pcLink}` carries an encrypted blob; the address
   and the brand come out of it, never out of a query parameter. The path stays inside the
   signed string.
2. **`expires` stays signed.** It is stripped out of whatever a host configures, along with
   `signature`, and cannot be added back. A host that could ignore `expires` would have
   handed out the right to choose its value, which turns a thirty-minute link into a
   permanent one.

Names are also filtered to `[A-Za-z0-9_.-]`, because the list is passed to the router as a
comma-separated middleware argument and a name with a comma in it would not be one ignored
parameter but two, one of them invented.

::: warning Do not add `gclid` or `fbclid`
They are absent on purpose. They do not appear on the path from a mail to this route, and a
list that grows by association is how one ends up ignoring the wrong thing.
:::

## `audit`

```php
'audit' => [
    'log_channel' => env('PREFERENCE_CENTER_AUDIT_LOG'),
    'leadhub' => env('PREFERENCE_CENTER_AUDIT_LEADHUB', true),
],
```

`log_channel` is a Laravel log channel name, or null for the default channel. Every applied
change is written there with the identity pseudonymised and the consent proof in full.

`leadhub` additionally writes the record to the contact timeline where LeadHub is installed,
which is where a data-subject request will look for it. Set it to `false` only if you keep
that history somewhere else.

## Environment summary

```dotenv
PREFERENCE_CENTER_ROUTES=true
PREFERENCE_CENTER_ROUTE_PREFIX="!/preference-center"

PREFERENCE_CENTER_SOURCE_MARKETING=auto
PREFERENCE_CENTER_SOURCE_NOTIFICATIONS=auto
PREFERENCE_CENTER_SOURCE_SUPPRESSION=auto

PREFERENCE_CENTER_MAGIC_LINK=true
PREFERENCE_CENTER_MAGIC_LINK_TTL=30
PREFERENCE_CENTER_MAGIC_LINK_SESSION=60
PREFERENCE_CENTER_MAGIC_LINK_FLOOR_MS=350
PREFERENCE_CENTER_MAGIC_LINK_ALLOW_UNKNOWN=false
PREFERENCE_CENTER_THROTTLE_ADDRESS_MAX=3
PREFERENCE_CENTER_THROTTLE_ADDRESS_DECAY=60
PREFERENCE_CENTER_THROTTLE_ORIGIN_MAX=10
PREFERENCE_CENTER_THROTTLE_ORIGIN_DECAY=60
PREFERENCE_CENTER_MAIL_FROM=
PREFERENCE_CENTER_MAIL_FROM_NAME=

PREFERENCE_CENTER_AUDIT_LOG=
PREFERENCE_CENTER_AUDIT_LEADHUB=true
```
