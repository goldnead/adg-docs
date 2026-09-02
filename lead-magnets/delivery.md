# Delivery and downloads

<AddonHeader />

The delivery mail carries a signed URL. The download route verifies the signature, asks whether
the access still stands, counts the redemption, writes an audit row, and only then serves.

## The link

```php
URL::temporarySignedRoute(
    'lead-magnets.download',
    $expiresAt,
    ['grant' => $grant->getKey()],
);
```

**Nothing about the file is in the URL.** The grant id is; the resource is read from the grant,
and the path on disk never leaves the server.

The expiry is the resource's `link_ttl`, then `delivery.link_ttl` (default seven days), with a
floor of one minute. It is then **capped by the grant's own lifetime**:

```php
if ($grant->expires_at !== null && $grant->expires_at->lt($expiresAt)) {
    $expiresAt = $grant->expires_at;
}
```

A seven-day link on a grant that expires tomorrow is a one-day link. A link may never outlive the
access it belongs to.

## Four gates, in order

```php
// 1. the `signed` middleware, before the controller runs
abort_unless($record !== null && $record->isRedeemable(), 403);          // 2
$resource = Resource::query()->find($record->resource_id);
abort_if($resource === null, 404);                                       // 3
$grants->recordDownload($record, [...]);                                 // 4
ResourceDownloaded::dispatch($record, $download);
```

**1. The signature.** Laravel's `signed` middleware refuses an expired link, an edited grant id, a
pushed-out expiry, an edited signature and an unsigned URL. All five are 403, and none of them
reaches this package's code.

**2. Redeemability.** The signature proves the link was *issued*. Whether the access still stands
is a separate question, and it is asked separately: a revoked grant holds links that verify
perfectly and must not serve.

```php
isRedeemable() === isActive() && ! hasLapsed() && ! downloadsExhausted()
```

**3. The resource.** Loaded by key rather than through the relation, so a grant whose resource was
deleted out from under it answers 404 rather than dereferencing null.

**4. The count and the audit**, in one transaction, **before** anything is served. A transfer that
fails halfway is still counted, which is the conservative direction for a cap.

## Serving a file

```php
$disk = Storage::disk($resource->disk());
abort_unless($resource->file_path && $disk->exists($resource->file_path), 404);

return $disk->download($resource->file_path, $filename);
```

A **streamed download response** from the disk. Never a public URL, never a redirect to the
storage layer, never a temporary S3 URL that outlives the check that authorised it.

The disk is the resource's `file_disk`, then `delivery.disk`, then `filesystems.default`.

The filename shown to the visitor is built from the resource **title**, stripped to letters,
numbers, hyphens, underscores and spaces, with the extension taken from the stored path. The
storage path is not part of it.

::: warning `file_path` and `file_disk` never leave the server
The Control Panel's own Inertia payload omits both, and a test asserts it. If you are building a
custom screen against this data, do not add them back.
:::

## Serving a link

```php
abort_if(! $resource->link_url, 404);

return redirect()->away($resource->link_url);
```

Counted and audited **before** the redirect is issued. A redirect that is not audited is a
delivery nobody can prove happened.

Everything past the redirect is outside this package. A link resource's target is not signed, not
expiring and not counted a second time.

## The audit

One row per redemption:

| Column | Content |
| --- | --- |
| `downloaded_at` | When |
| `ip_hash` | SHA-256 of the client address |
| `user_agent` | Truncated to 255 characters |

The address itself is never stored. The hash is enough to recognise "the same client again"
without holding personal data the audit has no use for, and it is enough to make one link being
used from six places visible.

`grants.download_count` is incremented in the database in the same transaction, so two
simultaneous downloads count as two.

## What stops somebody sharing a link

Stated plainly, because the honest answer is "less than people assume".

| Control | What it does |
| --- | --- |
| Signature expiry | The link stops working, capped by the grant's lifetime |
| `max_downloads` | The grant refuses after N redemptions, counted atomically |
| Revocation | An editor kills it immediately, against links already in mailboxes |
| The audit | Makes sharing visible afterwards |

**Nothing binds a link to a person or a device.** There is no per-IP binding, no one-time nonce
and no login requirement. A link forwarded within its lifetime works for whoever receives it.

`delivery.max_downloads` defaults to `null`, meaning no cap at all, and with the default
seven-day `link_ttl` that is a week of unlimited redemptions. Set a cap on anything you would mind
seeing on a forum.

## Re-sending

An editor can re-send access from the grant screen. It mints a **new** signed link, and the old
one keeps working until it expires on its own schedule.

There is no way to invalidate a single outstanding link short of revoking the grant, which
invalidates all of them.

## The two mails

| Mail | Template slug | Blade fallback |
| --- | --- | --- |
| Confirmation | `mail.confirmation_template` | `lead-magnets::mail.confirmation` and `.confirmation-text` |
| Delivery | `mail.delivery_template` | `lead-magnets::mail.delivery` and `.delivery-text` |

Both have an HTML and a plain-text part. Both are publishable:

```bash
php artisan vendor:publish --tag=lead-magnets-views
```

With [Email Templates](/email-templates/) installed, the slug is resolved through that addon and
an editor writes the body in the Control Panel. Variables available to both:

```
email
resource_title
resource_handle
resource_description
confirm_url        confirmation mail only
download_url       delivery mail only
```

Values are **HTML-escaped** when the bridge puts them into the body — `email` is whatever a
visitor typed into the form, and this mail goes to an address nobody has confirmed yet. The two
links are the exceptions, named in `EmailTemplatesBridge::RAW_VARIABLES`, because both sit in an
`href` and carry a query string. The subject line is not HTML and is filled unescaped.

The bridge falls back to the Blade view for an empty slug, a missing template **and** a template
whose body is empty, so a half-finished template in the Control Panel does not send an empty mail.

A held send returns `false` and writes the reason into `meta`. See
[The request flow](/lead-magnets/request-flow#suppression-holds-a-send-without-failing-the-request).
