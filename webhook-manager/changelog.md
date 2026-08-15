---
title: Webhook Manager changelog
editLink: false
---

# Changelog

<AddonHeader slug="webhook-manager" />

Release notes for `goldnead/statamic-webhook-manager`, as published with the package.

Cross-version upgrade notes for the whole suite are in
[Upgrading](/guide/upgrading).

## 2.2.0 — 2026-08-15

### Added — the settings screen writes

Settings printed `config/webhook-manager.php` and told the operator to go and
edit a file on the server. It is a form now: modules, retry policy, HTTP
defaults, inbound limits, signature headers, logging and retention are editable
from the Control Panel with the `manage webhook settings` permission.

Only the **difference** to the config file is stored — one row per changed key
in the new `webhook_settings` table, applied over the config at boot. A value
set back to what the file says deletes its row again, so the shipped defaults
keep moving with the package instead of being frozen the day somebody first
opened the screen, and an install that never opens it is indistinguishable from
one running an earlier release.

The screen, the validation and the boot-time override all read one definition
(`Support\Settings`). That is the point of the rewrite: the read-only version
kept its own list of labels **and its own copy of every default**, so it was a
second description of the config file that could disagree with it — and did, on
`debug.expose_full_response_in_dev`, where the screen's fallback was `false`
against a file that ships `true`.

Deliberately not editable, each for a reason the screen states: everything from
`env()` (queue, alerts, circuit breaker — the deployment owns those, and the
chat webhook is a credential), `inbound.route_prefix` and its middleware (read
while routes are registered, frozen by `route:cache`), `retry.schedule` (read
before the addon boots), and `storage.driver` (switched through the storage
panel, which moves the stored configuration with it). The env-provided values
are still shown, read-only, so nobody has to guess what is active.

The table is not brand-scoped, unlike everything else in this addon. A timeout
or a feature toggle that differed per brand would mean one queue worker applying
different rules depending on whose delivery it picked up.

### Fixed — die Alarm-URL stand im Klartext auf dem Schirm

Der Diagnose-Block am Fuß der Seite druckt den aufgelösten Config-Baum, damit
ein Betreiber sehen kann, was seine Installation tatsächlich geladen hat. Darin
stand `WEBHOOK_MANAGER_ALERT_SLACK_URL` ungeschwärzt — und diese URL **ist** das
Passwort: wer sie hat, schreibt in den Kanal. Sie landete damit in
Bildschirmfotos, in geteilten Bildschirmen und in jedem Frontend-Fehlerbericht.

Geschwärzt wird jetzt serverseitig, nach Schlüsselnamen statt nach Pfad, damit
ein Schlüssel namens `secret`, der nächstes Jahr dazukommt, ohne Zutun mitgeht.
Die Schwärzung vererbt sich nach unten: `webhook_urls => [a, b]` ist genauso
gedeckt wie ein einzelner Wert. Es bleiben die ersten und letzten vier Zeichen
stehen, genug um zwei Zugangsdaten zu unterscheiden und zu wenig um eine zu
benutzen. Der Test prüft die **ganze** Antwort, nicht die eine Prop — ein
Geheimnis, das anderswo wieder auftaucht, ist dasselbe Leck.

### Fixed — zwei Felder zeigten ihren Übersetzungsschlüssel statt ihres Namens

`Settings::field()` flacht `retry.retry_on_status` zum Sprachschlüssel
`retry_retry_on_status` ab, die Sprachdateien hatten ihn ohne das Präfix. Das
ergibt keinen Rückfall und kein leeres Label: Laravel liefert den Schlüssel
selbst zurück, also stand `webhook-manager::settings.fields.retry_retry_on_status.label`
auf dem Schirm, in beiden Sprachen, und die Fehlermeldung dieser Felder las sich
genauso. 285 grüne Tests haben nie ein Label angesehen; jetzt tut es einer, für
jede Gruppe, jedes Feld und jede Auswahloption in beiden Sprachen.

### Fixed — `config:cache` fror die Overrides ein

`config:cache` bootet die Anwendung vollständig und schreibt danach den
aufgelösten Config-Baum auf die Platte. Die Overrides landeten mit darin, und
ein eingebackener Override überlebt die Zeile, aus der er stammt: eine gelöschte
Einstellung hatte danach bis zum nächsten `config:clear` keinerlei Wirkung.
Schlimmer noch, der nächste Boot las die eingebackene Datei als „ausgelieferten
Default" — ein auf den Dateiwert zurückgesetzter Wert galt dann als Abweichung
und wurde als Zeile gespeichert, statt gelöscht zu werden. Genau die Regel, die
diese Klasse verspricht, kippte damit dauerhaft.

Während des Cache-Baus wird jetzt nichts angewendet. Die gecachte Datei trägt
die Dateiwerte, und jeder Prozess legt seine Overrides beim eigenen Boot
darüber.

### Fixed — kleinere Schärfungen aus der Kritiker-Runde

- Das Schreiben läuft in einer Transaktion. Ein Fehler auf halbem Weg hinterließ
  einen Satz, den die Antwort danach als Wahrheit zurückmeldete.
- Der Zweig für einen Nur-Lese-Modus ist weg. Der Controller bricht vorher mit
  403 ab, also gab es diesen Zustand nie — eine Prop, die einen unerreichbaren
  Zustand beschreibt, ist ein Ast, den niemand je betritt.
- `CpValidationVisibilityTest` kennt jetzt auch das größte Formular des Addons.
  Der Wächter liest sonst literale `'key' =>`-Paare aus einem FormRequest, und
  dieser baut seine Regeln aus `Settings::fields()` — er saß im toten Winkel des
  Tests, der genau für diesen Fehler geschrieben wurde.
- `InboundEndpoint` hat seine Spalten dokumentiert. Damit fallen 22 Einträge aus
  der phpstan-Baseline, die nur dort standen, weil ein `$guarded = []`-Model für
  die Analyse keine Eigenschaften hat.

## 2.1.2 — 2026-08-13

A second critic round over 2.1.0/2.1.1. Nothing here is a new feature; all of it
is a claim from those two releases that did not hold as written.

### Fixed — the log gate could be stepped around by varying the URL

2.1.0 stopped an unauthenticated request from writing a database row per
attempt — by keying the gate on the brand segment, which is the caller's own
input. Vary the segment and every request is a fresh key again: one log row
each, plus one unbounded cache entry each, which on the `database` cache store
is the same INSERT problem moved one table over. Five made-up brand names bought
five rows; measured.

The key is a constant now, one per line type. What varies belongs in the message
and the context, where a person reads it, not in the key that decides whether to
write at all. The cost is stated rather than hidden: several senders pointing at
different wrong brands inside the same hour produce one line, not one each — and
the first line is the one that tells an operator something is misaddressed.

### Fixed — a cache that keeps nothing silenced the warnings entirely

The same conditional-write trap as 2.1.1, in the other direction. On the `null`
driver the gate's write always reports failure, which read naively means "already
said this" — so `inbound_brand_not_found` and
`inbound_signature_without_timestamp` were never written at all. A sender
pointing at a brand that does not exist is a real operator problem, and it was
being hidden behind a cache setting.

Both call sites and the replay guard now go through one place, `Support\CacheClaim`,
which is where the three ways `Cache::add()` can answer `false` — key present,
store keeps nothing, TTL zero or less — are told apart once instead of in each
caller.

### Fixed — an unroutable brand handle produced a URL pointing at the wrong tenant

2.1.0 dropped a brand segment the router could not match, on the reasoning that a
visibly incomplete URL is better than a wrong one. It is not incomplete:
`{prefix}/{handle}` routes perfectly well, to the **default** brand. The operator
was handed a working link pointing at another tenant, with nothing to notice.

The segment stays in the URL now, so it fails loudly at the first delivery rather
than quietly succeeding against the wrong brand, and
`WebhookManagerServiceProvider::inboundPathIsRoutable()` answers the question
before then. Nothing validates a brand handle on the way in — `Brand` is
unguarded and its column carries only a unique index — so this case is real.

### Fixed — the test guarding the replay default did not guard it

`test_an_endpoint_created_through_the_control_panel_has_replay_protection_on`
posted a body that left `replay_protection_enabled` out, so the action's own
default answered and the test stayed green with the CP template back on `false`.
That is the exact substitution the previous round was about, repeated one level
up. It reads the create form's own Inertia payload now and submits that; put the
template back on `false` and both tests go red.

### Changed — one pattern for a route segment, in one place

`routes/inbound.php` and `SaveInboundEndpointRequest` carried `[a-z0-9_-]+` as
literals while `inboundPath()` decided from a constant whether the URL it prints
can be matched. Two copies of the rule that says what a URL may contain is how
this release's original bug happened. They all read
`WebhookManagerServiceProvider::INBOUND_SEGMENT_PATTERN` now.

### Deprecated — `ReplayProtectionService::seen()` / `remember()`

They are the read-then-write pair whose race `check()` was changed to avoid.
Nothing in this package calls them; they remain only because they are public.

## 2.1.1 — 2026-08-13

### Fixed — on the `null` cache driver, 2.1.0 answered every delivery with 409

2.1.0 made the replay claim a single conditional `Cache::add()`, which is right
for the race it fixes and wrong about one thing: a `false` from `add()` means
either "the key is already there" or "this store keeps nothing at all", and on
the `null` driver only the second is ever true. Every delivery to an endpoint
with replay protection on was therefore rejected as a duplicate of nothing — a
cache setting turning a working endpoint off, which is worse than the missing
guard, and more likely now that new endpoints have the guard on by default.

One read on the rejection path tells the two apart. Stores that actually
remember are unaffected, and the claim is still one conditional write.

**Affected:** 2.1.0 only, and only with `CACHE_STORE=null`.

## 2.1.0 — 2026-08-13

### Fixed — a multi-brand install answered every inbound delivery with 404

The endpoint was there, enabled, with the right handle and the right secret.
Nothing could see it.

`InboundEndpoint` is brand-scoped, and the brand scope fails closed: with no
current brand a query returns no rows. Every other route in this family gets its
brand from something the caller carries — a Control Panel session, a bearer
token, a link token. A webhook sender carries none of those. It is Scaleway or
Stripe or n8n, and it holds a URL. So the lookup in `InboundWebhookController`
ran with no brand, the scope excluded every row before the query was made, and
the controller answered `404 Endpoint not found or disabled` — the same answer a
misspelt handle gets, which is why it read like an operator mistake rather than
a total outage of the feature.

The brand now comes out of the URL, which is the only thing the sender holds:

```
https://your-site.test/webhooks/inbound/{brand}/{handle}
```

`ResolveInboundBrand` sets it for the **whole** request, not just around the
lookup. The action at the end of the pipeline writes rows, and those are stamped
with the current brand at write time; resolving the endpoint under one brand and
writing its results under another would have been the same bug in a more
expensive form. The previous value is restored on the way out, so a long-lived
process cannot hand one delivery's brand to whatever runs next.

