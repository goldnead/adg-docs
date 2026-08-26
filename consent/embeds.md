# The two-click embed gate

<AddonHeader />

```antlers
{{ consent:gate service="youtube" title="Concert recording" cover="/img/cover.jpg" }}
    <iframe src="https://www.youtube.com/embed/xyz" allowfullscreen></iframe>
{{ /consent:gate }}
```

Until the visitor presses the button, that iframe is **not in the document**. It sits inside
a `<template>`, which browsers parse but issue no requests for. Nothing reaches YouTube.

## Absent, not hidden

This is the distinction the tag exists for.

Rendering the iframe and hiding it with `display: none` looks identical to a visitor and to
a screenshot. It is also exactly the violation: the browser has already contacted the third
party, sent the IP address and the referrer, and in most cases received a cookie. The consent
question was asked after the data was transferred.

A `<template>` element is parsed into an inert document fragment. Its contents are not
rendered, not executed, and **not fetched**. That is a browser guarantee, not a trick.

It is also measurable, and it is worth measuring on your own site: open the page with the
network tab filtered to the provider's domain. Zero requests before the click, and the
embed's own requests after it.

## What the tag renders

A wrapper carrying `data-consent-gate="<handle>"`, holding two things:

- `<template data-consent-embed>` — your markup, inert
- `.csnt-gate__placeholder` — the visible block: an optional cover image, a title, a
  message, an optional link to the provider's privacy policy, an **allow** button and a
  **settings** button

| Parameter | Required | Means |
| --- | --- | --- |
| `service` | yes | The service handle |
| `title` | no | Heading on the placeholder. Falls back to the service's name |
| `cover` | no | An image for the placeholder, loaded lazily and with `referrerpolicy="no-referrer"` |

The message is the service's own **Text on the blocked placeholder** when it has one, and
the shipped `blocked_message` otherwise.

## Unlocking

Pressing **Load content** grants that one service — `how: gate` — and the runtime then:

1. marks the gate `data-consent-unlocked`, so it is never processed twice
2. removes the placeholder
3. clones the template's content into the document
4. removes the now-empty template

The grant is additive: only the gated service is added to whatever the visitor had already
allowed. Pressing a gate's button is not an accept-all.

Every gate on the page for that service unlocks at once, and gates for other services stay
blocked.

::: tip A gate can be opened from the dialog too
The runtime unlocks gates whenever the decision changes, so allowing YouTube in the settings
panel reveals every YouTube embed on the page without a reload.
:::

## An unknown handle stays blocked

A gate naming a service that is not configured renders a blocked placeholder saying exactly
that, rather than falling through to the embed.

A typo must not publish an unconsented embed. This is the one outcome worth being loud
about, so the failure is visible on the page instead of silent in a log.

The same is true of the whole addon: on a site with no optional services at all, where the
banner renders nothing, **a gate still blocks**. Failing open is never the safe answer. See
[When there is nothing to ask](/consent/nothing-to-ask#a-gate-still-blocks).

## A service that does not block

Setting **Block embeds (two-click)** to off — `block_content => false` — makes
`{{ consent:gate }}` render its contents directly, with no placeholder and no template.

That is the right setting for a service that has no embed to block, for example an analytics
script. It is the wrong setting for anything that loads a third party from the page, because
the tag then does nothing at all.

## Blocking a script

An embed goes in a gate. A script gets parked:

```html
<script type="text/plain" data-consent-service="analytics_pixel" src="https://…"></script>
```

`type="text/plain"` means the browser does not execute it and does not fetch its `src`. Once
the service is granted, the runtime **re-creates it as a real script element**, copying every
attribute except `type` and `data-consent-service`, and preserving inline content for scripts
without a `src`.

The node has to be re-created. Setting `.type` on the existing one does nothing — the browser
decided how to treat it at parse time.

::: warning Parked scripts run late
A re-created script executes when consent is given, not during page load. Anything depending
on `DOMContentLoaded` having not yet fired, or on ordering against other scripts, needs to
tolerate that. Listen for `consent:changed` if you need a hook.
:::

## Google Analytics, Tag Manager and friends

Park the tag as above, and — if the site uses gtag — also switch
[Google Consent Mode v2](/consent/configuration#google_consent_mode) on, so Google itself is
told what the visitor decided.

The two are different mechanisms and are not alternatives: parking stops the script from
loading, Consent Mode tells a script that *is* loaded how to behave.

## `{{ consent:granted }}` is for prose, not for third parties

```antlers
{{ consent:granted service="youtube" }}
    <p>Videos are shown directly on this page.</p>
{{ /consent:granted }}
```

This one is **server-side**: it reads the consent cookie on the request and renders its
contents or nothing.

::: danger It is wrong on a cached page
A page served from a full-page cache carries whichever answer was true for the visitor who
warmed it. Use `{{ consent:granted }}` for a note, a link or a fallback message. Use the gate
for anything that loads a third party — the gate is correct on a cached page because the
decision is made in the browser.
:::

A service in the **essential** category is always granted, so `{{ consent:granted }}` on one
of those is always true.

There is a second way this tag can be wrong, and it is worth knowing because it looked like a
missing consent for three releases: the cookie is written by JavaScript and is therefore not
encrypted, and Laravel's `EncryptCookies` middleware discards anything it cannot decrypt. The
addon registers the cookie with `EncryptCookies::except()` at boot, and the exemption follows
a renamed cookie. If you see `{{ consent:granted }}` returning false for everyone, forever,
that mechanism is where to look.

## Reviewing a site

The addon does not scan your theme. Nothing checks that every embed on the site is behind a
gate, and nothing will tell you if one is not.

A workable review, in order:

```bash
# every gate, and which service it names
grep -rn "consent:gate" resources/views/

# every parked script
grep -rn "data-consent-service" resources/views/

# candidates that are behind neither
grep -rn "<iframe" resources/views/
```

Then load the site with the network tab open and no consent given, and look at which
third-party domains are contacted anyway. That list is the answer; the greps are how you find
where each entry comes from.
