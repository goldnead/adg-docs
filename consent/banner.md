# The banner

<AddonHeader />

Two pieces of interface, and one rule about what closing them means.

```antlers
<head>
    {{ consent:head }}
</head>
<body>
    ...
    <footer>{{ consent:settings_link }}</footer>
    {{ consent:banner }}
</body>
```

`{{ consent:head }}` prints the stylesheet, the configuration as inline JSON, and the
deferred runtime. The payload is **inlined rather than fetched**, because a banner that
appears one request later than the page is a banner the visitor has already scrolled past.

`{{ consent:banner }}` prints the banner and the settings dialog. Both are rendered hidden
and revealed by the script; doing it the other way round makes the banner flash on every
page for visitors who decided months ago.

## The shape

The banner is a **card in the bottom-left corner**, not a bar across the page. The settings
panel sits in the opposite corner, and the banner steps aside while it is open. On a narrow
screen the panel covers the full width.

No font is loaded. The banner inherits the site's own faces.

## Three ways out, all one click

| Button | Stores |
| --- | --- |
| **Accept all** | Every optional service, `how: accept_all` |
| **Essential only** | Nothing optional, `how: necessary_only` |
| **Settings** | Opens the dialog |

The dialog adds **Save selection** (`how: custom`) and **Reject all**
(`how: reject_all`).

Every route out looks like the others. There is no visual hierarchy that makes accepting
easier than refusing, and no configuration that would create one.

## Closing without deciding is not consent

Whichever way the panel is closed — the close button, Escape, or clicking through from a
gate — an undecided visitor gets the **banner back**. Nothing is stored and nothing unlocks.

This is not configurable, and the honest history is worth knowing: until 1.6.0 a
`reject_on_dismiss` key sat in the config, was handed to the browser on every page, and was
never read. The behaviour was always the strict one. Under the GDPR no decision is not
consent, so the only value that setting could legitimately have had was the one already
hard-wired, and 1.6.0 removed the switch rather than the behaviour.

An earlier bug in the same area is fixed as of 1.1.0: closing with **Escape** used to walk
past the check and leave the visitor with neither a banner nor a decision. Every way out now
runs the same code.

## The settings link

```antlers
{{ consent:settings_link }}
{{ consent:settings_link label="Privacy settings" class="footer-link" }}
```

It renders a `<button type="button" data-consent-open>` with the given class, defaulting to
`csnt-settings-link`. Any element of your own carrying `data-consent-open` opens the dialog
too, so you are not tied to the tag.

**It belongs on every page.** A decision that cannot be revisited is not a decision that was
freely given.

Like the other two tags, it renders nothing when there is nothing to ask about.

## Global Privacy Control

With `respect_gpc` on (the default), a visitor whose browser sends the GPC signal and who
has no decision stored is recorded as having **rejected** everything optional, with `how`
set to `gpc`. The banner is not shown.

A GPC header is an objection the visitor already made. Asking again would be asking them to
repeat themselves.

## Where the wording comes from

Three layers, most specific first:

1. **The `consent` global set**, under **Globals → Consent** — the Banner and Dialog tabs
   for the fixed strings, the Services and Categories tabs for names and descriptions.
2. **The translation files**, `en` and `de`, shipped with the addon.
3. Nothing. There is no blank state; a missing value always resolves to shipped text.

A field left empty in the Control Panel therefore falls back to the shipped text **in the
visitor's language**, which a value hard-coded in the config file could never do. That is
also why the four shipped categories are seeded with a handle only.

The editable strings are: banner heading and text, the three banner buttons, the privacy
policy and imprint links, the dialog heading and text, save and reject labels, the close
label, the always-active label, and the blocked-embed heading, message and button.

To translate into a third language, publish the language files:

```bash
php please vendor:publish --tag=statamic-consent-translations
```

### Links

The **Privacy policy** and **Imprint** fields are Statamic `link` fields, so they take an
internal entry or an external URL. An internal target arrives as `entry::<id>`, which the
addon resolves to a real URL — a raw id printed into an `href` is a dead link.

## Making it yours

**The defaults are deliberately plain.** Near-black on near-white, a modest radius, ordinary
sentence-case buttons, and no font of its own. An un-themed banner should read as
*unstyled*, never as *someone else's brand*.

Until 1.5.0 it did the latter: the shipped defaults were literally one particular website's
identity — a warm yellow, a cream ground, 40px corners and pill buttons — which every
installing site got on its own pages until it overrode them. If you are upgrading from
before 1.5.0 and liked that look, it is a visual breaking change and you restore it by
setting the tokens yourself.

Start with the accent. Three properties usually get you the whole way:

