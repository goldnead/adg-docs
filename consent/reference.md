# Reference

<AddonHeader />

## Antlers tags

| Tag | Parameters | Renders |
| --- | --- | --- |
| `{{ consent:head }}` | — | Stylesheet, inline configuration JSON, deferred script. Belongs in `<head>` |
| `{{ consent:banner }}` | — | The banner and the settings dialog. Belongs before `</body>` |
| `{{ consent:gate }}` | `service` (required), `title`, `cover` | Two-click gate around an embed |
| `{{ consent:granted }}` | `service` (required) | Its contents, server-side, only with consent |
| `{{ consent:settings_link }}` | `label`, `class` | A button that reopens the dialog |

Three of them — `head`, `banner`, `settings_link` — render **nothing** when no optional
service is configured. `gate` always blocks. See
[When there is nothing to ask](/consent/nothing-to-ask).

`{{ consent:granted }}` is wrong on a page served from a full-page cache. Use the gate for
anything that loads a third party.

## Route

| | |
| --- | --- |
| Method and path | `POST /!/statamic-consent/record` |
| Route name | `statamic-consent.record` |
| Middleware | `throttle:<record.rate_limit>,1` |
| CSRF | removed — four class names |
| Response | `204 No Content`, always |

Registered whatever the config says, and inert when `record.enabled` is off: a route that
appears and disappears with a setting makes `route:list` a poor description of the
application.

## Console commands

| Command | Purpose |
| --- | --- |
| `statamic:consent:install [--force]` | Publish assets and blueprint, create the global set |
| `statamic:consent:lookup [id] [--latest=20] [--csv=path]` | What did this visitor consent to |
| `statamic:consent:prune` | Delete records older than `record.keep_days` |

Available as `php please consent:install` and so on — `please` drops the `statamic:` prefix.

**Nothing is scheduled by the addon.** `prune` runs when you run it.

`install` always forces the assets, never overwrites an existing global set, and warns
rather than failing if the blueprint cannot be written.

## The consent cookie

Name from `cookie.name`, default `statamic_consent`. First-party, `SameSite` from
`cookie.same_site`, `Secure` when the request is. URL-encoded JSON:

```json
{
  "v": 1,
  "granted": ["youtube", "analytics"],
  "ts": 1756100000000,
  "how": "custom",
  "id": "94a5dd75-f45a-4775-a061-7b17bfc81224"
}
```

| Key | Means |
| --- | --- |
| `v` | The `version` it was decided against. A mismatch makes the server read no decision at all |
| `granted` | Granted handles, always including every essential one |
| `ts` | The browser's timestamp, milliseconds |
| `how` | How the decision was made |
| `id` | A random id, generated in the browser. Quoted in a dispute |

It is registered with `EncryptCookies::except()` at boot, because JavaScript writes it and
Laravel would otherwise discard it. The exemption follows a renamed cookie.

A **localStorage mirror** is kept for pages served from a cache that strips cookies. Its key
is `statamic_consent` and does not follow `cookie.name`.

## `how` values

| Value | Set by |
| --- | --- |
| `accept_all` | The banner's accept button, or `StatamicConsent.acceptAll()` |
| `necessary_only` | The banner's essential-only button |
| `reject_all` | The dialog's reject button, or `StatamicConsent.rejectAll()` |
| `custom` | Save selection in the dialog |
| `gate` | The allow button on a blocked embed |
| `gpc` | A Global Privacy Control signal, with nothing stored yet |
| `unknown` | Recorded when a cookie carries a `how` the addon does not know |

## JavaScript API

```js
StatamicConsent.granted(handle)   // boolean
StatamicConsent.open()
StatamicConsent.acceptAll()
StatamicConsent.rejectAll()
StatamicConsent.reset()
StatamicConsent.decision()        // the stored object, or null
```

| Event | Detail |
| --- | --- |
| `consent:changed` on `document` | `{ granted: string[], how: string }` |

The runtime also stamps `<html data-consent="handle handle">` with the granted handles, so
CSS can react to a decision without JavaScript of its own.

## DOM contract

| Attribute | On | Means |
| --- | --- | --- |
| `data-consent-open` | any element | Clicking it opens the dialog |
| `data-consent-close` | any element | Closes the dialog |
| `data-consent-accept-all` | any element | Accept all |
| `data-consent-necessary` | any element | Essential only |
| `data-consent-reject-all` | any element | Reject all |
| `data-consent-save` | any element | Save the dialog's selection |
| `data-consent-allow="<handle>"` | any element | Grant that one service |
| `data-consent-gate="<handle>"` | the gate wrapper | Marks a gate |
| `data-consent-embed` | a `<template>` inside a gate | The parked embed |
| `data-consent-unlocked` | the gate wrapper | Set once unlocked; never processed twice |
| `data-consent-service="<handle>"` | a parked `<script type="text/plain">` | Which service it belongs to |
| `data-consent-theme` | `<html>` | `dark` or `auto` |

## Class names

