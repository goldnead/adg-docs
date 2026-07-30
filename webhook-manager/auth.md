# Authentication & signing

<AddonHeader />

Auth runs in both directions, and the two are separate mechanisms with separate
configuration.

**Outbound**: how the addon proves to a destination that the request is from you.
**Inbound**: how the addon verifies that an incoming request is from who it claims.

## Outbound schemes

| Scheme | Sends | Use when |
| --- | --- | --- |
| `none` | nothing | the URL itself is the secret (Slack, Discord, Teams, Zapier catch hooks) |
| `bearer` | `Authorization: Bearer <token>` | the destination issues API tokens |
| `basic` | `Authorization: Basic <base64>` | a legacy endpoint |
| `header` | a custom header you name | the destination insists on `X-Api-Key` or similar |
| `hmac` | a signature header over the body | the destination verifies the payload was not altered |

Choose per hook. Secrets are masked in the Control Panel while
`security.mask_secrets_in_ui` is on, which it is by default.

### HMAC SHA256

The addon computes an HMAC of the request body with the hook's secret and sends it,
alongside a timestamp:

```
X-Webhook-Signature: sha256=<hex digest>
X-Webhook-Timestamp: 1770000000
```

Both header names are configurable, for a counterparty that insists on its own:

```php
'security' => [
    'signature_header' => 'X-Webhook-Signature',
    'timestamp_header' => 'X-Webhook-Timestamp',
    'default_hash_algorithm' => 'sha256',   // sha256 | sha512
],
```

Verifying it on the receiving end, in any language, is the same three steps: read the
raw body **before** any parsing, recompute the HMAC with the shared secret, and
compare in constant time.

```php
$expected = hash_hmac('sha256', $request->getContent(), $secret);
if (! hash_equals($expected, $signatureFromHeader)) {
    abort(401);
}
```

::: danger Use the raw body
Recomputing the HMAC over a re-serialised parsed body will not match, because key
order and whitespace change. This is the single most common cause of "the signature
is always wrong".
:::

### What HMAC is and is not for

It proves the body was not altered in transit and that the sender holds the secret.
It does **not** encrypt anything: the payload is still plaintext over TLS, and the
destination's logs will contain it.

For a chat destination, HMAC does nothing at all, because Slack and friends do not
verify it. There, the URL is the credential: treat it as a secret and rotate it if it
leaks.

## Inbound verifiers

An inbound endpoint picks one verifier. Six ship with the addon:

| Verifier | Verifies |
| --- | --- |
| No auth | nothing. The URL is the only barrier. |
| Bearer token | a static bearer token |
| Static header | a named header equals a configured value |
| Basic auth | username and password |
| HMAC signature | a signature over the raw body, with timestamp tolerance |
| IP allowlist | the source address |

They compose in the sense that you can put an IP allowlist in front of a proper
verifier, but a single endpoint has one primary scheme.

### Replay protection

Two mechanisms, both on by default for HMAC endpoints:

```php
'inbound' => ['replay_protection_ttl_seconds' => 600],
'security' => ['timestamp_tolerance_seconds' => 300],
```

A request whose timestamp is more than five minutes out is rejected outright, and a
signature already seen within ten minutes is rejected as a replay.

If a counterparty's clock is wrong, fix the clock. Widening the tolerance widens the
window in which a captured request can be resent.

### Choosing an inbound scheme

For a counterparty you control, HMAC. For an ESP or a SaaS that offers a shared
secret in a header, static header. For one that offers nothing, an IP allowlist if
they publish their ranges, and a long random path segment if they do not.

"No auth" is a legitimate choice for a low-stakes endpoint behind an unguessable URL,
and a bad one for anything that writes content.

## The 419 trap

Inbound routes run through the `web` middleware group by default, which includes
CSRF. A POST from an external system has no session and no token, so it gets a
**419**.

The addon's own inbound route handles this with
`withoutMiddleware(ValidateCsrfToken::class)`. If you build your own public POST
endpoint, you have to do the same.

::: warning A test suite cannot see this
Laravel's CSRF middleware skips itself automatically in unit tests. A fully green
suite says nothing about whether the live endpoint 419s, which is exactly how this
shipped once. Test public POST endpoints against a running server.
:::

## Secrets and where they live

Hook secrets are stored with the hook: in the database under the eloquent driver, and
in the YAML file under the flat driver.

::: danger The flat driver puts secrets in git
`content/webhooks/*.yaml` is committed like any other content file. If you use the
flat driver for hooks that carry bearer tokens or HMAC secrets, those secrets end up
in your repository history, where removing them later is not a delete.

Two ways out: keep secret-bearing hooks on the eloquent driver, or reference an
environment variable from the hook config so the file holds a name rather than a
value.
:::

## Rotating a secret

There is no dual-secret window, so rotation is a coordinated change:

1. Update the secret on the destination, if it accepts both old and new.
2. Update the hook.
3. Watch **Deliveries** for the next few events.
4. Replay anything that failed in between.

For an inbound endpoint the same applies in reverse, and the replay window is the
counterparty's retry policy rather than yours.

## Masking

`security.mask_secrets_in_ui` masks secrets on the config screens.
`logging.mask_headers` masks them in delivery snapshots, and it already covers
`authorization`, `x-api-key`, `x-auth-token`, `cookie` and `set-cookie`.

Add your own header names if a destination uses something unusual, or the secret will
sit in plain text in every delivery record.