**The short URL keeps working** and resolves to the **default** brand — where
the brand-scoping migration put every endpoint that predates brands, so an
install that switches `multi_brand` on keeps the senders that worked before it
switched. It deliberately does not search the other brands for a matching
handle: `handle` is unique per brand, not globally, so that search would have to
guess the moment two brands pick the same name, and a webhook config is a
destination plus the credential that authenticates it. A brand segment naming a
brand that does not exist gets the same 404 as an unknown handle, so the URL
cannot be used to enumerate an installation's brands.

`ResolveInboundBrand` is prepended to the inbound stack by
`inboundMiddleware()` and is not part of the configurable list. An install that
published `config/webhook-manager.php` before this release has the old array
frozen in its own file and would otherwise have upgraded into the same outage
without a single line of warning.

**Are you affected?** Only with `brand-context.multi_brand` on. Single-brand
installs — every install before brands, and the overwhelming majority since —
were never affected: the scope is a no-op there and the short URL behaves
exactly as it always did. One cosmetic change does reach them: the Control
Panel now prints the brand-qualified URL everywhere, so an endpoint that used
to be shown as `/webhooks/inbound/orders` is shown as
`/webhooks/inbound/default/orders`. Both work. There is no reason to go and
reconfigure a sender.

**Why no test caught it.** Every inbound test ran single-brand, where the scope
does nothing, and every brand-isolation test asserted at the model layer without
making a request. The outage sat in the gap between them.
`InboundEndpointIsReachableUnderMultiBrandTest` is that gap, closed.

### Removed — `SubstituteBindings` is no longer in the inbound stack

It was there "so that a future bound route parameter resolves". There is no
bound parameter on any inbound route: `{brand}` and `{handle}` are generic
names, deliberately unbound, and `RouteParameterCollisionTest` keeps them that
way. So it resolved nothing, and it was not free — a `Route::bind('brand')`
registered by the host app or any sibling addon applies to every route with
that parameter name, this one included, and a binding that aborts when it finds
nothing (which is what a model binding does) ended the delivery. Measured, not
reasoned: with it in the stack, a hostile binding turned a correctly signed
delivery into a 404. `InboundEndpointDefaultsAndRouteOrderTest` registers that
binding and sends a real delivery through it.

**If you published `config/webhook-manager.php`** before this release, your own
copy still lists `SubstituteBindings` under `inbound.middleware` and keeps that
exposure. Removing the line is the whole fix.

### Fixed — the Control Panel printed a URL that was not the one being routed

Two independent reasons, both of which handed the operator a URL that 404s. The
listing and the edit page built the URL from `path`, a free-text field, while
the router has always matched on `handle` — equal until someone edits `path`.
And neither knew about the brand segment.

The URL on the listing — the one with the copy button, the one that gets pasted
into a sender's webhook field — is now built in PHP by
`WebhookManagerServiceProvider::inboundPath()` and printed as it arrives. The
edit page still composes the same shape in the browser, because it previews the
URL live while the handle is being typed and there is no saved endpoint to ask
about yet.

`inboundPath()` also refuses to print a brand segment the router could not
match. Nothing validates a brand handle on the way in — the model is unguarded
and the column carries only a unique index — so a brand called `Chor.de` is
possible, and printing it would have recreated this exact bug one level up.

### Fixed — an unauthenticated request could write a log row per attempt

`ResolveInboundBrand` writes its two log lines *before* the endpoint is looked
up, and therefore before the rate limiter, which lives in the pipeline and needs
an endpoint to know its budget. `SystemLogger` writes a database row. Ungated,
`POST /webhooks/inbound/anything/atall` was one INSERT per request, from any
address, with no signature, no endpoint and no brand. Both lines are now written
at most once per key per hour — a log line exists to be read by a person, and a
cache miss on a hostile key costs a cache write instead of a table row. The same
gate keeps `inbound_brand_defaulted` from writing a row for every legitimate
delivery on the backwards-compatible short URL.

### Fixed — the replay guard could be beaten by the case it exists for

`ReplayProtectionService::check()` was `seen()` followed by `remember()`, with a
window between the two. The delivery that lands in that window is precisely the
one this class is for: a sender that did not get its answer in time and sends
the same delivery again immediately. Both requests read "not seen", both
proceeded, and the configured action ran twice — under concurrency the guard did
nothing at all, and no sequential test could ever show it. The claim is one
conditional `Cache::add()` now, so exclusivity is the store's (`SET NX` on
Redis, `add` on Memcached, a unique key in the database store).

A `false` from `add()` means one of two things, and they are not the same: the
key is already there, or the store keeps nothing at all. On the `null` driver
only the second is ever true, so answering `409` to every `false` would have
turned a cache setting into a permanently dead endpoint — a worse failure than
the missing guard. One read on the rejection path tells them apart.

### Changed — new inbound endpoints have replay protection on

`replay_protection_enabled` defaults to `true` for endpoints created from 2.1.0
onwards. Every serious sender retries a delivery it could not confirm, and a
timeout looks exactly like a failure from the outside; without the duplicate
guard the configured action simply runs twice. Existing endpoints keep whatever
they were saved with, and the switch is still in the Control Panel for the cases
where the action is genuinely idempotent.

### Added — an HMAC endpoint that does not require a timestamp now says so

`inbound_signature_without_timestamp`, at most once an hour per endpoint, in the
CP log. Not once per delivery: the condition is a property of the endpoint's
configuration and does not change between deliveries, and a line per delivery
would bury the log an operator uses to find actual trouble.

Without `require_timestamp` an HMAC signature covers a body and nothing else,
and a signature that says nothing about when it was made never expires: anyone
who has ever seen one valid delivery can send it again next year and it
verifies. The replay cache closes its own window — ten minutes by default — and
not one second more; it is a duplicate guard, not an expiry.

It is not switched on for you. A sender that does not send the timestamp header
would start failing on upgrade, and this package does not get to make that
decision for a running integration. So it is said out loud instead, where the
operator reads the rest of that endpoint's traffic.

## 2.0.0 — 2026-08-09

### Changed — the licence is now proprietary

This is a paid Marketplace addon. `composer.json` declares `proprietary` and the
licence file carries the commercial addon licence instead of MIT. Entitlement is
enforced by the Statamic Marketplace, not by code in this package.

Tags up to and including `v1.10.2` remain MIT. The change takes effect with the next
release.

## 1.10.2 — 2026-08-05

### Fixed — the breakpoint-less single-column grid utility is no longer used

Every addon in this family ships its own Tailwind build, and `@statamic/cms/tailwind.css`
routes all of them into the same `addon-utilities` layer. Media queries add no specificity, so
the bare single-column grid rule from whichever addon stylesheet loads **last** won against an
earlier addon's `sm:`/`lg:` variant and pinned that addon's grid to one column at every width.

Invisible when this addon is checked alone. It only appeared once two addons of the family were
installed together, which is the normal case on a real site.

A grid falls back to one column on its own, so the class bought nothing. The overflow guard its
`minmax(0,1fr)` track provided is preserved explicitly, because the implicit column is `auto`.

## 1.10.1 — 2026-08-01
### Fixed — rolling brand scoping back could strip `handle` of any uniqueness at all

1.7.3 recorded ten MySQL failures as known, pre-existing and deferred: `down()` of the brand-scoping migration restores the global `unique('handle')`, and an install where two brands share a handle cannot satisfy it, so `migrate:rollback` died with `1062 Duplicate entry` from inside an `alter table`. The note said the fix was a decision about what un-brand-scoping should do to multi-brand data. This is that decision.

It refuses. No engine rolls DDL back, so the old behaviour left the table it died on with its brand-scoped unique already dropped and the global one not yet built — a `handle` column carrying no uniqueness whatsoever, on an install whose operator had just watched a command fail and would reasonably assume nothing had happened. And the alternative, deduplicating on the way past, is worse: an outbound webhook row is a target URL plus the credential that signs it, two brands that both call theirs `crm-lead` point at two different systems, and nothing in the row says which one an install should keep. Keeping the lower id would silently repoint one tenant's traffic at another tenant's endpoint.

So `down()` now collects the colliding handles across all four root tables **before its first statement** and, if there are any, throws with the table and the handles named and the schema untouched. Resolving it is one rename per collision, then the same command again. A rollback with no collision behaves exactly as before.

**Are you affected?** Only if you run `php artisan migrate:rollback` or `migrate:reset` far enough back to reach `2026_07_24_100003_add_brand_id_to_webhook_manager_tables`, on an install running more than one brand. Nothing about a forward `php artisan migrate` changes, and no site that has never rolled back is in a bad state. If you did roll back and it failed on `1062 Duplicate entry` (MySQL) or `UNIQUE constraint failed` (SQLite): check `show index from webhook_outbounds` — a table with neither `webhook_outbounds_handle_unique` nor `webhook_outbounds_brand_id_handle_unique` was left half-converted by the old code and needs the index put back by hand.

### Fixed — the test bed could not see the rollback path

`tests/Migrations/RollbackWithExistingDataTest` is the mirror of the forward-path bed added in 1.7.3: it installs the head schema, fills every table, and rolls back — refusing while two brands share a handle, going through and restoring the global unique when they do not, and taking every table with it on a full reset. It runs on both engines.

The reason this went uncovered for four releases is worth naming. The default suite is in-memory SQLite, whose database is gone before testbench's teardown rollback ever reads a row, so `down()` was executed against nothing on every run since it was written. Only the MySQL leg added in 1.10.0 keeps a real database between setUp and teardown — and it found this on its first run, which is the whole argument for having it.

`phpunit -c phpunit.mysql.xml` is now green: 241 tests, 1071 assertions, same as SQLite.

## 1.10.0 — 2026-08-01
### Fixed — automatic retries were planned and never executed

The most serious of the three. `RetryPlanner` computed the next attempt, `DeliveryEngine` wrote it to `next_retry_at`, the delivery detail screen rendered "next retry in 30 seconds", and `DeliveryRepository::readyForRetry()` — the query written specifically to find those rows — **had no caller anywhere in the package**. `ProcessOutboundDeliveryJob` sets `$tries = 1` and states in its own docblock that "a scheduled job dispatcher (or the replay command) picks it up". No such dispatcher existed, and `webhook-manager:replay-failed` is a manual bulk tool that nothing schedules either.

So a transient 503 produced a delivery that displayed as waiting for an attempt that would never come. The payload was lost and nothing said so, on an addon whose one-line description reads "deliveries, retries".

- New `webhook-manager:dispatch-retries`, registered on the scheduler by the addon itself (every minute), so a stock Laravel install with the usual `schedule:run` cron needs no setup. `webhook-manager.retry.schedule = false` takes it off again.
- Each due delivery is **claimed** — `next_retry_at` is cleared in a conditional update — before the attempt is handed off, so two overlapping scheduler runs cannot turn one planned attempt into two. If the attempt fails again the engine writes a fresh `next_retry_at` and the row returns on its own terms.
- Queued hooks go back through `ProcessOutboundDeliveryJob`; sync hooks go straight through `DeliveryEngine`. Per brand, like the other scheduled commands.
- `ScheduledRetriesActuallyRunTest` covers the whole path, including that a delivery out of attempts stops being scheduled and that the command is on the scheduler at all.

