# Configuration

<AddonHeader />

```bash
php please vendor:publish --tag=statamic-consent-config
```

Two places hold settings, and the split is the point of the addon:

| | Owns | Edited by |
| --- | --- | --- |
| `config/statamic-consent.php` | Handles, cookie, behaviour, Google mapping | the developer, in the repository |
| **Globals → Consent** | The wording, and the service and category lists | the client, in the Control Panel |

The global set **overrides the config key by key**. That order is deliberate: the config
file is the developer's contract — handles that templates refer to — and the global set is
the client's wording.

Two rules follow, and both exist because the naive version broke a real site:

- **A text field left empty falls back to the shipped text** in the visitor's language,
  not to blank.
- **A list emptied in the Control Panel stays empty.** Deleting every service is an answer,
  not a missing value. Falling back to the config here would hand a client back the services
  they had just removed, along with a banner asking about services their site does not load.

## `cookie`

```php
'cookie' => [
    'name' => 'statamic_consent',
    'days' => 182,
    'same_site' => 'Lax',
],
```

| Key | Default | What happens when it is wrong |
| --- | --- | --- |
| `name` | `statamic_consent` | Renaming it after launch discards every stored decision; every visitor is asked again |
| `days` | `182` | Longer than 12 months is not defensible under the GDPR |
| `same_site` | `Lax` | `None` without `Secure` makes browsers drop the cookie entirely |

The cookie is written by JavaScript and is therefore **not encrypted**, so the addon
registers it with `EncryptCookies::except()` at boot. Without that Laravel discards it and
the server sees no cookie at all — a failure that looks exactly like "nobody has consented
yet". The exemption follows a renamed cookie.

