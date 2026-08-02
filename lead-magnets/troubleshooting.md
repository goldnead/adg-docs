# Troubleshooting

<AddonHeader />

## `composer require goldnead/statamic-lead-magnets` cannot find the package

It is not on Packagist and has no tag. Install from a checkout with a path or VCS repository. See
[Installation](/lead-magnets/installation).

## The Control Panel screens have no styling and no JavaScript

The bundle is not committed to the repository. It is attached to each GitHub release as
`dist.tar.gz` and fetched at install time by `pixelfear/composer-dist-plugin`. With no release
there is nothing to fetch, and there is no error to tell you so.

```bash
cd ../statamic-lead-magnets && npm install && npm run build
```

The same happens for a tag published without the release workflow succeeding.

## The confirmation link returns 404

Four causes, and they are indistinguishable from outside on purpose:

| Cause | How to check |
| --- | --- |
| Already confirmed | `token_hash` is null and `confirmed_at` is set. This is the common one |
| The grant was revoked | `revoke()` clears the token too |
| The sweep cleared it | An expired grant loses its token |
| Genuinely unknown, or another brand's token | Nothing in `lead_magnet_grants` matches the hash |

A second click on a working link is the first row. The token is consumed on activation, so by the
time the second request arrives it resolves to nothing.

An **expired but unconfirmed** grant does not 404 here. It renders the page with
`data-state="lapsed"` and stays pending.

## The confirmation page says the window lapsed

`requests.confirmation_ttl_hours` (default 72) had passed. The grant stays `pending`, no event
fires and nothing was delivered.

The visitor asks again and gets a fresh token. There is no way to revive the old one.

## A confirmation activated but no file arrived

Look at `grants.meta`:

```json
{ "last_hold": "delivery_suppressed", "last_hold_at": "…" }
```

That means [Suppression](/suppression/) refused the address. The grant is active and the send was
held, which is the correct outcome: activation is a state change, delivery is a send.

If `meta` has no hold, the mail was handed to the mailer. Check the mail log and the queue.

## The download link returns 403

Two layers answer 403, and they mean different things.

**Laravel's `signed` middleware**, before this package runs: the link expired, the grant id was
edited, the expiry was pushed out, the signature was edited, or the URL was never signed.

**The controller**, after the signature verified: the grant is not redeemable.

```php
isRedeemable() === isActive() && ! hasLapsed() && ! downloadsExhausted()
```

So a **revoked** grant holds links that verify perfectly and still refuse. That is the intended
behaviour: the signature proves the link was issued, not that the access still stands.

Check, in order: `state`, `expires_at`, and `download_count` against the resource's
`max_downloads`.

## The download link expired much sooner than `link_ttl`

A signed link is capped by the grant's own `expires_at`. A seven-day link on a grant that expires
tomorrow is a one-day link.

That cap is deliberate: a link may never outlive the access it belongs to.

## The download link returns 404

| Cause | Which one |
| --- | --- |
| The resource row is gone | The grant outlived its resource |
| A link resource with an empty `link_url` | Nothing to redirect to |
| A file resource whose `file_path` is empty | Nothing configured |
| The file is not on the disk | Check `file_disk`, then `delivery.disk`, then `filesystems.default` |

The resource is loaded by key rather than through the relation, so a deleted resource answers 404
rather than dereferencing null.

## Requesting three times leaves one grant, and I expected three

Correct. The unique index is `(brand_id, resource_id, email)`, so one address gets one grant per
resource per brand. A repeat extends the lifetime rather than creating a row.

A repeat against an **already active** grant re-delivers without a second confirmation, which is
what somebody who lost the mail needs.

## A repeated request returned the state `revoked`

A revoked grant stays revoked. Asking again does not reopen it, and the visitor sees that string.

Reinstating is a Control Panel action, deliberately: a visitor must not be able to undo an
editor's decision by resubmitting a form.

## Two brands cannot use the same resource handle

Also correct, and it is the trade that makes the public request endpoint work. That endpoint is
opened with no session, so the handle is the only thing the visitor carries and the brand is
derived from it. A handle that addressed two resources would make that derivation ambiguous, and
Brand Context throws rather than guessing.

The database enforces it, so the second brand gets a query exception.

## The Control Panel says a grant is active but the download refuses

The sweep has not run. `hasLapsed()` reads `expires_at` directly, so **access is already refused**;
the `state` column is what is stale.

```bash
php artisan lead-magnets:sweep
```

Check that a scheduler is running. Nothing breaks without it, but the Control Panel stops telling
the truth about which grants are live.

## The honeypot is catching real people

A password manager filled it. Hide the field with CSS rather than `type="hidden"`, and add
`tabindex="-1"` and `autocomplete="off"`.

A caught submission is silent by design: the visitor gets a believable success and no grant is
created, so this failure is invisible unless you go looking.

## Changing `requests.throttle` had no effect

The string is read from config once, when the route file runs, and baked into the route
definition. A cached route table freezes it further.

```bash
php artisan route:clear
```

## A bridge does nothing

Three conditions, all required: the sibling's marker class exists, the `integrations.*` switch is
not `false`, and the methods the bridge probes exist on the object behind the facade.

The third is the one that fails silently. Probe `getFacadeRoot()`, never
`method_exists()` on the facade class, which is always `false` for a forwarded method.

Bridge failures are logged at warning level with a `[lead-magnets]` prefix and swallowed, because
delivering the resource is the promise and tagging a contact is a courtesy.

## Nothing is ever suppressed

[Suppression](/suppression/) is not installed. The gate fails **open** when the addon is absent,
because there is nothing to ask, and this package will mail an address that has been bouncing for
a month.

It fails **closed** when the addon is present and throws.

## The mailing-list subscription did not happen

Three conditions: [Marketing](/marketing/) is installed, the resource names a `marketing_list`, and
a list with that handle exists. A named list that does not exist is silently skipped.

Note also that the subscription runs on **activation**, not on request.

## An editor-authored template sent the Blade version instead

The bridge falls back for an empty slug, a missing template and a template whose **body** is empty.
A template that exists but has nothing in it is the third case, and falling back is the intended
outcome rather than sending an empty mail.