**If you are upgrading:** confirm your site runs `php artisan schedule:run` from cron. Without it, retries still do not happen.

### Fixed — the Overview hid its own "Add a Rule" button from everyone

`OverviewController` asked `can('manage rules')`. The registered ability is `manage webhook rules`. An ability nobody registered answers `false` for every user, super users included, so the CTA never rendered — on the very first screen a new install shows. No exception, no log line, no failing test; the same shape of defect as `test outbound webhooks` before 1.6.

Correcting the one string is not the fix. `PermissionStringsAreRegisteredTest` now compares every ability literal in `src/` against the registry in both directions: an ability that is checked but not registered fails, and an ability that is registered but never checked fails too. `CpTestCase::superUser()` reads its ability list out of the registry instead of repeating it, because the hand-typed copy was the same kind of drift waiting to happen.

### Fixed — the inbound rate limit did nothing

`inbound.rate_limit_per_minute` was declared in config, rendered into the Settings screen as a live "Rate limit (per minute)" security field, and sold in the marketplace copy — and no code anywhere read it. A control an operator believes is protecting a public endpoint, and is not, is worse than no control.

It is now the first step of `InboundRequestProcessor`, ahead of the method allowlist and ahead of authentication:

- keyed per endpoint id, so a flood on one endpoint does not throttle the others, and the legacy `!/webhooks/inbound` prefix shares the bucket instead of being a way around the limit;
- `429` plus `Retry-After` on rejection, `X-RateLimit-Limit` and `X-RateLimit-Remaining` on every response;
- a per-endpoint override through the `rate_limit_config` column, which until now was validated, cast, stored and never read;
- `0` disables it;
- rejections are logged as `inbound_rate_limited`, so a limit is distinguishable from an outage.

### Fixed — the IP allowlist auth scheme rejected everything

`ip_allowlist` was accepted by `SaveInboundEndpointRequest`, coloured on the inbound index and given an example config on the edit screen, but `IpAllowlistVerifier` was never passed to `AuthSchemeRegistry::registerDefaults()`. `get()` answered `null` and `InboundAuthVerifier` failed the request closed, so an operator who chose it got an endpoint that 401'd every delivery for no visible reason.

