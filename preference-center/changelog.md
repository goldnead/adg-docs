---
title: Preference Center changelog
editLink: false
---

# Changelog

<AddonHeader slug="preference-center" />

Release notes for `goldnead/statamic-preference-center`, as published with the package.

Cross-version upgrade notes for the whole suite are in
[Upgrading](/guide/upgrading). The 1.3.0 cutover has its own page:
[Migrating from Marketing](/preference-center/migrating-from-marketing).

## 1.3.0 — 2026-08-01

### The preference page is now owned here, and Marketing asks for it

Two packages were serving near-identical preference pages. That is decided: this one owns the
page, `goldnead/statamic-marketing` keeps only a one-click unsubscribe path that works whether
or not this package is installed, and it routes every preference link through a resolver that
prefers this page.

**New — a discovery interface, semver-bound from this release.**
`PreferenceCenter::urlForToken(string $token): ?string` and
`PreferenceCenter::requestUrl(): ?string`, plus the route-name constants `ROUTE_TOKEN`,
`ROUTE_SHOW` and `ROUTE_REQUEST`. `null` means "this package cannot serve that link here, use
your own path", returned when the routes are not mounted, when Marketing is absent or switched
off, or when the token is empty.

Pinned by `tests/Feature/DiscoveryContractTest.php`, including the negative case that matters
most: a sibling must probe `class_exists()` on the class, never `method_exists()` on the
facade, which answers `false` through `__callStatic` and took every LeadHub action node down
in `goldnead/statamic-automations` v1.0.3.

**New — an upgrade guide**, with the cutover for a host that had Marketing first: what happens
to the links already sitting in people's inboxes, and the route-cache clear that is not
optional here.

### Requirements

- **`statamic/cms` moved from `suggest` to `require` (`^6.0`).** It was never optional: this
  package hard requires `goldnead/statamic-brand-context`, which hard requires
  `statamic/cms ^6.0`. There has never been an installation without Statamic in it.
  `"type": "statamic-addon"` was the honest half of that pair; the missing constraint was the
  dishonest one, and the Marketplace listing had no compatibility metadata as a result.
- **`laravel/framework` narrowed to `^12.40|^13.0`.** `^11.0` was unsatisfiable in practice,
  since Statamic 6 requires `^12.40 || ^13.0`, and the whole Laravel 11 line is withdrawn over
  security advisories. Nobody can have been running this on Laravel 11.
- **`orchestra/testbench` narrowed to `^10.0|^11.0` and `pestphp/pest` to `^3.0|^4.0`**, for
  the same reason. Dev-only, so no consumer is affected.

### Also

- `extra.statamic` now carries `slug`, `url`, `developer` and `developer-url`, so the manifest
  slug is no longer `null` and the Control Panel addon card has a developer link.
- Pint, Larastan at level 5 with a baseline, and a `.gitattributes` that keeps tests and CI out
  of the installed package.
- CI grew the axes the constraints were always claiming: PHP × Laravel ×
  `prefer-lowest|prefer-stable`, a MySQL leg, Pint, PHPStan and addon-lint.
- `composer.lock` is no longer tracked. A library's lock constrains nothing for consumers and
  published the full private dependency graph.
- `SECURITY.md`, a requirements section and a support policy.

## 1.2.0 — 2026-07-31

One finding from a real end-to-end run on staging: a magic link requested there, mailed by
Brevo, read in a real mailbox, and the button clicked the way a recipient clicks it. **HTTP
403.** Not a defect in the signature and not a defect in the mail, but a defect in the delivery
chain, which is the one place the suite could not reach.

### Fixed — a click counter appended one parameter and the link stopped working

```
302  https://…sendibt3.com/tr/cl/…                          Brevo's click counter
403  https://staging.example.com/!/preference-center/link/…
     ?_se=…&expires=…&signature=…
```

Brevo rewrites every `href` in the HTML part onto its own counter, and when the counter
forwards the reader it appends `_se`, the recipient address in base64, **in front of**
`expires` and `signature`. Laravel signs the whole query string. One extra parameter changes
what is verified and `ValidateSignature` answers 403 before this package sees the request. The
plain-text link in the same message, which Brevo leaves alone, worked throughout. This is not
specific to this addon: a provider that counts clicks breaks every signed Laravel URL it is
asked to deliver.