`SameSite=Lax` is also load-bearing for the proof endpoint: it is the reason a cross-site
post arrives without the cookie, and therefore the reason that endpoint needs no CSRF token.
See [Proof of consent](/consent/proof#why-it-needs-no-token).

## `version`

```php
'version' => 1,
```

An integer that travels with every stored decision. The runtime compares it against the
cookie and **re-asks when they differ**.

**Raise it whenever you add a service that is not essential.** Leaving it lets an old yes
cover something the visitor was never shown, which is precisely the consent a stored
decision cannot legitimately carry.

The version is also the load-bearing column of the proof log: it is what proves *which* set
of services the visitor was offered, which is the part a later dispute turns on.

## `respect_gpc`

```php
'respect_gpc' => true,
```

Honours the Global Privacy Control browser signal, which German courts have read as a valid
objection. A visitor sending it, with no decision stored yet, is recorded as having rejected
everything optional — with `how` set to `gpc` — and the banner is not shown.

Asking anyway would be asking them to repeat themselves.

## `assets`

```php
'assets' => ['styles' => true, 'scripts' => true],
```

| Key | Off means |
| --- | --- |
| `styles` | No stylesheet is printed. You ship your own CSS against the documented class names |
| `scripts` | **The addon is disabled.** No payload, no runtime, nothing unlocks |

`scripts => false` is not a way to make the banner quieter. The runtime is what reads the
decision, unlocks gates and re-creates parked scripts; without it a gated embed stays
blocked forever.

## `record`

```php
'record' => [
    'enabled' => false,
    'keep_days' => 400,
    'rate_limit' => 30,
],
```

Off by default, for three reasons: a site with no optional services has nothing to prove, a
record is itself a processing activity that belongs in your privacy policy, and it needs a
database a flat installation may not have.

`rate_limit` is per minute, per IP. `keep_days` is enforced by `php please consent:prune`,
and `null` keeps everything — which the command warns about rather than quietly doing
nothing. Full detail: [Proof of consent](/consent/proof).

## `google_consent_mode`

```php
'google_consent_mode' => [
    'enabled' => false,
    'signals' => [
        'analytics_storage' => ['google_analytics'],
        'ad_storage' => ['google_ads'],
        'ad_user_data' => ['google_ads'],
        'ad_personalization' => ['google_ads'],
    ],
    'wait_for_update' => 500,
],
```

Off by default, and switch it on **only where the site actually loads gtag**. An addon that
creates a Google object on a site with no Google is the opposite of what it is for.

Each of Google's four signals maps to the service handles that must be granted for it:

- **A signal is granted only when every service mapped to it is granted.**
- **A signal with an empty list stays denied**, which is the right answer for anything you
  have not thought about yet.

`{{ consent:head }}` then writes the `consent default` call **inline and first**, before
anything else in the head, with every signal denied. Google's default has to be in place
before any Google script loads; getting the order wrong builds a feature that looks like it
runs while Google keeps measuring as though nothing was said. The runtime sends
`consent update` as soon as the visitor decides, and again on every later change.

`wait_for_update` is how long, in milliseconds, Google waits for that update before it gives
up on the page.

::: warning The default is written even for a cached page
The `consent default` call is hard-coded to deny everything rather than reading the
visitor's cookie server-side. That is deliberate: this markup sits on a page that may be
served from a full-page cache, where the server's idea of the visitor's decision belongs to
whoever warmed it. The update follows from the browser, which is the only party that knows.
:::

## `categories`

```php
'categories' => [
    ['handle' => 'essential'],
    ['handle' => 'analytics'],
    ['handle' => 'external_media'],
    ['handle' => 'marketing'],
],
```

The grouping the visitor sees in the settings dialog.

`essential` is always present and can never be switched off. **Name and description are left
out on purpose**: the shipped four are translated, so a site that adds nothing gets a dialog
in the visitor's language. Set them here or in the Control Panel to override — but a
hard-coded name in the config file can never follow the visitor's language, and a translation
can.

**A category with no services is dropped from the dialog.** An empty group reads as a bug.

## `services`

Empty on purpose. See [Installation](/consent/installation#nothing-renders-until-you-add-a-service)
for the fields, and [When there is nothing to ask](/consent/nothing-to-ask) for what an
empty list means.

```php
'services' => [
    ['handle' => 'youtube', 'name' => 'YouTube', 'category' => 'external_media',
     'policy_url' => 'https://policies.google.com/privacy', 'block_content' => true],
],
```

| Key | Means |
| --- | --- |
| `handle` | What `{{ consent:gate }}` and `{{ consent:granted }}` refer to |
| `name` | Shown in the dialog. Falls back to the handle |
| `description` | Shown in the dialog |
| `category` | Must match a configured category handle. Defaults to `essential` |
| `policy_url` | Linked from the dialog and the blocked placeholder |
| `block_content` | `true` turns `{{ consent:gate }}` into a real block for this service |
| `block_message` | Overrides the generic blocked-placeholder text |

Three things are enforced rather than trusted:

- **A service in the `essential` category is always required**, whatever any other field
  says. A required analytics service is a contradiction the dialog cannot express, so the
  category decides.
- **Duplicate handles are collapsed**; the first wins.
- **A service with an empty handle is dropped.**

::: danger Do not rename a handle after launch
The handle is what your templates name. Rename it and every `{{ consent:gate }}` referring
to the old name falls into the unknown-service state — blocked, with a message saying the
service is not configured. That is the safe failure, but it is still a broken page.
:::

## What is not configurable

**What a closed banner means.** Closing the dialog without deciding brings the banner back,
stores nothing and unlocks nothing. Under the GDPR no decision is not consent, so a setting
that let a site treat it as one would be a setting for breaking the law.

::: warning `reject_on_dismiss` was removed in 1.6.0
The key existed until then, was handed to the browser on every page, and **the script never
read it once**. The behaviour was the strict one all along. Nothing changed in effect; what
changed is the promise, because a site that set it to `false` believed it had changed
something. If you have it in a published config file, delete the line.
:::

## `config:cache`

Everything here is ordinary config, so `php artisan config:cache` is safe and expected. The
global set is not config — it is content, read per request — so editing it in the Control
Panel takes effect immediately without a cache clear.