The verifier is registered, and it now reads both `ips` (what the CP's own example always showed) and `allow` (what the class always read) — whichever was copied, one of the two used to be ignored. `IpAllowlistAuthSchemeIsSelectableTest` asserts structurally that every `auth_type` the form accepts is a registered scheme.

## 1.9.0 — 2026-07-30

### Fixed — the flat driver leaked webhook credentials between brands

It had no brand concept at all. `FileStore` was a singleton bound to one path and nothing under `Repositories/FlatFile` read or wrote a brand, so `content/webhooks/` held one undifferentiated set and **every brand read every brand's hooks**. The eloquent driver scoped correctly the whole time, so the same install isolated or did not depending on a value that reads like a storage preference.

**This is worse here than in a CRM.** A webhook config carries a destination URL *and the credentials it authenticates with*. A cross-brand read is not "one tenant sees another's data" — it hands over a bearer token. A test in `FlatDriverBrandIsolationTest` asserts precisely that, and it failed before this release:

```
Failed asserting that '…"auth_config":{"token":"super-secret-token"}…'
does not contain "super-secret-token".
```

Firing a hook from the wrong brand also posts one tenant's payload to another tenant's endpoint.

**Brands now live in the path:**

```
content/webhooks/{brand}/outbound/{handle}.yaml
content/webhooks/{brand}/inbound/{handle}.yaml
content/webhooks/{brand}/rules/{handle}.yaml
content/webhooks/{brand}/templates/{handle}.yaml
```

A `brand:` key inside each YAML was rejected: the handle is the filename, so a key would give every definition two identities that can disagree, and a missing or misspelt one would fall through to the default brand — a leak that reads like a typo. With a directory the isolation is structural and visible in `ls`.

The semantics live in one class, `Storage\BrandSegments`, matching `statamic-marketing` and `statamic-leadhub` so all three flat drivers behave the same way.

- **Single-brand installs change nothing.** No directory, no move, nothing to run.
- **The pre-brand layout is read as the default brand's**, and only that brand's, so an install that enables multi-brand does not lose its hooks.
- **Fail closed.** Multi-brand with no current brand reads nothing rather than everything, matching the eloquent global scope.
- A write lands where the definition already lives, so an un-migrated install gains no second copy that shadows the original.

### Added — `webhook-manager:migrate-flat-brands`

Moves the pre-brand layout into a brand directory.

```bash
php artisan webhook-manager:migrate-flat-brands --dry-run
php artisan webhook-manager:migrate-flat-brands
php artisan webhook-manager:migrate-flat-brands --brand=acme
```

Only ever moves. Never overwrites — a target that already exists means a finished migration or a genuine conflict, and neither is resolved by clobbering — never deletes, and a second run is a no-op.

### Notes

Segment resolution is memoised per brand identity; it is consulted on every file operation and the key carries the brand, so a `BrandContext::runFor()` switch inside one process invalidates it.

`tests/Feature/FlatDriverBrandIsolationTest.php` and `MigrateFlatBrandsCommandTest.php` cover this. Five of the six isolation cases failed before the change; the sixth is the single-brand case, which must not change and does not.

> Found by auditing all three flat drivers after the same defect was fixed in `statamic-leadhub` 1.11.0. `statamic-marketing` has been correct since 1.6 and needed nothing.
## 1.8.0 — 2026-07-29

### Fixed — the inbound endpoint was published on a URL nobody could send to

The endpoint answered on `/!/webhooks/inbound/{handle}`. `!/` is Statamic's prefix for its own utility routes; it is not a string anyone types into a provider's webhook field, and every other place in this addon that named the prefix already spelled it without one — `InboundController` passed `webhooks/inbound` to the CP, `SettingsController` reported `/webhooks/inbound`, and only `config/webhook-manager.php` said `!/webhooks/inbound`. Two of those three were wrong about the addon's own routing table.

A POST to the URL those defaults implied did not 404. It fell through to Statamic's front-end catch-all `Route::any('/{segments?}')`, which is in the `web` middleware group, which contains `ValidateCsrfToken` — so it came back **419 “CSRF token mismatch”**, with or without credentials, identically for a correct token and a forged one. That is a convincing impersonation of a broken authentication layer, and it is why this was diagnosed as a CSRF problem on the endpoint. The endpoint was never reached.

The canonical prefix is now `webhooks/inbound`. `!/webhooks/inbound` stays routable through `inbound.legacy_route_prefixes`, so a sender already configured against the old URL keeps working; set that config key to `[]` once none is. The CP, the settings screen and the router now all read the same value, so the URL an operator copies out of the CP is the URL that is routed.

### Changed — the inbound endpoint no longer runs the `web` middleware group

It was registered through Statamic's `$routes['web']` hook, which drops every route it registers into the application's `web` group. For a machine-to-machine endpoint that group is wrong end to end: `ValidateCsrfToken` rejects a sender that by definition has no session token, `StartSession` writes a session file per delivery that nothing ever reads, and `EncryptCookies`, `ShareErrorsFromSession` and whatever the host app appends — Inertia handling, last-seen writes, redirect handlers — all run on a request that will only ever be answered with JSON.

The previous fix for this was `->withoutMiddleware([ValidateCsrfToken::class])` on the route. That removes exactly one member of the group, and only for as long as the host application registers that precise class name; a host on the older `VerifyCsrfToken` alias, or one that subclasses it, gets a route that is silently back under CSRF. The endpoint is now registered by `WebhookManagerServiceProvider::bootInboundRoutes()` outside Statamic's hook, declaring its complete stack (`SubstituteBindings`) rather than inheriting one and undoing a piece of it. Nothing is removed because nothing is inherited.

Registration still happens during `bootAddon()`, which Statamic fires from its `$app->booted()` callback *before* it loads its own route files — so the endpoint is still matched ahead of the front-end catch-all, exactly as it was.

The stack is `webhook-manager.inbound.middleware` and it is the complete list, not an addition to `web`. Putting `'web'` back in it restores the 419.

### Fixed — `basic` auth authenticated everyone when it was not configured

`BasicAuthVerifier::verify()` compared the configured username and password against the request's with `hash_equals` — correct, constant-time — but did not first check that anything was configured. `hash_equals('', '')` is `true`, and a request with no `Authorization` header has an empty user and an empty password, so an endpoint saved with `auth_type = basic` and an empty or half-filled `auth_config` passed both comparisons and went on to parsing, mapping and action dispatch. It now fails closed unless both a username and a password are set.

No endpoint on any environment we can see uses `basic`; the one configured inbound endpoint uses `static_header`, which was never affected. The exposure mattered more the moment the route stopped sitting behind `web`, since the verifier is now the only thing in front of it.

### Known — configured but not enforced

> Both entries below were fixed after this release; see the Unreleased section at the top of this file. They are left here because the 1.9.0 tag still behaves as described.

Two columns on `webhook_inbounds` are accepted by the CP, validated, cast and stored, and then never consulted at request time:

- **`rate_limit_config`** — there is no rate limiting on the inbound endpoint. `webhook-manager.inbound.rate_limit_per_minute` is likewise only ever read back out to the settings screen. An endpoint is as available as the webserver in front of it.
- **`IpAllowlistVerifier`** — implemented, correct, and never passed to `AuthSchemeRegistry::registerDefaults()`, so `ip_allowlist` cannot be selected or matched.

`replay_protection_enabled`, `max_payload_kb`, `allowed_methods` and `expected_content_type` *are* enforced, in `InboundRequestProcessor`, in that order, before the action dispatcher runs. These two are not, and are listed here rather than quietly implemented.

## 1.7.3 — 2026-07-28

### Fixed — the brand-scoping migration guessed which brand your data belongs to

`2026_07_24_100003_add_brand_id_to_webhook_manager_tables` resolved the default brand as `DB::table('brands')->where('is_default', true)->value('id') ?? 1` and stamped every outbound, inbound, rule, template, delivery, log and secret audit with the result, then froze the column NOT NULL three steps later.

The fallback is reachable. `goldnead/statamic-brand-context` inserts its default brand with `insertOrIgnore`, so an install whose `brands.handle` was already taken ends up with no `is_default` row at all; nothing in that schema constrains `is_default` to one row, and nothing reserves id 1. On such an install every webhook in the database was assigned to brand 1 — a brand that may belong to somebody else or may not exist, since there is no foreign key here to refuse it — and then the column was made NOT NULL, which makes a wrong answer indistinguishable from a right one from that point on. A webhook is a credential and a destination. Pointing a tenant's entire webhook surface at the wrong brand is not a cosmetic error, and nothing about it is visible from outside the database.

**Affected: nobody we can identify, and that is the point.** The fallback only fires where `is_default` returns nothing, which no install produced by a normal `composer require` does. It was reachable, silent, and unbounded in consequence, which is enough. The lookup now tries `is_default`, then the lowest brand id that actually exists, and stops with a named `RuntimeException` if neither answers or if the `brands` table is not there — resolved before the first `alter table`, so a refusal leaves the schema exactly as it found it. Stopping costs an operator one command. Guessing costs data whose wrongness nobody can see. A migration may refuse to run; it may not invent an owner.

**How to check an install that has already migrated:** `select distinct brand_id from webhook_outbounds` against `select id from brands`. Any `brand_id` with no matching brand was invented by that fallback.

### Fixed — an interrupted migration could not be repaired by running it again

Nothing in the published migration was guarded. It added `brand_id` to seven tables unconditionally, dropped four `handle` uniques, added a composite index and froze a column — all of it unconditional. No engine rolls DDL back and a migration that throws is not recorded as run, so an interruption anywhere after the first `alter table` left a half-converted schema with the migration still pending. The only move available then is `php artisan migrate` again, and that died at the very first statement on `duplicate column name: brand_id` — an error about step 1 that says nothing about the step that actually failed, and points whoever reads it at the wrong end of the file. Meanwhile the four `handle` uniques may already have been dropped and not yet replaced. This is the fingerprint `statamic-marketing` documented in its 1.6.4.

Every step now asks the schema what state it is in: `hasColumn` per table before adding the column, `getIndexes` before each unique or index step, `{$table}_handle_unique` dropped only where it is still there, `(brand_id, handle)` built only where it is not, `(brand_id, idempotency_key)` added only if missing. Running the migration twice is a no-op; running it on a half-converted install finishes the conversion.

### Fixed — the backfill overwrote brand ids that had already been assigned

The backfills were unconditional `update()` calls with no `where`. On a second run — or on an install that had already become multi-brand — every row of every table was rewritten to the default brand in one statement: outbounds deliberately moved to another brand, and the deliveries and logs that had inherited from them, silently and with no way to tell afterwards which rows had been placed on purpose. Every backfill is now restricted to `whereNull('brand_id')`. A row that already carries a brand is never touched.

### Added — the migrations are finally tested against a database with data in it

This is the finding underneath all three. A sweep across all eight addons in this family, prompted by `statamic-marketing` 1.6.4, looked for a check that runs a migration against tables that already hold rows and found none, anywhere. Every migration in this addon had only ever met an empty schema that testbench built moments earlier and migrated to head in one uninterrupted run — with the default brand sitting at id 1 because brand-context had just created it, which is precisely the one state in which an unguarded `alter table`, a backfill with no `where` and a fallback of `1` all behave correctly.

`tests/Migrations/` names no migration file. It walks `database/migrations/`, seeds a fresh generation of data into every table that already exists before each file runs, and applies them one at a time — so a migration added years from now is covered the day it lands. `tests/Fixtures/released-migrations/` holds the sets as published in 1.2.0, the last release before brand scoping, and in 1.7.2; the suite installs each, fills all seven tables with rows whose children point at real parents, and upgrades forward. It is in `phpunit.xml`, `phpunit.xml.dist` and `phpunit.mysql.xml`.

Every check is behavioural. "The migration ran" and "the constraint is there" are not the same statement. So nothing here asserts an exit code or an index name; it writes the row the constraint is supposed to refuse and requires the database to refuse it — and the counterpart that catches a unique rebuilt over `handle` alone: the same handle in a *different* brand must still be accepted.

`tests/Feature/BrandIdMigrationHardeningTest.php` covers the three defects above directly, each from a populated 1.2.0 install. Reverted against the published migration, all four of its cases fail: two with `duplicate column name: brand_id`, one because the rows were stamped with a brand id no brand in the database has, and one because the migration invented a brand for an install that has none.

### Notes

- Suite: **183 passed (859 assertions)**, baseline 176. Vitest unchanged at 90.
- **Known and pre-existing on MySQL, not introduced here:** ten tests error under `phpunit.mysql.xml`, and the same ten error with this release's changes stashed. One cause, in `down()`: testbench rolls migrations back after every test, `down()` restores the global `unique('handle')`, and `BrandIsolationTest` has by then deliberately written one handle into two brands, so the rollback dies on `1062 Duplicate entry`. SQLite never sees it because it drops the file instead. The right fix is a decision about what un-brand-scoping should do to multi-brand data, which is not this release's to make. The seven tests added here were run against MySQL 8.0 on their own and are green.

## 1.7.2 — 2026-07-28

### Fixed — what the server rejected is now visible on every CP form

This is the webhook-manager half of the cross-addon sweep marketing 1.5.3 started: for every mask in this control panel, does a rejected input actually reach the screen? Unlike marketing, most of it already did — the Edit masks bind `Field`'s `error` prop for the keys they render, and `tabsWithErrors` even moves the user to the tab the error is on. What was missing sat in the gaps between those masks.

**Errors the server sends that no page could show.** `SaveOutboundWebhookRequest` validates 25 keys; `outbound/Edit.vue` binds 17 of them to a field and had no collected output, so `headers`, `conditions`, `trigger_config`, `retry_strategy`, `retry_strategy.strategy`, `retry_strategy.max_attempts`, `idempotency_enabled` and `success_matcher` were rejected into nothing at all — save pressed, nothing written, nothing said. `rules/Edit.vue` had the same hole for exactly one key, `conditions`, and that one is worth naming: the Conditions tab does show an error, but `conditionsError` is the *client-side* JSON parse failure. The server's verdict on the same field went nowhere. It is now bound through a `Field` wrapping both editing modes, so it appears whether the builder or the JSON editor is open.

**Two banners that were not styled as errors.** `Alert` knows `default`, `warning`, `error` and `success`. `inbound/Edit.vue` passed `variant="danger"` and `templates/Edit.vue` passed `type="error"` — the first is not a value it honours, the second is not a prop at all, so both landed in `$attrs` and both banners rendered in the neutral style. The message was there; it did not look like an error. Same family as the `confirm-text` defect fixed in 1.7.1, and found the same way: by checking the component's declared props instead of assuming.

**A refusal that arrived as a blank stop.** `SettingsController::switchStorage()` refused an unknown driver with `abort(422)`. A bare status carries no error bag, so Inertia had nothing to hand the page, and the settings page — which has no fields, only this one submission — showed nothing whatsoever. It now validates `driver` against the known list, which produces `errors.driver`, and the page renders it.

**Rejections that reach a page outside its own form.** `useForm`'s bag only carries what `form.submit()` sent. A refused delete comes back through `router.delete`'s `onError` with a bag of its own, and all four Edit pages discarded it: the dialog closed, the record stayed, nothing said why. Each page now keeps that bag and shows it in the same banner.

**Two submissions with nowhere to put an error branch.** `templates/Index.vue` deleted and `deliveries/Index.vue` replayed straight from a `@click` in the markup. An inline handler cannot grow an `onError` without becoming a function first, so those two never had one. Both are functions now.

**Where this is a net rather than a repair, said plainly.** The listing pages (`inbound`, `rules`, `outbound`, `templates`, `deliveries`) get the same collected output and the same error branch on toggle, delete and replay — but the endpoints those buttons reach can currently only refuse with a 403, which Inertia does not route through `onError`. Nothing there can fill today. It is deliberate: LeadHub 1.7.0 already refuses a delete that still has children, with a reason, and the day one of these does the same the message will have somewhere to go instead of costing another release.

**The two test layers, and what only the second one could see.**

`tests/Feature/CpValidationVisibilityTest.php` is the structural guard, the same shape as marketing's, extended for the two submission styles this addon uses (`router.*` and `useForm().submit()`) and for the inline-handler case. It reads sources, so it also had to learn to strip comments first: `deliveries/Show.vue` explains in prose why it does *not* use `router.post()`, and a naive scan counted the explanation as the thing. Five of its six tests fail against 1.7.1.

`tests/js/cp-validation-visibility.test.js` mounts each of the six form pages once per validated key and requires the message to be somewhere in the rendered DOM — at its own field or in the collected banner. This is the layer that catches what a source scan cannot: in marketing the same sweep declared `handle` as handled at the field while the field only existed when creating, so editing rendered the message nowhere. Here it caught something the structural test is blind to by construction — the two banners with the wrong variant. A scan sees `<Alert>` and a message inside it and calls the page covered; only a mount can be handed a rejection and asked what the component was actually given. 30 of its 70 assertions fail against 1.7.1.

`tests/js/setup.js` grew what those tests need: `useForm()` now seeds its bag from `globalThis.__TEST_FORM_ERRORS__` and derives `hasErrors` from it. The stub previously omitted `hasErrors` entirely, which means every `v-if="form.hasErrors"` banner in this addon was dead in a test process — they could not have failed no matter how broken they were. `router.patch` and `router.delete` were missing too.

## 1.7.1 — 2026-07-28

### Fixed — two delete dialogs that could not open

`Inbound/Edit.vue` and `Templates/Edit.vue` mounted their delete confirmation as

```
<ConfirmationModal v-if="showDelete" :confirm-text="__('Delete')" confirm-variant="danger" @cancel="showDelete = false" />
```

None of that is `ConfirmationModal`'s API. `open` is the only prop that opens it; it defaults to `false`, so a modal rendered behind `v-if` exists as a component whose inner dialog stays shut, portals nothing into the DOM and logs nothing. `confirmText` and `confirmVariant` are not props at all — the real names are `buttonText` and the boolean `danger` — so both landed in `$attrs` and were dropped, and the confirm button would have read "Confirm" if it had ever been visible. `@cancel` was the one part that was genuine: the component does emit it. It just cannot close what never opened.

The effect on an install: pressing **Delete** on an inbound endpoint or a template did nothing and said nothing. The two pages that were written the other way, `Outbound/Edit.vue` and `Rules/Edit.vue`, use `:open` / `:button-text` / `@update:open` and always worked. This was pre-existing and was found while renaming the route parameters in 1.7.0; the same silent shape as that defect, one layer up.

Both pages now match the working two exactly: the `v-if` becomes the same guard the Delete button already carries (`!isNew && deleteUrl`, `canDelete && deleteUrl`), `:open="showDelete"` drives the dialog, `:button-text` labels the button and `@update:open` closes it.

**The test that had to fail first.** `tests/js/delete-confirmation.test.js` runs the identical three assertions against all four Edit pages: the confirmation is present and closed before anything is pressed, it opens when `showDelete` flips, and its confirm button is labelled through the prop the component actually reads. Outbound and Rules are the control — the expectations are the same for all four, so what fails is a page drifting from the working shape, not a page-specific expectation. Against the code before this release, 6 of the 12 fail and the 6 that pass are the two correct pages.

`ConfirmationModal` is one of the stubbed CP components in `tests/js/setup.js`, so the test cannot assert that a dialog is visible; it asserts what the page hands the component, which is exactly where the defect is. Under the broken version the stub is absent from the DOM while `showDelete` is false, and appears without `open` once it is true.

**A gap in the JS bed, closed on the way.** `tests/js/setup.js` mocked `__()` only as a template helper. A `<script setup>` block that calls `__('Entry')` while building an option list threw at setup, before rendering — so three of the five Edit pages could not be mounted in a test at all, which is part of why this was never caught. It is now installed as a real global, the way the marketing and automations beds already do it.

**The sweep this came from.** `<ConfirmationModal>` is used 17 times across `statamic-webhook-manager`, `statamic-marketing`, `statamic-leadhub` and the hub's own pages. These two were the only broken ones; the other 15 all pass `:open` and `button-text` correctly. No sibling release was needed.

## 1.7.0 — 2026-07-28

### Changed — the rule: an addon may only bind route parameter names that belong to it

1.6.2 wrote down that this package claims `webhook`, `endpoint`, `rule` and `template` application-wide, and argued that renaming them would change nothing because no sibling uses those words today. That argument was about the four names. It was not about the class of failure, and the class is what keeps costing releases. This version states the rule and enforces it.

> **A `Route::bind()` is registered on the router, not on the package that calls it. Bind only names that unambiguously belong to your addon — specific enough that no sibling would reach for one by accident. Names you do *not* bind may stay as generic as they like: nothing resolves them, so nothing can be taken from anyone.**

The four bound parameters are renamed accordingly. `{webhook}` → `{webhookOutbound}`, `{endpoint}` → `{webhookInbound}`, `{rule}` → `{webhookRule}`, `{template}` → `{webhookTemplate}`; the shape is the addon's own prefix plus a capital, and it is what the guard test checks for, not a list of approved words.

**No URL changes.** `/cp/webhook-manager/rules/17` is the same string before and after — a route parameter name is the placeholder, never the path. What changed with it, across 13 files: the 4 `Route::bind()` registrations, the 18 route definitions, the 5 `$this->route(…)` lookups in `SaveOutboundWebhookRequest` (twice — once in the unique rule, once in the auth-config guard), `SaveInboundEndpointRequest`, `SaveRuleRequest` and `SaveTemplateRequest`, and the bound argument in 18 controller methods across `OutboundController`, `InboundController`, `RuleController`, `TemplateController` and the three test-action controllers, 56 variable occurrences in all. The Inertia payload keys the Vue pages read (`webhook`, `endpoint`, `rule`, `template`) are untouched — they are not route parameters, and renaming them would have broken the CP for no reason.

That `$this->route('webhook')` is the reason this was worth doing carefully rather than quickly: it is a null-safe read feeding a `unique` rule's ignore-id. Miss one and it silently reads null, the ignore falls away, and editing a record without changing its handle starts failing validation against itself — no error at the point of the mistake, one at the far end.

**Why the guard test changed shape.** It used to compare this addon's parameter names against a hand-written list of what other installed packages bind. That list can only ever describe the siblings as they are today; it says nothing about the addon that starts binding `{handle}` next month, which is the case that hurts. The check now runs against the rule instead — every name in `WebhookManagerServiceProvider::routeModelBindings()` must be this addon's own. That is a property of this package, so this package's suite can enforce it without knowing anything about its neighbours, and a fifth binding cannot arrive by default.

Two tests were added and both fail if the rename is reverted. `test_a_sibling_addons_generic_parameter_is_not_swallowed_by_this_addon` registers stand-in routes named `{rule}`, `{template}`, `{webhook}`, `{endpoint}`, `{handle}`, `{id}`, `{slug}` and `{record}` that do nothing but echo their own value, mounts them with `SubstituteBindings`, and asserts each one answers with what it was given. Before the rename four of them answered 404 instead — the LeadHub defect, reproduced from the losing side inside this package's own suite for the first time. `test_every_parameter_this_addon_binds_is_owned_by_this_addon` is the rule itself.

**What deliberately did not change: `{handle}` and `{preset}`.** They are generic, they are shared with marketing and automations, and they are staying. Renaming them would move text without removing any exposure, because they are not bound — nothing resolves them, so nothing can collide. The rule above is what protects them, and the connection is written into the test file so it does not have to be derived again: a package that binds must bind a name of its own, and `handle` is nobody's own. The same argument covers `{id}` in statamic-activity and statamic-notifications. `{delivery}` is likewise unbound; it resolves through Laravel's *implicit* binding, which matches a route parameter to a typed controller argument and is therefore scoped to that single route. Only `Route::bind()` is application-wide, which is why only that array is the subject of the rule.

**Still true, and still not fixable from here:** a collision exists only once two packages are installed together, and a package cannot see its siblings from inside its own suite. The rule turns that from something each addon must know into something each addon can check alone. What the hub still lacks is a check across all installed addons at once; the QA area `route-bindings` exercises the renamed routes there by hand in the meantime.

**Note for the siblings.** `statamic-marketing`, `statamic-automations`, `statamic-activity` and `statamic-notifications` each carry a copy of this guard whose `$boundElsewhere` map names `webhook`, `endpoint`, `rule` and `template` as claimed by this package. Those entries are now false — the names are free — and the maps should be replaced by the rule check above rather than corrected.

## 1.6.2 — 2026-07-28

### Added — the four application-wide route bindings this addon owns are now written down and checked

No defect in this addon, and no route changed. What is added is a record of an exposure this package creates for everything installed next to it, and a check against the reverse.

`bootRouteBindings()` registers `Route::bind()` for `webhook`, `endpoint`, `rule` and `template`, so the CP routes resolve through the repository layer under both storage drivers. That was and remains the right call for this addon. What was never written down is that those bindings are registered on the router, not on this package: they apply to every route with one of those four parameter names in every addon installed alongside, and the losing route does not fail loudly — it resolves an id against a repository here that has never heard of it and returns 404.

`goldnead/statamic-leadhub` 1.8.0 shipped `/scoring/{rule}`. On the production hub, which has both addons, its scoring rule edit and delete were resolved against `RuleRepository` here and 404'd. A button that did nothing and said nothing, through a release. LeadHub renamed its parameter in 1.8.1; nothing in this package had to change, and nothing in this package had told it.

**Why a green suite on either side would not have found it.** Two things have to hold before the failure is observable in an addon's own bed: the other addon has to be installed there, which it never is, and the bed has to mount the CP routes with `SubstituteBindings`, the middleware that applies a binding at all. LeadHub's bed had neither. `tests/CpTestCase.php` here has always had the middleware — it has to, the binders are this addon's own — but nothing named it. Removing it fails 16 of the 168 tests, which sounds like enough of a tripwire until one reads what those sixteen say: they are about secrets, replay and audit trails, and each would report a broken *feature*. None of them would have said "the CP bed no longer applies route bindings", which is the sentence somebody needed. The new `tests/Feature/RouteParameterCollisionTest.php` says exactly that, and it is the case that fails first.

The rest of that file reads this addon's parameter names out of `routes/cp.php` and `routes/inbound.php` — string literals only, so the `/cp/webhook-manager/{slug}/{id}/{action}` example in the comments is not mistaken for three routes — and checks them two ways. The first is exact, against the names *other* packages bind application-wide: `automation` from statamic-automations and the ten CMS entity names from statamic/cms. The second records the generic ones: the four bound here plus `preset` and `handle`, each with its reason, so that a fifth generic name has to be a decision somebody made rather than a default nobody looked at.

**What was deliberately not done.** The four bound names were not renamed to something addon-specific. The URLs would be byte-identical either way, no sibling uses them any more, and the binding names would still have to be claimed under *some* name. The exposure that remains is real and is now stated: any future addon that reaches for `{rule}` or `{template}` loses here, silently. The counterpart of this test file, in that addon, is what catches it — which is why the same file now exists in the siblings.

## 1.6.1 — 2026-07-28

### Added — the suite can finally see MySQL's index rules

The schema in this package was never measured against the engine it runs on. It turns out to be sound, and that is the finding — but it was sound by luck, not by check, and the check is what was missing.

**Why a green suite proves nothing here.** The suite runs on in-memory SQLite. SQLite has no InnoDB key-length limit, no per-character byte cost, and no fixed column widths — it accepts `varchar(255)` and ignores the 255. Every mechanism that rejects an oversized index is a MySQL mechanism, so a migration that MySQL refuses outright passes the suite without a murmur. `statamic-notifications` v1.0.3 shipped exactly that way: a 3212-byte unique that had run hundreds of times locally and died on the production hub with *SQLSTATE 1071*, leaving two tables that never existed there at all. Demonstrated rather than asserted: with a deliberately unbuildable 4080-byte unique added to `webhook_outbounds`, the other **161 tests stayed green** and only the new test failed.

`tests/Unit/IndexKeyLengthTest.php` closes the gap without needing a server. It compiles this package's own migration files through Laravel's MySQL grammar in pretend mode and measures the DDL MySQL would have received. Because this schema is built across eleven migrations — columns arriving by `alter table … add`, nullability changed by `modify`, indexes dropped and rebuilt — the test replays all four statement shapes and measures the schema at the *end* of the run, not the one the create-migrations described. `brand_id`, the whole tenant boundary, arrives that way.

It asserts three things: no index over InnoDB's 3072 bytes; no index over **half** of it, because an index that is under the limit by accident breaks on the next column added to it; and no unique covering a column that may be NULL.

**What the measurement says.** The widest index is **1028 bytes** — 33% of the limit — shared by the four `(brand_id, handle)` uniques and three `(varchar, timestamp)` lookup indexes. Nothing is close to the wall, and every unique covers NOT NULL columns only: `uuid` is `char(36)` and not null, `handle` and `brand_id` are not null since 1.5.0. So the NULL hole that made notifications' contact preferences unconstrained does not exist here.

`phpunit.mysql.xml` runs the identical suite against a real MySQL server (`vendor/bin/phpunit -c phpunit.mysql.xml`, `DB_DRIVER=mysql`), for the run that proves the compiled DDL and the engine agree.

### Fixed — the handle uniqueness check was still global, three releases after the schema stopped being

Found by asking, for every unique in the package, whether it enforces what its name claims — and hitting the answer from the unexpected side. `webhook_*_brand_id_handle_unique` has scoped handles per brand since 1.5.0. The four CP form requests still asked `Rule::unique('webhook_outbounds', 'handle')`, which runs on the raw query builder that no Eloquent scope ever reaches, and is therefore global.

Two consequences, both silent. A brand could not use a handle another brand had taken, although the database would have allowed it and the whole point of 1.5.0 was that it should. And the refusal named the reason: *"The handle has already been taken"* is a statement about rows the asking tenant is not permitted to see.

`Rule::exists('webhook_templates', 'handle')` had the mirror-image problem: unscoped, a webhook could reference another brand's template and pass validation, then resolve to nothing at render time because the model *is* brand-scoped — a reference that validates and never works.

All five rules now carry `->where('brand_id', …)`. Uniqueness inside a brand is unchanged, which is asserted rather than assumed: the same handle is still refused twice within one brand.

### Notes

- No new dependency. The measurement uses Laravel's own schema grammar.
- Suite: **165 passed (720 assertions)**, baseline 157. Vitest unchanged at **8 passed**.

## 1.6.0 — 2026-07-28

### Added — a test level for the Control Panel's Vue code (Vitest)

The package had two test levels and a gap between them. PHPUnit reaches the
route, the FormRequest, the controller and the props it hands over. The hub QA
harness clicks through the finished screen. Neither could execute a line of
the component logic in between — and that is exactly where 1.5.0's two most
embarrassing defects lived:

- **`contentTypeMode()` in `deliveries/Show.vue`** called `.toLowerCase()` on
  `headers['content-type']`, which is PSR-7-shaped: an **array**. The TypeError
  fires during render, so it did not blank one badge — it took the whole
  Response panel with it: status code, duration, headers, body. And only on
  **successful** deliveries, because a failed one carries no response headers
  at all. The panel was missing precisely where one goes looking for it. A
  controller test cannot see this; the props were correct the entire time.
- **`can('test outbound webhooks') ?? can('manage outbound webhooks')`** never
  reached its fallback. `??` fires on `null`, `can()` returns a boolean, so the
  right-hand side was dead code from the day it was written. `??` where `||`
  was meant survives review because the fallback *looks* present.

Both were fixed in 1.5.0 and were until now held only by structural guards —
a regex over the source that catches the shape of the mistake, not the logic.
`vitest` + `@vue/test-utils` + `jsdom` are added as dev dependencies, the
config lives in the existing `vite.config.js` (no second build chain), and
`npm test` runs the suite. Under `VITEST` the Statamic Vite plugin is swapped
for the plain Vue plugin, because the former rewrites `vue` to `window.Vue` —
right for the CP bundle, fatal in a test process. `tests/js/setup.js` installs
the `__STATAMIC__` global the `@statamic/cms/*` shims destructure at import
time, so a test fails on its subject rather than on an import.

The tests mount the real `Show.vue` and assert against the rendered Response
panel, which makes the assertion the thing that actually broke: not "the
helper returns a string" but "the panel is still there". Coverage is
deliberately narrow — component logic, not operating flows. Flows stay with
the QA harness.

The structural guards are **kept**, not replaced. They catch a newly added
component that reintroduces a known-bad pattern, which a component test — able
to test only components that exist — cannot. `OutboundController::canTest()`
additionally gets a unit test that drives the decision with a user answering a
hard `false`, since a test passing `null` would pass against the broken
version too.

Both defects were re-verified by removing the fix and watching the new tests
go red: the header tests fail with
`TypeError: ((intermediate value) ?? "").toLowerCase is not a function`, the
permission test with `Failed asserting that false is true`.

### Notes

- The rest of the addon's Vue sources were reviewed for the same two patterns,
  each candidate traced back to the controller and the model casts that feed
  it. **No further instance.** Every other string-method call is either guarded
  (`(method || '').toUpperCase()`, `Array.isArray(v) ? … : …`) or reads a
  plain `string` column with no `array` cast. Every other `??` sits on a value
  that is `null`, not `''`, when the fallback is wanted — and a good number of
  them (`enabled ?? true`, `stop_on_failure ?? false`, `attempts ?? '—'`)
  are `??` on purpose: a stored `false` or a `0` attempt count must survive,
  and `||` would swallow it. Same operator, opposite intent, which is why this
  needs deciding per site rather than by search-and-replace.
- This addon is the reference implementation; the other addons in the family
  can copy the `test` block, `tests/js/setup.js` and the `test` script as they
  stand.
- Suite: **157 PHPUnit tests (453 assertions)** and **8 Vitest tests**.

## 1.5.0 — 2026-07-27

### Fixed — the HMAC secret never reached the database (security)

- **A secret entered in the CP was silently discarded.** `SaveOutboundWebhookRequest::rules()` did not list `auth_config_json`, and `store()`/`update()` persist `$request->validated()` — so the value was dropped between the browser and the model. The hook was saved with `auth_type = hmac` and an **empty** `auth_config`, `HmacSignatureVerifier::sign()` returned the request untouched, and the delivery went out **unsigned** while the CP displayed "HMAC signature". No error anywhere.
- **Secret rotation was a no-op that reported success.** Same cause on the update path: "Webhook updated.", database unchanged, receiver kept verifying against the old secret.
- The identical omission existed in `SaveInboundEndpointRequest` and is fixed with it. An inbound endpoint saved with a scheme but without credentials is rejected by its own verifier, so this was a lockout rather than a leak — but the same one-line cause.
- An auth type other than `none` without any credentials is now a validation error instead of a silently unauthenticated request, and unparsable auth JSON is reported instead of thrown away. Switching a hook back to `none` clears the stored credentials rather than leaving them encrypted in the row.

### Added — the secret audit trail is actually written

`webhook_secret_audits` shipped with a migration, a table and an `AuditLogger` that had **zero call sites**: creating or rotating a secret left no trace at all. It is now wired into the outbound and inbound create/update actions (so presets and programmatic changes are covered too) and records `created` / `rotated` / `removed` with actor, timestamp, auth scheme and the config **key names**. The secret itself is never written — `AuditLogger` strips credential-looking context keys before the insert as a last line of defence. Rows carry the `brand_id` of the webhook they describe. A save that does not touch the credentials writes nothing.

### Added — `test outbound webhooks` permission

The ability was referenced by the CP but never registered, and an unregistered ability answers `false` for everyone, super users included. It is now registered and the "Test" button is visible to holders of either it or `manage outbound webhooks`. `TestOutboundController` enforces the same rule.

### Fixed — Control Panel

- **The Response panel crashed on successful deliveries.** `contentTypeMode()` called `.toLowerCase()` on `headers['content-type']`, which is PSR-7-shaped: an **array**. The TypeError blanked status code, duration, response headers and body — and only on successes, because failed deliveries have no response headers. The panel was missing exactly where one looks. Header lookup is now case-insensitive and flattens array values.
- **The Replay button dropped the user on a 404.** The POST ran fine (200, attempt counter up), but the controller answered with bare JSON, which Inertia cannot consume — it fell back to a hard navigation to the same URL, a GET against a POST-only route. The success alert never appeared, which invites a duplicate replay of a delivery that already went out. The button now posts via axios and reports the real result; the endpoint answers a redirect to Inertia requests and JSON to everyone else.
- **The "Test" entry in the outbound list was a link to a POST route** — a guaranteed 404 that never sent anything. It fires a real request now and reports HTTP status and duration inline.
- **The list kept showing "Active" after "Disable".** `<Listing>` holds its own copy of the rows, so an Inertia prop reload never reached it; the row now follows the toggle immediately.
- **The delivery detail view shows what it is for.** Trigger, correlation ID, attempt count and duration have their own fields instead of hiding in the raw request-header JSON or behind an error-only `v-if`, and the cURL command the controller had always computed is finally rendered, with a copy button.

### Notes

- Found in the hub QA run; each item is reproduced by a feature test against the real route → FormRequest → controller path, which is where the secret was lost — a model- or action-level test cannot see it at all. The signature fix is additionally proven on the wire: the header the HTTP client really sent is recomputed against the secret.
- Every touched query or ability got a cross-brand test.
- Suite: **153 passed (448 assertions)**.

## 1.4.1 — 2026-07-27

### Fixed — the 1.4.0 wiring only covered parameter-less commands

All three commands imported the trait but never called it: their `handle()` methods take injected services, and the transformation that added the call only matched signatures without parameters. The result looked like a fix and was none — the commands still reported success while seeing nothing. Now wrapped properly, dependencies forwarded.

## 1.4.0 — 2026-07-27

### Fixed — scheduled commands did nothing under multi-brand and reported success

- **`replay-failed` never replayed anything.** A scheduled run has no session and therefore no brand; the fail-closed scope hid every row, so the command reported "Replayed 0" while eight failed deliveries sat waiting. The cron-based retry was effectively dead. `health` reported zeroes for the same reason, and `prune` deleted nothing.
- All three now iterate the brands via `RunsForEachBrand` from `goldnead/statamic-brand-context` ^1.3, and each accepts `--brand=<handle|id>`. Single-brand installs are unaffected.

### Notes

- Found in the hub QA run, where the CP showed deliveries the commands insisted did not exist.
- Suite: **123 passed (337 assertions)**.

All notable changes to `goldnead/statamic-webhook-manager` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] — 2026-07-02

