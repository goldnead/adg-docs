# Proof of consent

<AddonHeader />

Article 7(1) GDPR puts the burden of proof on the controller. A value in the visitor's own
browser is not proof: it belongs to them, and they can change it.

So there is an optional server-side record. It is **off by default**.

```php
// config/statamic-consent.php
'record' => [
    'enabled' => true,
    'keep_days' => 400,
    'rate_limit' => 30,
],
```

```bash
php artisan migrate
```

The migration **only loads while the record is on**, so a flat installation that never wants
one never gets a table.

## Why it is off by default

Three reasons, and each of them is a real site:

- **A site with no optional services has nothing to prove.** That is every installation on
  its first day.
- **A record is itself a processing activity.** It belongs in your privacy policy, and
  switching it on without adding it there trades one gap for another.
- **It needs a database**, which a flat Statamic installation may not have.

## What is stored

| Column | Holds |
| --- | --- |
| `consent_id` | The random id from the visitor's cookie. Indexed |
| `version` | The `version` the decision was made against |
| `granted` | The granted handles, as JSON |
| `how` | `accept_all`, `necessary_only`, `reject_all`, `custom`, `gate`, `gpc` or `unknown` |
| `site` | The Statamic site handle |
| `decided_at` | The browser's timestamp, believed but bounded |
| `created_at` | The server's |

**`version` is the load-bearing column.** It proves *which* set of services the visitor was
shown, which is the part a later dispute actually turns on. "They accepted" is worth little
without "they were offered these four things".

`unique(consent_id, decided_at)` means one row per decision. A visitor who reloads a page
does not create a second record of the same decision.

## What is deliberately not stored

**No IP address. No user agent.**

Both are personal data in their own right, and neither is needed: the `consent_id` does the
linking. Storing them turns a proof log into a visitor database — which is a processing
activity you then have to justify, minimise and delete, in order to prove you were careful
about processing activities.

There is also **no record of who the visitor is**. The id is random and is generated in the
browser. It exists to be quoted back: the visitor can read it out of their own cookie, and
you can look it up.

## Both clocks are kept

`decided_at` is the browser's own timestamp, and `created_at` is the server's, side by side.
They can differ by a lot on a device with a wrong clock, and pretending otherwise would be
inventing precision.

The browser's claim is believed but **bounded**: a timestamp more than a day in the future,
or more than five years in the past, is replaced with the server's time. A proof log with
impossible dates in it is worth less than one that admits it fell back.

## How a record is written

The browser makes a decision, writes its cookie, and **pings** the endpoint:

```
POST /!/statamic-consent/record   →   204 No Content
```

Three properties, all deliberate:

**The endpoint takes no input.** The browser sends no payload at all. The server reads the
cookie the request carried and records what *that* says. Nothing in the request can be
forged, because nothing in it is read.

**The granted handles are filtered to services this site actually offers.** A cookie is
under the visitor's control, so an unknown handle is either a stale decision or somebody
editing it. Either way it is not evidence of anything.

**It is a side effect, never a step in the visitor's way.** The fetch is `keepalive`, so a
decision made on the way out of a page still arrives, and every error is swallowed. If the
write fails, the visitor has still decided.

### Why it needs no token

CSRF protection is dropped on that route on purpose, and the reasoning is worth following
because it is the same shape as the argument for the endpoint taking no input.

A cross-site POST arrives **without the cookie**, because `SameSite=Lax` does not send one on
a cross-site request. The endpoint therefore reads nothing, writes nothing, and answers 204 —
the same answer it gives a legitimate request whose cookie it could not use. It does not tell
a stranger whether a cookie was present.

A token would have to be embedded in the page, and would be stale on any page served from a
full-page cache — which is exactly the kind of page a consent banner sits on.

::: warning Fixed in 1.4.1
Between 1.4.0 and 1.4.1 this endpoint answered **419 on every real delivery**. The route
excluded `VerifyCsrfToken`, but Laravel 12 and 13 register `PreventRequestForgery` in the
`web` group and `VerifyCsrfToken` is its *subclass* — and `Router::resolveMiddleware()`
removes only what is a subclass of the excluded class, never the parent. The check stayed on,
`fetch` carries no token, and nothing was ever recorded.

It was invisible to the test suite, because `PreventRequestForgery::handle()` returns early
under `runningUnitTests()`. **Anyone running 1.4.0 with `record.enabled` has an empty log and
should update.**
:::

## Looking one up

```bash
php please consent:lookup 94a5dd75-f45a-4775-a061-7b17bfc81224
php please consent:lookup --latest=50
php please consent:lookup --csv=proof.csv 94a5dd75-f45a-4775-a061-7b17bfc81224
```

With an id, every decision that id ever made is listed, newest first — the top row is the one
in force. Without one, `--latest` shows the most recent decisions across the site, defaulting
to 20.

`--csv` writes the same rows to a file with the columns `consent_id`, `decided_at`,
`version`, `how`, `granted`, `site`, and a BOM, because the person who asked for it will open
it in Excel.

If the record is switched off, the command says so and exits non-zero rather than reporting
an empty log — the two are very different answers to "what did this person consent to".

Under `php artisan` the commands are `statamic:consent:lookup` and `statamic:consent:prune`.

## Retention

```bash
php please consent:prune
```

Deletes records whose `decided_at` is older than `record.keep_days`, default 400 days.

With `keep_days` set to `null` it deletes nothing **and says so**. Keeping everything forever
is a choice a site can make, but it is the opposite of data minimisation and should not
happen by an unattended command quietly doing nothing.

Nothing schedules this. Add it yourself:

```php
// routes/console.php
Schedule::command('statamic:consent:prune')->daily();
```

::: tip 400 days, not 182
The cookie lasts 182 days; the record lasts 400 by default. That is on purpose — the proof
has to outlive the consent it proves, because a complaint about a decision arrives after the
decision has expired.
:::

## Why there is no screen

Looking a record up is a console command, not a Control Panel listing, and that is a
deliberate trade rather than an omission.

A native listing in Statamic 6 is an Inertia page, which means a Vue build, a committed
bundle and a CI job that proves the bundle is current. That machinery has a failure mode of
its own — a stale bundle silently running last release's code — and this addon carries none
of it. That is also what makes it an Antlers addon with no build step at all.

Weighed against a lookup that happens when a lawyer writes, a command is the better trade.

If you want a screen, the model is available and does the obvious thing:

```php
use Goldnead\StatamicConsent\Records\ConsentRecord;

ConsentRecord::query()->forConsentId($id)->get();     // newest first
ConsentRecord::query()->olderThan($cutoff)->count();
```

## What this is not

It is not a legal opinion, and it is not a complete GDPR compliance story. It is one
artefact: a server-side record that a given browser, at a given time, was shown a given set
of services and said yes to some of them.

The rest — a privacy policy that names the services, a lawful basis for each, a way to act on
a request — is yours. See [Privacy & retention](/guide/privacy) for how the other addons in
the suite handle their share of it.
