# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=statamic-funnels-config
```

Six keys, all of them in `config/statamic-funnels.php`. There is no settings screen: none
of these is a thing an editor changes, and two of them change every URL on the site.

| Key | Default | What happens when it is wrong |
| --- | --- | --- |
| `route_prefix` | `'f'` | Every funnel URL changes with it, including ones already printed on a flyer. |
| `styles` | `true` | Off for a site with its own design. The markup keeps its class names either way. |
| `coupons` | `true` | Off leaves the code field off every offer page, and a posted code is ignored. |
| `template_prefix` | `''` | A folder name confines what a step may name as its own template. |
| `integrations.leadhub` | `false` | On, a captured address goes to LeadHub as a contact. |
| `integrations.entitlements` | `false` | Off because the payment addon offers the same bridge. |

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

None. Every switch above is a config value, because every one of them is a decision about
the site rather than about the environment it runs in.