### Fixed

- Inbound endpoint route (`!/webhooks/inbound/{handle}`) now excludes the CSRF
  middleware. It runs in the `web` middleware group, so real external webhook
  deliveries (which never carry a CSRF token) were rejected with a 419.
  Endpoint authentication is unaffected and still enforced by the configured
  verifier (HMAC, static header, bearer, ...).

## [1.0.0] — 2026-06-30 — Marketplace launch

First stable release. Completes the post-MVP feature set that positions the
addon for the Statamic marketplace, and makes it installable and verifiable
on a current Statamic 6 install (Laravel 13).

### Added

#### Integrations & Insights

- **Integration presets** — a guided "pick a destination → fill a URL → done"
  flow that builds a fully-configured outbound webhook from a recipe, so users
  never hand-write a payload template. Ships **Slack, Discord, Microsoft Teams,
  Zapier, Make, n8n and Generic JSON**, with a native gallery and setup form.
- **"Send webhook" entry action** — a native CP action that fires a chosen
  enabled outbound webhook for the selected entries through the same delivery
  pipeline as automatic triggers.
- **Failure alerting & circuit breaker** — throttled email + Slack alerts when
  a delivery fails after all retries, and automatic disabling of a hook after
  N consecutive terminal failures (`consecutive_failures`, configurable
  threshold). Surfaced as native "Circuit breaker" / "Failure alerts" sections
  on the Settings screen.
