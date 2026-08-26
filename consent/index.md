# Consent

<AddonHeader />

A cookie banner and a two-click embed gate for Statamic 6, with the wording editable in the
Control Panel.

Built for sites where the same person maintains the site and answers for it: the wording
lives in a global set the client can edit, the service handles live in the config file the
developer controls, and neither can break the other.

## What you get

- **A cookie banner and a settings dialog**, in the visitor's language, with every text
  field editable under **Globals → Consent**.
- **A two-click gate** around any embed. The embed sits in a `<template>`, so **no request
  reaches the third party** until the visitor presses the button.
- **Parked scripts** — `<script type="text/plain" data-consent-service="…">` becomes a real
  script element once the service is allowed.
- **Global Privacy Control** honoured: a visitor sending the signal is recorded as having
  rejected, and is not asked again.
- **Google Consent Mode v2**, off by default, with the `consent default` call written
  inline and first.
- **Proof of consent**, off by default: a server-side record of every decision, with no IP
  address and no user agent.
- **English and German** out of the box, with a per-field fallback to the shipped text.

## Antlers, no build step

There is no Vue, no Inertia page and no compiled Control Panel bundle in this addon. The
banner and the gate are Antlers views, the runtime is one plain `consent.js`, and the
Control Panel surface is a Statamic global set with an ordinary blueprint.

That is a deliberate difference from most consent tooling, and it has three consequences
worth knowing before you choose it:

- **Nothing to rebuild.** No Node toolchain, no committed bundle that can go stale against
  its sources — the failure mode where a screen silently runs last release's code cannot
  happen here.
- **The views are yours.** Publish them and edit them; the class names and the published
  view paths are public API.
- **No Control Panel listing** for the proof log. Looking a record up is a console command,
  which is the right trade for something that happens when a lawyer writes. See
  [Proof of consent](/consent/proof#why-there-is-no-screen).

The addon is also not itself a third party. There is no telemetry and no phone-home;
nothing leaves your server.

## When there is nothing to ask, it does not ask

**No services ship.** On a fresh install, `{{ consent:head }}`, `{{ consent:banner }}` and
`{{ consent:settings_link }}` render *nothing at all* — no stylesheet, no script, no banner.
The site is exactly as it was.

Strictly necessary cookies need no consent, so a site that loads no third party has nothing
to put in a banner. Asking anyway trains people to click the nearest button, which is the
opposite of an informed decision.

A `{{ consent:gate }}` still blocks in that state. Failing open is never the safe answer.

Read [When there is nothing to ask](/consent/nothing-to-ask) before you conclude the addon
is broken — this is the single most common "it does nothing" report.

## The shortest useful path

```bash
composer require goldnead/statamic-consent
php please consent:install
```

Then, in your layout:

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

And add the services this site actually loads, under **Globals → Consent**. Until you do,
nothing renders.

## Concepts in one table

| Term | Means |
| --- | --- |
| **Service** | One third party that sets a cookie or receives data. Has a `handle` |
| **Handle** | What `{{ consent:gate }}` and `{{ consent:granted }}` refer to. Part of your templates |
| **Category** | The grouping in the dialog: essential, analytics, external media, marketing |
| **Essential** | A category that can never be switched off. Services in it are always granted |
| **Gate** | A two-click block around an embed |
| **Version** | An integer. Raising it invalidates every stored decision |
| **Record** | The optional server-side proof of a decision |

## What it deliberately does not do

- **It does not discover what your site loads.** Every third party is entered by hand, and
  an embed is only blocked where you put a gate around it. The addon does not scan your
  theme to check that you did.
- **It is not a legal opinion.**
- **No IAB TCF**, no programmatic advertising framework.
- **No hosted dashboard** across many sites.
- **No dark patterns.** Every route out of the banner is one click and looks like the
  others, and closing the banner without deciding stores nothing.

## Next

- [Installation](/consent/installation)
- [Configuration](/consent/configuration)
- [The banner](/consent/banner)
- [The two-click embed gate](/consent/embeds)
- [When there is nothing to ask](/consent/nothing-to-ask)
- [Proof of consent](/consent/proof)
- [Reference](/consent/reference)
- [Troubleshooting](/consent/troubleshooting)

Related: [Privacy & retention](/guide/privacy) covers the suite's other consent concern —
who may be emailed — which is a different question with a different owner.
