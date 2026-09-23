# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=statamic-funnels-config
```

All keys live in `config/statamic-funnels.php`. Most of them can also be set per brand on the
Funnels tab of the suite's settings screen
([Brand Context → Addon settings](/brand-context/settings)). Not there: `route_prefix`, which
changes every URL on the site and is read while routes are registered,
`integrations.entitlements`, and the `tracking.meta.*` keys.

| Key | Default | What happens when it is wrong |
| --- | --- | --- |
| `route_prefix` | `'f'` | Every funnel URL changes with it, including ones already printed on a flyer. |
| `styles` | `true` | Off for a site with its own design. The markup keeps its class names either way. |
| `coupons` | `true` | Off leaves the code field off every offer page, and a posted code is ignored. |
| `template_prefix` | `''` | A folder name confines what a step may name as its own template. |
| `integrations.leadhub` | `false` | On, a captured address goes to LeadHub as a contact. |
| `integrations.entitlements` | `false` | Off because the payment addon offers the same bridge. |
| `in_app_browser.enabled` | `true` | Off, no funnel shows the [in-app browser notice](/funnels/embedding#the-in-app-browser-notice), whatever the funnel says. |
| `embed.link_minutes` | `180` | How long a signed walk in an [embedded](/funnels/embedding) page's links stays good, the way back from the payment included. |
| `tracking.consent_service` | `'meta_pixel'` | The Consent service that releases [tracking code](/funnels/tracking) when a slot names none. A service the consent config does not have keeps everything blocked. |
| `tracking.without_consent_addon` | `'block'` | Without Consent installed: `block` prints no tracking code, `render` prints it as it is. |
| `tracking.meta.access_token` | env `FUNNELS_META_CAPI_TOKEN` | Empty means no server-side events. The pixel still works. |
| `tracking.meta.test_event_code` | env `FUNNELS_META_TEST_EVENT_CODE` | Sends to the Events Manager's test view. Remove after testing. |
| `tracking.meta.api_version` | `'v21.0'` | The Graph API version in the URL. |

## `route_prefix`

```php
'route_prefix' => 'f',
```

A funnel called `fruehlingskurs` is then at `/f/fruehlingskurs`, and its steps at
`/f/fruehlingskurs/{slug}`.

Short on purpose: these URLs are read out loud, printed on a flyer and typed by hand more
often than any other page on the site.

::: danger Changing it breaks every link already sent out
The prefix is part of every funnel URL, and the second half of most funnels arrives by
email. Pick it before the first funnel goes live and leave it alone.
:::

## `styles`

```php
'styles' => true,
```

Whether the shipped step template links the shipped stylesheet **and** the countdown
script. Both come from `public/vendor/statamic-funnels/`, published on install.

The stylesheet's every value is a custom property, so restyling a funnel is six variables
rather than a fight with a stylesheet:

```css
:root {
    --funnel-ink: #14181d;
    --funnel-muted: #5c6672;
    --funnel-line: #e2e6ea;
    --funnel-accent: #0e5c63;
    --funnel-surface: #ffffff;
    --funnel-radius: 0.6rem;
    --funnel-width: 34rem;
}
```

Set `styles => false` on a site with its own front end. The markup keeps its class names,
and a template of your own can read `funnel:countdown` and draw its own clock — the
deadline is enforced on the server either way. See
[Deadlines and split tests](/funnels/deadlines-and-tests).

## `coupons`

```php
'coupons' => true,
```

Whether an offer page shows a box to type a code into. On by default, because a site with
no coupons has nothing to type and loses nothing by showing the field.

Off is for sites that never discount and would rather not put the idea in anybody's head.
It is enforced on the advance route as well as in the template: with it off, a `coupon`
field posted by hand is ignored rather than looked up.

## `template_prefix`

```php
'template_prefix' => '',
```

A step can name its own Antlers template. Empty means anywhere under the views directory;
a folder name confines it:

```php
'template_prefix' => 'funnels',
```

A step naming `angebot` then renders `resources/views/funnels/angebot.antlers.html`, and
nothing outside that folder.

Worth doing on a site where the people editing funnels are not the people who write
templates. A namespaced name (`vendor::view`) is refused either way, as is anything
containing `..` or characters outside `A-Za-z0-9._/-`.

## `integrations`

```php
'integrations' => [
    'leadhub' => false,
    'entitlements' => false,
],
```

Each does nothing unless the sibling addon is installed **and** the switch is on.
Installing a funnel addon must not start writing into somebody's CRM.

**`leadhub`** — with [LeadHub](/leadhub/) installed and this on, the address from a Form
step is handed over as a contact with `source: funnel:{handle}`. A failure there never
fails the walk: the visitor is trying to get to the next page, and the address is already
saved on the walk either way. The failure is logged as a warning.

**`entitlements`** — off because
[Payments](/payments/) already offers the same bridge,
and two addons granting the same thing is worse than neither.

## Configuration this addon reads from elsewhere

| Key | Owner | Used for |
| --- | --- | --- |
| `statamic.live_preview.devices` | Statamic | The device sizes in the funnel preview. The same list the Control Panel's own Live Preview offers — a funnel preview that invented its own three widths would disagree with the entry preview one screen over. |
| `statamic-offers.handle_prefix` | Offers | The prefix under which an offer is bought, `offer:` by default. |

## Environment variables

| Variable | |
| --- | --- |
| `FUNNELS_META_CAPI_TOKEN` | The Meta Conversions API access token. A secret, so it is not a config value. |
| `FUNNELS_META_TEST_EVENT_CODE` | Routes server events to the Events Manager's test view. |

Every other switch is a config value, because it is a decision about the site rather than
about the environment it runs in.