- **Insights dashboard** — delivery volume, success-rate trend, latency
  percentiles (p50/p95/p99), error breakdown and top-failing endpoints, with
  day-range and per-webhook filters. Self-contained charts (no charting
  dependency) using the CP's own Tailwind tokens.

#### Storage

- **Flat-file (YAML) storage driver** — webhook *configuration* (outbound,
  inbound, rules, templates) can live as human-readable, git-versionable YAML
  under `content/webhooks/` instead of database tables. Delivery records and
  logs always stay in the database. Records keep a stable integer id so the
  delivery/log history resolves under either driver.
- **`webhook-manager:storage:migrate`** — copies config between the `eloquent`
  and `flat` drivers id-for-id (with `--dry-run`).
- **Control-Panel storage switch** (Settings → Storage) — shows the active
  driver and record counts, and switches drivers (migrate + activate) without
  any `.env`/shell access.

#### Tooling

- **Persistent local playground** (`scripts/setup-playground.sh`): a fresh
  Statamic 6 site with the addon wired in as a Composer path repo, SQLite, a
  CP super-user and seeded sample records (outbound webhook, inbound endpoint,
  payload template) plus a `pages` collection so `entry.*` triggers fire.
- **End-to-end smoke test** (`scripts/smoke-test.sh`): installs a throwaway
  Statamic project, renders a payload template and delivers it to a local
  receiver through the real `DeliveryEngine`, asserting the `Delivery` is
  recorded as a success.
