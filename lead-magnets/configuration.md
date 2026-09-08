# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=lead-magnets-config
```

Five groups. **No key reads an environment variable**: there is not a single `env()` call in the
config file. Every value is a literal, and three of them can be overridden per resource in the
Control Panel.

```php
// config/lead-magnets.php

return [
    'routes' => [...],
    'delivery' => [...],
    'requests' => [...],
    'mail' => [...],
    'integrations' => [...],
];
```

## `routes`

```php
'routes' => [
    'prefix' => '!/lead-magnets',
],
```

The prefix the request, confirmation and download routes are mounted under. `!` is the Statamic
convention for a route that is not a page.

Changing it invalidates confirmation links already in flight and download links already in
mailboxes. The download links are signed against the full URL, so a moved prefix does not merely
404 them, it makes them unverifiable.

## `delivery`

```php
'delivery' => [
    'link_ttl' => 60 * 24 * 7,
    'max_downloads' => null,
    'grant_ttl_days' => null,
    'disk' => null,
],
```

| Key | Meaning | Per-resource override |
| --- | --- | --- |
| `link_ttl` | How long a signed download link stays valid, in minutes. Default seven days | `link_ttl` |
| `max_downloads` | How often one grant may be redeemed. `null` means no cap | `max_downloads` |
| `grant_ttl_days` | Expires an unredeemed grant. `null` keeps it forever | `grant_ttl_days` |
| `disk` | The filesystem disk files are read from. `null` falls back to `filesystems.default` | `file_disk` |

A resource may shorten or lengthen its own link lifetime; the config value is the fallback. The
floor is one minute, whatever is configured.

**`max_downloads => null` means the signature expiry is the only limit.** That is a real choice
rather than a default nobody thought about: a seven-day link with no cap can be forwarded, and the
audit trail is what makes that visible afterwards rather than what prevents it. Set a cap on
anything you would mind seeing on a forum.

`grant_ttl_days` is the **access** lifetime, applied from the moment of confirmation, and it
lands on the entitlement. It is not the confirmation window; that is
`requests.confirmation_ttl_hours`, and it lands on the grant row. Two deadlines, two rows. See
[Grant state](/lead-magnets/grant-state#two-deadlines-on-two-rows).

::: warning A signed link can never outlive the grant it belongs to
`DownloadLink::for()` caps the signature expiry at `Grant::accessEndsAt()` whenever the latter
is earlier. A seven-day link on access that ends tomorrow is a one-day link.
:::

## `requests`

```php
'requests' => [
    'honeypot' => 'website',
    'confirmation_ttl_hours' => 72,
    'throttle' => '10,1',
],
```

`honeypot` names a form field that a human never fills and a bot always does. A filled honeypot
gets a believable success and nothing else: no grant, no mail, no event. Rename it to anything
your form uses.

`confirmation_ttl_hours` is how long an unconfirmed request may be confirmed for. After that the
token is dead and the visitor asks again. Set it to `0` and the confirmation window is unbounded.

`throttle` is Laravel's rate-limiter string, applied to the request route: ten attempts per
minute per client.

::: danger The throttle is baked in at route registration
The string is read from config **once**, when the route file runs. Changing
`requests.throttle` at runtime does not move the limit, and a cached route table freezes it
harder still. Run `php artisan route:clear` after changing it.
:::

None of these three is overridable per resource, although the README's config table says
otherwise. Only `link_ttl`, `max_downloads` and `grant_ttl_days` have per-resource columns.

## `mail`

```php
'mail' => [
    'confirmation_template' => 'lead-magnet-confirmation',
    'delivery_template' => 'lead-magnet-delivery',
],
```

Slugs handed to [Email Templates](/email-templates/) when it is installed. Without that addon the
Blade views in `resources/views/mail` are used, and they are publishable, so a site never depends
on the sibling to change the wording.

The fallback is not only for an absent addon. An empty slug, a missing template and a template
with an empty body all fall back to the Blade view rather than sending an empty mail.

## `integrations`

```php
'integrations' => [
    'leadhub' => true,
    'marketing' => true,
    'email_templates' => true,
    'suppression' => true,
    'activity' => true,
],
```

Every bridge is off the moment its addon is absent. These switches exist to turn one **off while
it is present**: an installed addon that should not be written to.

Nothing here turns a bridge on where the classes are missing, because there would be nothing to
call. See [Bridges](/lead-magnets/bridges).

## Per-resource settings

Set in the Control Panel, not in config:

| Field | Effect |
| --- | --- |
| `requires_confirmation` | `false` activates the grant immediately and skips the confirmation mail |
| `published` | An unpublished resource 404s on the public request endpoint |
| `delivery_type` | `file` or `link` |
| `file_path`, `file_disk` | For a file resource. The path never leaves the server |
| `link_url` | For a link resource. Redirected to, after the download is counted and audited |
| `link_ttl`, `max_downloads`, `grant_ttl_days` | Override the three config defaults |
| `tags` | Written onto the contact by the LeadHub bridge when a grant activates |
| `marketing_list` | The list the Marketing bridge subscribes the confirmed address to |

**`handle` is globally unique, not unique per brand.** The public request endpoint is opened with
no session, so no brand is current, and the handle is the only thing the visitor carries. The
brand is derived from it, and that derivation is safe exactly as long as a handle addresses one
resource across all brands.

The cost is real and deliberate: two brands cannot both call a resource `warmup-routine`.
Marketing made the same trade for list handles, for the same reason.