Nothing local could have found it. A mail sink stores what it was handed; that is what makes
it a sink. Mailpit does not rewrite `href`s, `Mail::fake()` does not build a MIME message at
all, and neither owns a click counter. The gap was in the last hop, and the only instrument
that reaches it is a send.

**Two answers, and a host wants both.**

*Stop the rewriting.* `delivery.mail_headers` is a map of headers added verbatim to the
outgoing message, so the package presumes no provider and a host names its own. Empty by
default: an addon that guessed the provider and changed how it behaves would be the worse
neighbour.

**Brevo has no such header, and that was checked rather than assumed.** `X-Mailin-custom`,
`X-Sib-Sandbox` and `X-SIB-API` are the documented ones and none of them touches tracking; the
transactional API has no tracking option in its body either. The account-level setting Brevo
offers anonymises the tracking, it does not stop the rewriting. So on Brevo the second answer
is not defence in depth. It is the only thing that works.

*Survive the rewriting.* `delivery.ignored_query_parameters` names the parameters left out of
the signature check. Ignoring is giving away, so what is given away is stated rather than
glossed: the payload is in the path rather than the query, and `expires` stays signed and
cannot be unsigned by editing a config file. `gclid` and `fbclid` are deliberately absent — an
ad network is not on the path from a mail to this route, and a list that grows by association
is how one ends up ignoring the wrong thing.

### Notes

- Suite: **93 passed, 372 assertions** (80/329 before).
- Two new config keys under `delivery`. No migration, no other behaviour change.
- `goldnead/statamic-marketing` is affected the same way and was not changed here.
  `marketing.confirm` and `marketing.unsubscribe` carry an unguessable token in the path with
  no signature and survive an appended parameter untouched. `marketing.track.click` is built
  exactly like this route and fails exactly like it did.

## 1.1.0 — 2026-07-31

Seven findings from an independent acceptance of 1.0.0, written by an agent that did not build
it. Two were blocking and the verdict was "not yet, for a production site".

### Fixed — the link request mailed nothing to anybody, on any brand

**What would have been possible: nothing.** That is the defect. The magic link is the only door
for somebody with no account and no old mail, and on a multi-brand host it was shut for every
address, in every brand, for the whole life of 1.0.0.

Nothing on the form established a brand and no middleware set one for that route, so the scope
failed closed and the lookup answered false for every address ever typed into it. Measured with
the same address in the same second: **0 mails without `?pcBrand=`, 1 with it**.

The property that makes this endpoint safe is what hid it. One sentence for every outcome is
deliberate, and it is also indistinguishable from a total outage. A silence designed to reveal
nothing revealed nothing about itself either.

The address answers the brand question now: the lookup runs in every brand, and the mail
carries one link per brand that has heard of this address. `pcBrand` still narrows the search
and still cannot widen it.

### Fixed — a session id handed over before the click still opened the page

**What would have been possible:** read and change a stranger's preferences. Anybody who could
plant a session id in somebody else's browser kept access for the sixty minutes of the note as
soon as that person followed a magic link.

`SessionAccess::open()` now regenerates the id first and destroys the old record, the same move
`Auth::login()` makes and for the same reason: from the click onwards the session id *is* the
credential. Measured against v1.0.0: the cookie captured before the click, replayed from a
separate browser context, answered **200 with the other person's address**. Afterwards it
answers 404.

### Fixed — the magic-link note outlived a login

The note outranks an authenticated session on purpose, and that order is right for the person
who just clicked and wrong for the next person at the same machine. A login now ends it.

`Login`, not `Authenticated`: the second fires on every request that resolves a user, and
listening to it would quietly reverse the ordering this package chose.

### Fixed — the cadence overwrote, in silence, a box somebody had just cleared

A submission carrying `frequency=immediate` and one cleared checkbox ended with that checkbox
back on, with no refusal and no notice. The matrix now writes the cells whose posted value
differs from the value the page rendered, which is exactly the set of boxes somebody clicked.

### Fixed — the mail had no HTML part

Single-part `text/plain`, with a three-hundred-character signed URL as running text. Both parts
are sent now. They escape the URL in opposite directions and both are right: the plain-text
body must not escape the `&` before `signature`, and the HTML body must, because an attribute
value is an HTML context.

### Fixed — the address limiter counted brand keys, not mailboxes

