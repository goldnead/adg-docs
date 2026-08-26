# When there is nothing to ask

<AddonHeader />

If no **optional** service is configured, `{{ consent:head }}`, `{{ consent:banner }}` and
`{{ consent:settings_link }}` render **nothing at all**. No stylesheet, no script, no banner,
no link in the footer.

That is not a broken install. It is the addon doing the only defensible thing.

## Why

Strictly necessary cookies need no consent. A site that loads no third party has nothing to
put in a banner, so a banner on it would be asking a question with no content — and the
visitor cannot answer a question about nothing.

Worse, they will answer it anyway. Asking when there is nothing to ask trains people to
click the nearest button on every site they visit, which is the opposite of an informed
decision. Every banner shown without cause makes the next real one less meaningful.

The addon therefore has a single test it runs before rendering anything: **is there at least
one service that is not in the `essential` category?** If not, it renders nothing.

## When this state happens

More often than you would expect.

**On the first day of every installation.** No services ship — deliberately, since 1.3.0.
A service listed by default would appear in the banner of every fresh install, describing
data processing that site may not do. So `composer require` plus `consent:install` leaves the
site visually unchanged, and stays that way until you enter a service.

**On a site that genuinely loads no third party.** Self-hosted fonts, no analytics, no
embedded video, no map. This case is real, and the 1.3.0 changes came out of exactly such a
site being the addon's first live installation.

**When every configured service is essential.** A session cookie, a CSRF token, a language
preference. Nothing there is optional, so nothing is asked.

**When somebody emptied the list in the Control Panel.** Deleting every service is an
answer, not a missing value, and the addon does not hand back what someone removed. Until
1.3.0 it did: an emptied list fell back to the shipped one, so a client who removed the
services got them back within a page load, along with a banner asking about services their
site does not load.

## How to tell this state from a broken install

Both look like "no banner". They are distinguishable in the page source.

| | Nothing to ask | Something is wrong |
| --- | --- | --- |
| `consent.css` link in `<head>` | absent | present or 404 |
| `statamic-consent-config` JSON | absent | present |
| `consent.js` script | absent | present or 404 |
| Banner markup before `</body>` | absent | present but never revealed |

If the head is clean, the addon decided there was nothing to ask. If the assets are there and
the banner is not, look at [Troubleshooting](/consent/troubleshooting).

Then check the obvious cause first:

- **Globals → Consent → Services** — is the list empty?
- Is every entry's **Category** set to *Essential*?
- Did you add services to `config/statamic-consent.php` **after** running
  `consent:install`? The global set overrides the config file key by key, and
  `consent:install` seeds the set from the config as it was at the time. Check
  **Globals → Consent** rather than the config file — what the set holds is what renders.

## A gate still blocks

This is the important exception, and it is what makes the whole behaviour safe.

```antlers
{{ consent:gate service="youtube" }}
    <iframe src="https://www.youtube.com/embed/xyz"></iframe>
{{ /consent:gate }}
```

On a site with no configured services, that gate names a service that does not exist. It
renders a **blocked placeholder** saying so, and the iframe stays inside its `<template>`.

Failing open is never the safe answer. A misconfiguration must not publish an unconsented
embed, so the tag refuses in every direction: unknown service, empty configuration, someone
having deleted the list. The visible failure is the point — you find out by looking at the
page instead of by not being told.

## The corollary

Because nothing renders until a service exists, **adding your first optional service is what
turns the addon on**. That is also the moment to check three things at once:

1. The layout actually contains `{{ consent:head }}` and `{{ consent:banner }}`. Nobody
   noticed they were missing while nothing rendered.
2. `version` is raised if visitors already have a stored decision from an earlier set of
   services. An old yes must not cover something the visitor never saw.
3. Your privacy policy mentions the service you just added.