`csnt-banner`, `csnt-panel`, `csnt-gate`, `csnt-btn`, `csnt-pill`, `csnt-switch`,
`csnt-caption`, plus the gate's own `csnt-gate__placeholder`, `csnt-gate__cover`,
`csnt-gate__body`, `csnt-gate__title`, `csnt-gate__message`, `csnt-gate__policy`,
`csnt-gate__actions`, and `csnt-settings-link` on the settings button.

**The class names and the published view paths are public API. The CSS rules are not.**

## CSS custom properties

The full set, with shipped defaults, is in
[The banner](/consent/banner#every-token-with-its-shipped-default). They sit in a `@layer`,
so unlayered CSS of yours beats them in both light and dark.

## Global set

Handle `consent`, blueprint `resources/blueprints/globals/consent.yaml`, four tabs.

| Tab | Fields |
| --- | --- |
| Banner | `banner_title`, `banner_description`, `accept_all_label`, `only_necessary_label`, `settings_label`, `privacy_policy_url`, `imprint_url` |
| Dialog | `modal_title`, `modal_description`, `save_label`, `reject_all_label` |
| Services | `services` replicator: `handle`, `name`, `description`, `category`, `policy_url`, `block_content`, `block_message` |
| Categories | `categories` replicator: `handle`, `name`, `description` |

Every visitor-facing text field is localisable. `privacy_policy_url` and `imprint_url` are
`link` fields; an internal target arrives as `entry::<id>` and is resolved to a URL.

The set overrides the config file **key by key**. An empty text field falls back to the
shipped translation; an emptied **list** stays empty.

## Translation keys

`banner_title`, `banner_description`, `accept_all_label`, `only_necessary_label`,
`settings_label`, `privacy_policy_label`, `imprint_label`, `modal_title`,
`modal_description`, `save_label`, `reject_all_label`, `close_label`,
`always_active_label`, `service_policy_label`, `blocked_title`, `blocked_message`,
`blocked_button_label`, `unknown_service`, plus `categories.<handle>.name|description` and
`services.<handle>.description`.

Shipped in `en` and `de`. Publish with `--tag=statamic-consent-translations`.

## Database

Table `consent_records`, created **only while `record.enabled` is true**.

| Column | |
| --- | --- |
| `consent_id` | string(64), indexed |
| `version` | unsigned int |
| `granted` | json |
| `how` | string(32) |
| `site` | string(64), nullable |
| `decided_at` | timestamp |
| `created_at` | timestamp, defaults to now |

`unique(consent_id, decided_at)` — one row per decision.

Model: `Goldnead\StatamicConsent\Records\ConsentRecord`, with `scopeForConsentId()` (newest
first) and `scopeOlderThan()`.

## Configuration

```php
'cookie' => ['name' => 'statamic_consent', 'days' => 182, 'same_site' => 'Lax'],
'version' => 1,
'respect_gpc' => true,
'assets' => ['styles' => true, 'scripts' => true],
'record' => ['enabled' => false, 'keep_days' => 400, 'rate_limit' => 30],
'google_consent_mode' => [
    'enabled' => false,
    'signals' => [
        'analytics_storage' => [],
        'ad_storage' => [],
        'ad_user_data' => [],
        'ad_personalization' => [],
    ],
    'wait_for_update' => 500,
],
'categories' => [
    ['handle' => 'essential'],
    ['handle' => 'analytics'],
    ['handle' => 'external_media'],
    ['handle' => 'marketing'],
],
'services' => [],
```

Full commentary: [Configuration](/consent/configuration).

**Removed in 1.6.0:** `reject_on_dismiss`. It never did anything; the strict behaviour was
always hard-wired.

## Publish tags

| Tag | Publishes |
| --- | --- |
| `statamic-consent-assets` | `consent.css` and `consent.js` to `public/vendor/statamic-consent` |
| `statamic-consent-blueprint` | `resources/blueprints/globals/consent.yaml` |
| `statamic-consent-config` | `config/statamic-consent.php` |
| `statamic-consent-views` | `resources/views/vendor/statamic-consent/` |
| `statamic-consent-translations` | `lang/vendor/statamic-consent/` |
| `statamic-consent-migrations` | the `consent_records` migration |

## Requirements

<Requirements
  laravel="12.x / 13.x"
  database="Only for the optional proof-of-consent log" />

No queue, no scheduler, no Node toolchain, no build step. `statamic/cms` `^6.0` is the only
Composer dependency.

## Guarantees

| | |
| --- | --- |
| A blocked embed | Sits in a `<template>`: parsed, never requested |
| An unknown service handle | Stays blocked, and says so |
| No optional services | `head`, `banner` and `settings_link` render nothing; gates still block |
| Dismissing the banner | Stores nothing, unlocks nothing, and the banner returns |
| An emptied list in the CP | Stays empty; the config is not handed back |
| A raised `version` | Invalidates every stored decision, on the server and in the browser |
| Proof record | No IP address, no user agent, ever; one row per decision |
| The record endpoint | Reads only its own cookie; answers 204 either way |
| Telemetry | None. Nothing leaves your server |