```css
:root {
    --csnt-brand: #14504A;      /* the one accent: primary button, switch, focus ring */
    --csnt-brand-ink: #FBFCFA;  /* text on the accent */
    --csnt-radius-card: 0.25rem;
}
```

### Every token, with its shipped default

```css
:root {
    /* Surfaces and ink */
    --csnt-surface: #FFFFFF;                            /* card and panel */
    --csnt-surface-sunken: #F7F7F6;                     /* panel footer, blocked embed */
    --csnt-surface-muted: #F1F1F0;                      /* the secondary button */
    --csnt-surface-muted-line: #E6E6E4;
    --csnt-ink: #17171A;
    --csnt-ink-soft: #45454B;
    --csnt-muted: #71717A;                              /* body copy, captions */
    --csnt-faint: #A1A1AA;
    --csnt-line: rgba(23, 23, 26, 0.10);

    /* The accent */
    --csnt-brand: #17171A;
    --csnt-brand-hover: #34343A;
    --csnt-brand-ink: #FFFFFF;
    --csnt-brand-deep: #45454B;                         /* links, hover */

    /* Shape */
    --csnt-radius-card: 1rem;
    --csnt-radius-panel: 0.875rem;
    --csnt-radius-inner: 0.5rem;                        /* the blocked-embed placeholder */
    --csnt-radius-button: 0.5rem;
    --csnt-radius-pill: 999px;                          /* the switch and the close button */
    --csnt-shadow-card: 0 20px 44px -20px rgba(23, 23, 26, 0.18);
    --csnt-shadow-panel: 0 20px 44px -20px rgba(23, 23, 26, 0.22);
    --csnt-shadow-knob: 0 1px 2px rgba(0, 0, 0, 0.25);  /* the switch's knob */

    /* Type — all three inherit from the site by default */
    --csnt-font: inherit;
    --csnt-font-display: inherit;
    --csnt-font-ui: inherit;

    /* Button, label and heading typography */
    --csnt-btn-size: 0.8125rem;
    --csnt-btn-weight: 600;
    --csnt-btn-tracking: 0.01em;
    --csnt-btn-transform: none;
    --csnt-label-tracking: 0.08em;                      /* the small captions */
    --csnt-label-transform: uppercase;
    --csnt-title-weight: 700;
    --csnt-title-tracking: -0.01em;

    /* Mechanics */
    --csnt-z: 2147483000;
}
```

A test in the addon compares every documented token against the stylesheet, so this table
cannot drift.

### Dark mode is opt-in

Set `data-consent-theme="dark"` on `<html>` for always dark, or `"auto"` to follow the
operating system. Without it the banner stays light, because a widget that follows
`prefers-color-scheme` on its own puts a dark dialog on a light site.

::: warning Your tokens win, in both directions
The shipped token blocks sit in a `@layer`, and unlayered CSS beats every layer regardless
of specificity. So a plain `:root { --csnt-brand: … }` of yours survives dark mode instead
of being silently replaced by it — which is the bug that behaviour fixes.

The flip side is that it survives *literally*: set a dark accent, switch dark mode on, and
it stays dark on dark. Give the dark theme its own values when you use one.
:::

```css
:root { --csnt-brand: #14504A; --csnt-brand-ink: #FBFCFA; }

:root[data-consent-theme="dark"] { --csnt-brand: #7FB8AF; --csnt-brand-ink: #0C1F1C; }

@media (prefers-color-scheme: dark) {
    :root[data-consent-theme="auto"] { --csnt-brand: #7FB8AF; --csnt-brand-ink: #0C1F1C; }
}
```

The component rules are deliberately **not** layered. Those are the widget's mechanics, not
its look.

### Replacing the stylesheet entirely

```php
'assets' => ['styles' => false],
```

Then write your own CSS against the class names: `csnt-banner`, `csnt-panel`, `csnt-gate`,
`csnt-btn`, `csnt-pill`, `csnt-switch`, `csnt-caption`.

**The class names and the published view paths (`resources/views/vendor/statamic-consent/`)
are public API. The CSS rules are not.** Theme with the tokens where you can; override
selectors only when you have taken over the stylesheet completely.

## The JavaScript API

```js
StatamicConsent.granted('youtube')   // boolean
StatamicConsent.open()               // open the dialog
StatamicConsent.acceptAll()
StatamicConsent.rejectAll()
StatamicConsent.reset()              // forget the decision, show the banner again
StatamicConsent.decision()           // the stored object, or null

document.addEventListener('consent:changed', e => {
    e.detail.granted   // array of handles
    e.detail.how       // accept_all | necessary_only | reject_all | custom | gate | gpc
})
```

`reset()` is the one to reach for while testing: it clears the cookie and the localStorage
mirror and brings the banner back, without waiting for an expiry.