The per-address key was `hash(brand_id|address)`, which gave every brand its own budget of
three an hour: **3×N mails into one inbox** on a host with N brands. The key is now the address
and nothing else. A limit that protects a key instead of a person protects nobody.

### Fixed — saving without changing anything answered with a wall of refusals

A browser omits a `disabled` checkbox from the submission entirely, so a locked-on cell arrived
looking exactly like a cell somebody had just switched off. Locked-on cells now carry a hidden
field with the state the page displayed. It is not a way in: the writer re-reads every lock
from the source, and a POST that drops those fields is refused exactly as before.

### Notes

- Suite: **80 passed, 329 assertions** (63/229 before).
- `MagicLinkMail` now takes a list of links rather than one URL string, and
  `MagicLinkRequests::request()` takes `?int $brandId`. Both are internal to the request path.
  `$mail->url()` replaces `$mail->url`.

## 1.0.0 — 2026-07-31

### Added — one page over three packages, and none of them required

The mailing lists from Marketing, the type × channel matrix and the digest cadence from
Notifications, and the block state from Suppression, on one page. Nothing here is a new
setting: every value is read from and written back to the package that owns it, and this
package ships **no migration at all**.

All three sources are `suggest`. Presence is decided by asking the class map, never a composer
manifest. A block whose package is absent is omitted from the page *and* refused by the write
path, independently.

One detail that would have been silent rather than loud: the marker for suppression is its
`Gate` **interface**, and `class_exists()` answers false for an interface. Getting that wrong
does not throw — it decides the package is absent and renders a page that reports nothing as
blocked, which is the one failure mode this family cannot have.

### Added — three doors, one identity, and the rule that keeps the sender agreeing with the page

A token from a marketing mail, a signed link on request, and an authenticated session all end
at one `Identity`. The brand comes from the door in every case.

`notification_preferences` is matched on `user_id` **and** `contact_uuid`, never OR, so the
session door hands over exactly what the identity resolver produced, unimproved. Where no
identity can be established nothing is written: both keys NULL is not a duplicate the database
rejects, it is *one* row shared by every unplaceable visitor.

### Added — the three limits, each enforced twice

Required types stay unswitchable, a block is not lifted by any door, and every change is
recorded with the proof that authorised it.

The first cannot live in the preference layer: `PreferenceResolver::allows()` returns `true` for
a required type on every channel before it reads anything stored. So the lock is computed in the
view and checked again in the writer against state read fresh. `disabled` is an instruction the
browser gives itself, and a POST is what the server receives.

This page has three doors, so it announces its own `PreferencesChanged`, writes a structured log
line, and adds a LeadHub timeline entry with the identity pseudonymised. Nothing is recorded
when nothing changed.

### Added — a magic link that is not an enumeration oracle or a mail amplifier

Signed and expiring, with the address encrypted inside the URL rather than merely signed. Sent,
no such person, blocked and throttled all return the same page byte for byte, and the response
is held open to a configurable floor. Two limiters, by address and by origin, because one
without the other is not a limit.

No token table, and that is a decision. It costs single use and revocation; it buys not owning a
fourth data model with its own migration, index and pruning job.

### Added — four cadences over storage that holds two of the words

`immediate` and `never` are stored as the channel state they describe, so all four are distinct
in storage and every one reads back as itself. The matrix can also hold a state that is none of
the four, and defaults alone produce it: the control then selects nothing and says the state is
mixed.

### Added — cross-brand, and the half of it that is not about visibility

A hard bounce is scoped global and closes the address in every brand; a complaint is scoped per
brand and stays inside the one it was made in. The same address, the same submission, two
different answers depending on which brand's token opened the page.

### Fixed — the link in the mail was a 403 before anyone could click it

The plain-text mail rendered `{{ $url }}`, so Blade escaped the `&` between `expires` and
`signature` into `&amp;`. The link looks perfect to a reader and Laravel rejects it as unsigned.

The regression test does not assert that the body contains a URL. It extracts the URL from the
rendered body and follows it, because "contains a URL" was true the whole time it was broken.

### Notes

- Suite: **63 passed, 229 assertions**.
- Route parameters are `pcToken` and `pcLink`. A `Route::bind()` is application-wide, and
  `{token}`/`{link}` are exactly what a sibling in this family would reach for.
- No migrations, so no index width to compute and no nullable unique to get wrong.