- **CI workflow** (`.github/workflows/tests.yml`): PHP 8.2/8.3/8.4 × Statamic 6.
- `composer test` script; `support` block and author email in `composer.json`.
- `MARKETPLACE.md` listing copy.
- Brand logo asset (`art/logo.svg`) for the marketplace listing.

### Fixed

- **Install failed on a fresh Statamic 6 project (Laravel 13).** The Statamic 6
  skeleton now ships Laravel 13, but `orchestra/testbench` was capped at
  `^9|^10` (Laravel 12), so `composer require --dev`/`composer update` could not
  resolve against a Laravel 13 host. Widened to `^9|^10|^11` (testbench 11 =
  Laravel 13) and `phpunit/phpunit` to `^10.5|^11|^12`.

### Changed

- **Feature toggles are now enforced in the CP navigation.** Disabling
  `inbound`, `rules`, `templates`, `debug_tools` (or `outbound`) in
  `config/webhook-manager.php` hides that module's sidebar entry; previously
  the toggles were only surfaced on the Settings screen.
- Documentation accuracy: README status line, config comments and several
  model/request docblocks described inbound, rules and templates as "stubs"
  / "no-op" / "returns 501" — these modules are in fact fully implemented and
  test-covered. Updated the copy to match the shipping behaviour.
- `.devcontainer/post-create.sh` now delegates to `scripts/setup-playground.sh`.

### Removed

- Dead `Jobs/DispatchRuleActionsJob` placeholder (empty `handle()`, never
  dispatched — the rule engine runs synchronously via `RuleEngine`).

## [0.6.0] — Polish: visual condition builder + failure classification

Two PRD §29 / §54 polish items that were left as TODO REVIEW during
the v0.3 → v0.5 functional rollout:

### Added

- **Visual condition builder for rules.** Two new Vue components,
  `components/rules/ConditionRow.vue` (single field/op/value leaf) and
  `components/rules/ConditionGroup.vue` (recursive AND/OR group with
  arbitrary nesting). The Rules edit screen now defaults to the
  builder; a Builder/JSON toggle keeps the raw textarea around for
  power users who want to paste a tree from another rule. Switching
  modes round-trips through the same JSON shape the
  `ConditionEvaluator` accepts, so no transform layer was added
  between the UI and the engine.
- **Failure classification for rule actions.** New
  `FailureClassifier::classifyException(Throwable): string` maps caught
  throws to the eight PRD §12.5 categories (network / timeout / auth /
  client / server / payload / configuration / internal). Recognised:
  `InvalidArgumentException`, `TypeError`, `ValueError`,
  `JsonException`, `Illuminate\Validation\ValidationException` →
  `payload`; `QueryException`, `ModelNotFoundException`,
  `BindingResolutionException` → `configuration`;
  Auth/Authorisation exceptions → `auth`; HTTP client connection /
  request exceptions → `network`. Everything else falls back to
  `internal`.
- **`error_type` surfaced in rule execution metadata.**
  `ActionExecutor` now classifies caught exceptions via the new
  classifier method and tags failed `ExecutionResult.data` with
  `{ handle, error_type, exception }`. Clean `ExecutionResult::fail()`
  returns from a handler that didn't tag `error_type` itself default
  to `payload` (the canonical "missing required config field" path).
  `RuleEngine::evaluateOne` lifts `error_type` and `handle` to the top
  of each per-action entry in `ExecutionResult.data['actions']` so the
  CP test panel can render them as distinct badges.
- **Dangling library template handles are no longer silent.**
  `HttpRequestFactory::buildBody` now writes a structured
  `SystemLogger::warning('configuration_error_dangling_template', …)`
  entry whenever an outbound hook's `payload_template_handle`
  references a non-existent or empty template. Delivery still
  proceeds against the inline-or-default fallback so a misconfigured
  hook doesn't drop traffic, but operators reviewing the CP logs see
  exactly which hook references which missing template.

### Changed

- `Rules\ActionExecutor` constructor takes the `FailureClassifier` as
  a second dependency. The container injects automatically; this is a
  backwards-compatible change for external callers (no public surface
  changes).
- `Services\Http\HttpRequestFactory` constructor takes the
  `Services\Logging\SystemLogger` as a fourth dependency for the
  configuration-error log emission. Same: container-injected, no
  public surface changes.

### Tests

- `tests/Unit/Services/FailureClassifierTest.php` extended with six
  new cases for `classifyException`: `InvalidArgumentException`,
  `TypeError`, `ValueError`, `JsonException`, default `RuntimeException`
  / `LogicException` → `internal`.
- `tests/Unit/Rules/RuleEngineTest.php` extended: unknown-handle path
  asserts `error_type = configuration` and the resolved handle echoes
  back; clean-fail handler path (`create_entry` with no `collection`)
  asserts `error_type = payload` and `handle = create_entry`.
- `tests/Feature/OutboundUsesLibraryTemplateTest.php` extended with
  a dangling-template assertion that checks the new
  `configuration_error_dangling_template` log row is written with the
  right level/context/error_type.

### TODO: REVIEW (still)

- Per-handler form generators in the Rules action list (it's still a
  JSON array — the visual builder is conditions-only). Reasonable v2
  candidate once handler-config schemas are formalised.
- The `error_type` is shown in the rule test panel but is not yet
  surfaced as a filter on the Logs / Deliveries listings. Filter UI is
  cheap to add once we know which categories operators actually
  filter by.

## [0.5.0] — Templates CRUD + outbound library reuse

Templates move from "renderer is usable but UI is a placeholder" to a
fully editable library. Outbound webhooks can now reference a template
by handle, so the same body lives in one place and updates propagate
to every hook that uses it.

### Added

- **CRUD domain actions** for templates: `Create`, `Update`, `Delete`.
  `Delete` detaches outbound webhooks that reference the template by
  handle so removing a library entry never silently disables a hook —
  the success notice surfaces the detach count to the operator.
- **`TemplateRepository`** gains `paginate(int, ?string $search, ?string $type)`,
  `find()`, `findByUuid()` to mirror the Outbound / Inbound / Rule
  repository surfaces.
- **`Cp\TemplateController`** grows from listing-only to full CRUD
  (`index/create/store/edit/update/destroy`). Index supports search +
  type filter; edit screen lists the registered variable resolver
  namespaces inline so authors discover them without leaving the page.
- **Vue pages.**
  - `pages/templates/Index.vue` — real list with search, type filter,
    and per-row edit links.
  - `pages/templates/Edit.vue` (new) — sectioned form (Identity / Body)
    plus a Preview panel that posts the current body to
    `actions.preview-template` and renders the result alongside any
    validation issues.
- **Outbound library reuse.** New nullable column
  `payload_template_handle` on `webhook_outbounds`. When set, the
  `HttpRequestFactory` resolves the body from the referenced template
  instead of the inline `payload_template`. The body source is selected
  via a new "Inline template / Library template" radio in the
  Outbound edit panel.
- **Tests.**
  - `tests/Feature/TemplateCrudTest.php` — Create / Update / Delete
    actions, default-handle slugification, detach behaviour on delete.
  - `tests/Feature/OutboundUsesLibraryTemplateTest.php` — body source
    precedence (library → inline → JSON event), missing-template fallback
    to inline, template-edit propagation to subsequent renders.
- **i18n.** `template_*` notices for CRUD success messages plus a
  detach-count variant for the delete flow.
- **Routes.** `routes/cp.php` adds the templates CRUD routes (the
  `actions.preview-template` route already existed).

### Changed

- **`HttpRequestFactory`** now takes the `TemplateRepository` as a third
  constructor dependency and resolves the body in this order:
  `payload_template_handle` → `payload_template` → JSON-encoded
  TriggerEvent. The library handle wins when both are set so an operator
  can promote an inline body to a library entry without having to also
  clear the inline field on every hook.
- **`SaveOutboundWebhookRequest`** allows `payload_template_handle`
  (nullable, must exist in `webhook_templates.handle`) and skips inline-body
  validation when the hook delegates to a library template — that body
  is validated on the Template edit screen instead.

### TODO: REVIEW

- A dangling `payload_template_handle` (where the referenced template
  was removed by a path that bypasses `DeleteTemplateAction`) silently
  falls back to the inline body. This keeps deliveries alive but hides
  the misconfiguration; classify as a configuration failure once the
  centralised observer mentioned in PRD §54 lands.
- The Edit screen's preview always uses `source_type=entry`. Future
  iteration: surface the four supported source types (entry / form /
  user / asset) so a notification template author can preview against
  the right resolver.

## [0.4.0] — Rule engine

The rule engine moves from no-op stub to fully functional. Rules can
now compose triggers with `When → If → Then` semantics: a trigger
fires, the condition tree is evaluated, and a configurable list of
actions executes (with optional stop-on-failure).

### Added

- **Nine built-in rule actions** under `src/Actions/`, all implementing
  `ActionInterface`:
  - `send_outbound_webhook` — fire an existing outbound webhook by handle
  - `create_entry` / `update_entry` — Statamic entries via `Statamic\Facades\Entry`
  - `create_form_submission` — `Statamic\Facades\Form` submission
  - `dispatch_event` — generic Laravel event dispatch (FQCN or string)
  - `send_email` — `Mail::raw` notification
  - `send_slack_webhook` — `Http::post` to Slack/Discord-compatible webhook URLs
  - `set_field_value` — single-field entry update with literal or path-sourced value
  - `write_log_note` — structured `SystemLogger` entry
- **`RuleEngine`** is no longer a stub. Loads `RuleRepository::activeForTrigger`,
  evaluates each rule's condition tree via `ConditionEvaluator`, runs
  the action chain via `ActionExecutor` and aggregates per-rule results
  into `ExecutionResult`s with structured action breakdowns. The engine
  also exposes `evaluateOne()` so the CP "Test rule" path can run a
  single rule against a synthetic context.
- **`Domain\OutboundWebhook\Actions\DispatchOutboundWebhookAction`** — extracted
  the snapshot+queue/sync logic that was private to `TriggerDispatcher`
  so the new `SendOutboundWebhookAction` re-uses the same code path.
- **Five domain actions** for rule CRUD: `Create`, `Update`, `Delete`,
  `Toggle`, `Test`.
- **Repository.** `RuleRepository::paginate(int, ?string)`, `find()`,
  `findByUuid()` to mirror `OutboundWebhookRepository` / `InboundEndpointRepository`.
- **CP CRUD.** `Cp\RuleController` grows from listing-only to full
  CRUD (`index/create/store/edit/update/destroy/toggle`).
  `Cp\Actions\TestRuleController` powers the in-page Test panel.
- **Routes.** `routes/cp.php` adds the rules CRUD routes;
  `routes/actions.php` adds `actions.test-rule`.
- **i18n.** `rule_*` notices for CRUD success messages and
  `errors.rule_*` for execution failures.
- **Vue pages.** `pages/rules/Index.vue` is a real list view (search,
  status badges, action count, order index).
  `Edit.vue` ships as a sectioned form (Identity / Trigger /
  Conditions / Actions / Test) with a JSON editor for the condition
  tree and the action list, plus a Test panel that runs a single
  rule against a sample payload and shows the per-action outcome.
- **`ActionRegistry::registerDefaults()`** — built-in actions are
  resolved through the container so dependencies (repositories,
  `DispatchOutboundWebhookAction`, `SystemLogger`) are wired
  automatically.
- **Tests.**
  - `tests/Unit/Rules/ConditionEvaluatorTest.php` — leaf operators,
    AND/OR groups, nested groups, in/not_in, contains/exists/empty,
    numeric comparisons, regex, the `site/locale/trigger/replay`
    field shortcuts.
  - `tests/Unit/Rules/RuleEngineTest.php` — disabled rules, failing
    conditions, ordered action execution, unknown-handle failure,
    stop-on-failure short-circuit.
  - `tests/Feature/RuleExecutesMultipleActionsTest.php` — full
    `TriggerDispatcher → RuleEngine` path with the `write_log_note`
    handler. Asserts ordering, trigger filtering, stop-on-failure,
    and `order_index` ordering.

### Changed

- `Services\TriggerDispatcher` no longer holds the snapshot+dispatch
  logic itself — it delegates to `DispatchOutboundWebhookAction`.
  Rules now evaluate **before** direct outbound resolution, so
  rules can dispatch additional outbound webhooks via
  `send_outbound_webhook` if needed. Direct-attached hooks are
  unaffected (PRD §39 REVIEW: hooks remain a separate dispatch path
  rather than a special-case rule).
- `WebhookManagerServiceProvider::bootRegistries()` now calls
  `ActionRegistry::registerDefaults()`.

### Removed

- `messages.errors.rule_engine_not_implemented` translation key — the
  engine is implemented; specific error keys
  (`rule_unknown_action`, `rule_invalid_conditions`) replace it.

### TODO: REVIEW

- The condition / action editors are JSON-first (PRD §29 explicitly
  allows this). A visual condition builder and a per-action form
  generator remain v2 candidates.
- Rule actions that touch Statamic facades (`create_entry`,
  `update_entry`, `set_field_value`, `create_form_submission`)
  catch and surface throws but do not classify them. v2: feed into
  the same `FailureClassifier` the delivery engine uses.
- `SendEmailAction` ships text-only. Once the template module has a
  rendering API on the public surface, accept a template handle
  instead of pre-rendered body.

## [0.3.0] — Inbound endpoints

The inbound module is now fully wired through. The public-facing
`InboundWebhookController` no longer returns 501 — incoming requests
flow through `auth → parse → replay → map → action → response` and
the action layer ships with seven built-in handlers covering the
common Statamic content sinks plus a generic event/audit-log path.

### Added

- **Inbound action layer.** New `InboundActionHandlerInterface` registry
  and seven built-in handlers under `Domain\InboundEndpoint\Handlers\`:
  `noop`, `create_entry`, `update_entry`, `upsert_entry`,
  `create_form_submission`, `dispatch_event`, `audit_log`.
- **Inbound request processor.** `Services\Inbound\InboundRequestProcessor`
  orchestrates the full pipeline (method allowlist → payload size →
  auth → content-type parse → replay protection → mapping →
  action dispatch → response builder) with structured `SystemLogger`
  entries on every failure.
- **Inbound action dispatcher.** `Services\Inbound\InboundActionDispatcher`
  resolves the configured `action_type` against the handler registry,
  catches handler exceptions, and returns a uniform
  `{ok, message, data}` shape.
- **Inbound domain actions:** `Create`, `Update`, `Delete`, `Toggle`,
  `Test` for endpoint CRUD; `Test` runs the mapping + action layer
  against a sample payload, bypassing HTTP auth and replay protection.
- **CP CRUD for inbound endpoints.** `Cp\InboundController` now
  exposes `index/create/store/edit/update/destroy/toggle`.
  `Cp\Actions\TestInboundController` powers the in-page test panel.
- **Vue pages.** `resources/js/pages/inbound/Index.vue` is now a real
  list view with search, status badges and a create button.
  `Edit.vue` ships as a sectioned form (Identity / Endpoint / Auth /
  Mapping / Action / Response) plus a Test panel that previews the
  mapped payload and the action result inline.
- **Public extension API.** `WebhookManager::registerInboundActionHandler()`
  for third parties to ship custom handlers.
- **Routes.** `routes/cp.php` extended with the inbound CRUD routes;
  `routes/actions.php` adds `actions.test-inbound`.
- **Repository.** `InboundEndpointRepository::paginate(int, ?string)`,
  `find()`, `findByUuid()` for the CP listing and lookups.
- **i18n.** `endpoint_*` messages for CRUD success notices and
  `inbound_*` error messages for pipeline failures.
- **Tests.**
  - `tests/Unit/Mappers/MappingEngineTest.php` — dot notation, array
    indices, defaults, required errors, transforms, type coercion.
  - `tests/Feature/InboundEndpointDispatchesActionTest.php` — full
    pipeline with `audit_log` action, plus 404/405/422 paths.
  - `tests/Feature/InboundEndpointRejectsInvalidSignatureTest.php` —
    HMAC valid/invalid/missing, plus static-header rejection.

### Changed

- `InboundWebhookController` is now thin — endpoint resolution stays in
  the controller, the rest delegates to `InboundRequestProcessor`.
- `InboundActionDispatcher` is no longer a stub; it dispatches via the
  new handler registry and uniformly logs failures.
- `WebhookManagerServiceProvider` binds the
  `InboundActionHandlerRegistry` singleton, registers built-in handlers
  on boot, and registers the `ReplayProtectionService` with the cache
  store + configurable TTL.

### Removed

- `messages.errors.inbound_not_implemented` translation key — the
  pipeline is implemented; specific error keys
  (`inbound_unauthorized`, `inbound_method_not_allowed`,
  `inbound_payload_too_large`, …) replace it.

### TODO: REVIEW

- `create_entry` / `update_entry` / `upsert_entry` handlers leave slug
  collision handling to Statamic (PRD §23). A v2 candidate is to
  classify the failure and surface a richer response.
- The mapping editor in the CP is JSON-first (PRD §43 explicitly
  allows this for v1). A visual mapping builder remains a v2
  candidate.
- Per-endpoint rate limiting is configurable in the schema
  (`rate_limit_config`) but not yet enforced — pending the rules
  iteration which shares the limiter.

## [0.2.0] — Statamic 6 / Inertia + Vue migration

### Changed (breaking)

- **Statamic 6 only.** `composer.json` now requires `statamic/cms: ^6.0` (previously `^5.0`). Statamic 6 ships an Inertia.js + Vue 3 SPA Control Panel; classical Blade CP views no longer fit nicely.
- **CP rendering moved from Blade to Vue.** All CP controllers return `Inertia::render('webhook-manager::Page/Name', $props)` instead of `view(...)`.
- **Build step required.** The addon now ships a Vite configuration and a built JS/CSS bundle under `resources/dist/`. End users do not need to build — the bundle is committed/shipped. Contributors run `npm install && npm run build` in the addon folder.

### Added

- `vite.config.js`, `package.json` and `resources/js/cp.js` entry point that registers each Vue page with Statamic's Inertia resolver via `Statamic.$inertia.register('webhook-manager::Page/Name', PageComponent)`.
- 11 Vue pages built with the Statamic `@ui` component library (`<ui-header>`, `<ui-panel>`, `<ui-listing>`, `<ui-field>`, `<ui-button>`, `<ui-badge>`, `<ui-confirmation-modal>`, …):
  - **Overview** dashboard with stats panels and recent failures table.
  - **Outbound** index (search + status badges) and edit screen (`useForm` from `@inertiajs/vue3`, sectioned panels, test button, delete confirm modal).
  - **Deliveries** index (status/trigger/error filters) and detail (request/response snapshots, replay, copy as cURL).
  - **Logs** index with level/type/correlation filters.
  - **Settings** read-only config view.
  - **Debug** page with trigger registry list and live template preview.
  - **Inbound**, **Rules**, **Templates** stub pages with `<ui-alert>` "coming next" notices.
- `$vite` property on `WebhookManagerServiceProvider` so the CP loads the addon's bundle.
- `inertiajs/inertia-laravel` runtime dependency.

### Removed

- `resources/views/cp/**` — all Blade CP views deleted.
- `resources/views/partials/**` — Blade `<x-…/>` components deleted.
- `resources/css/webhook-manager.css` — replaced by `resources/css/cp.css`.
- `loadViewsFrom()` call for the CP namespace (translations are still loaded).

### Unchanged

- All migrations, domain models, repositories, services, queue jobs, console commands, tests.
- Auth verifiers, template renderer, mapping engine, condition evaluator.
- Routes (`routes/cp.php`, `routes/actions.php`, `routes/inbound.php`).
- FormRequests and validation rules.
- Permissions / RBAC structure.
- Public extension API (`Goldnead\WebhookManager\Facades\WebhookManager`).

## [0.1.0] — initial Statamic 5 release

### Added

- Initial addon scaffold, service provider, config and CP navigation.
- Database migrations for outbound webhooks, inbound endpoints, rules, deliveries, logs, templates and secret audits.
- Domain models, repositories and contracts.
- Trigger registry with built-in triggers (entry saved/published/unpublished/deleted, form submitted, user saved, asset saved).
- Outbound webhook CRUD with form-request validation.
- Auth verifiers (none, static header, bearer, basic, HMAC SHA256) with a `SecretMasker` and signature generator.
- Token-based template renderer (`&#123;&#123; namespace:key }}`) with variable resolver registry.
- Delivery engine: builder, HTTP client wrapper, success evaluator, failure classifier, retry planner and masking service.
- Queue jobs for outbound delivery, replay and pruning.
- Blade CP screens (replaced in 0.2.0).
- Console commands: prune, replay-failed, health, seed-examples.
- Permissions for granular RBAC.
- Unit tests for HMAC verification, failure classifier, retry planner, template renderer.
- Feature tests for outbound delivery, failure logging, replay flow and permission masking.

### Marked `TODO: REVIEW`

- Inbound endpoint controller returns `501 Not Implemented` until the full inbound flow ships.
- `RuleEngine::evaluate()` is a no-op — full rule evaluation pending.
- `MappingEngine` is a passthrough — JSON-based advanced config pending UI design.
- Template UI in CP shows a placeholder; the renderer itself is fully usable from outbound payloads.
