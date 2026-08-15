---
title: Suppression changelog
editLink: false
---

# Changelog

<AddonHeader slug="suppression" />

Release notes for `goldnead/statamic-suppression`, as published with the package.

Cross-version upgrade notes for the whole suite are in
[Upgrading](/guide/upgrading).

## 1.1.0 — 2026-08-01
### Major changes

- **Laravel 11 is no longer declared.** `require.laravel/framework` narrows from
  `^11.0|^12.0|^13.0` to `^12.0|^13.0`. Formally a narrowing; in practice a no-op, because every
  11.x release carries an unpatched security advisory and Composer refuses the line, and because
  `statamic/cms` — pulled in transitively by `statamic-brand-context` — requires `^12.40` anyway.
  The old constraint promised a combination nobody could install. `orchestra/testbench` narrows to
  `^10.0|^11.0` to match.

### What's fixed

- `suppression:suppress` no longer fatals when `suppress()` answers null. The null is documented and
  reachable — a redelivered provider event whose suppression row is not visible in the scope the
  reason resolves to — and the command dereferenced it without checking.
- The transactional-rollback test broke the audit write with `Schema::drop()`. Under
  `RefreshDatabase` on MySQL that implicitly commits the surrounding test transaction, so the
  guarantee the test exists to prove could not hold and the failure surfaced as a bare
  `PDOException`. It now fails the insert from inside, and passes on both engines. This is the first
  finding produced by actually running `phpunit.mysql.xml`.

### What's new

- **CI covers the range `composer.json` promises**: PHP 8.2–8.4 × Laravel 12/13 ×
  `prefer-lowest|prefer-stable`, plus a MySQL leg that runs `phpunit.mysql.xml` against InnoDB —
  the file has existed since 1.0.0 and no workflow had ever run it.
- **Pint** (`pint.json`, Laravel preset) and **PHPStan + Larastan at level 5** (`phpstan.neon`),
  both checked in CI. The baseline is empty and should stay that way.
- `@property` blocks on both models, documenting the schema as the public surface it is.
- `.gitattributes`, so tests and CI config stop shipping into every consumer's `vendor/`.
- `SECURITY.md`, and README sections for requirements, the publish tags, personal data, the support
  policy, and why there is no Control Panel screen.
- `extra.statamic` gains `slug`, `url`, `developer` and `developer-url`, so the CP addon card has a
  developer link.

## 1.0.0 — 2026-07-30

### Added — one answer to "may we send to this address at all?"

Until now that question had three answers in one addon and none in the others.
`StartCampaignJob::contactOptedOut()` asked it one way and failed closed;
`SubscriptionPreferences::contactIsSuppressed()` asked it another way and did not; the confirmation
mail and the test send did not ask at all. Meanwhile `statamic-notifications` sent immediate mail and
weekly digests to the same mailboxes and had no way to ask.

- **Two tables.** `suppressions` holds current state and answers the gate question.
  `suppression_events` is an append-only log that makes the state defensible and makes thresholds
  possible. Neither carries an addon prefix: this package belongs to no addon.
- **`SuppressionService`** — `suppress()`, `release()`, `releaseComplaint()`, `recordSoftBounce()`,
  `recordDelivery()`, `find()`, `historyFor()`.
- **`Contracts\Gate`** with `isSuppressed()` and `suppressedAmong()`, bound to `Gate\DatabaseGate`.
  Consumers depend on the contract, so a host can put a cache or a shared blocklist behind it without
  touching a send path — as long as the replacement keeps the promise the contract spells out.
- **Two console commands**, `suppression:suppress` and `suppression:release`, under the same
  invariants as the programmatic paths.

### Added — the reason this is a package and not a folder in `statamic-marketing`

**A hard bounce is a property of the mailbox, not of the relationship.** That is the sentence the
whole global/brand split rests on, and it is also the sentence that decides where the code lives.

If the layer sat inside the marketing addon, whether an address was blocked would depend on which
addon happened to be sending. A dead mailbox that marketing refuses to touch would still receive
notification mail and a weekly digest, from the same application, damaging the same sending
reputation — and the argument used to justify making hard bounces global would have been abandoned in
the same breath it was made. So it sits underneath, beside `statamic-brand-context` and
`statamic-identity-contracts`, which exist for the same reason: several addons need one promise.

What stayed in marketing: the ESP ingress (provider normalisation, signature verification) and the
Control Panel. Those have exactly one feeder today and no second consumer to serve, so moving them
would have bought nothing and cost a dependency.

### Added — the split, in config rather than in a migration

Deliverability facts are global (`brand_id = 0`): `hard_bounce`, `invalid_email`,
`soft_bounce_threshold`, `provider_import`. Consent facts are brand-scoped: `complaint`, `manual`.

The reasoning is not symmetry, it is what kind of fact each one is. A hard bounce will bounce
identically from every brand, and scoping it per brand guarantees that brand B re-learns, at the cost
of a sending reputation both share, something brand A already knows. A complaint is the recipient
objecting to *this* sender; making it global would contradict the consent-bleed decision the
subscription schema already carries.

`brand_id` is stored explicitly on every row and `0` simply means "every brand", so reversing this
costs a config change and not a migration. That is asserted rather than asserted-about:
`CrossBrandTest` flips `suppression.scopes.complaint` to `global` and watches a complaint cross a
brand boundary.

### Added — the gate falls closed, and says so in the contract

An implementation may answer true, may answer false, or may throw `SuppressionCheckFailed`. What it
may never do is answer false because something went wrong. "The query failed" and "nobody is
suppressed" are not the same statement, and treating them as one turns a database hiccup into a send
to every complainant on the list.

This is deliberately the opposite of a segment resolver, which is right to fall open — a segment
narrows an audience and never grants consent. The two rules look inconsistent side by side and are
not, so the distinction is written into `Contracts\Gate` rather than left to be rediscovered. It is
the kind of asymmetry that gets "harmonised" by somebody tidying up.

### Added — a complaint release that is provable rather than impossible

The ordinary `release()` refuses `reason = complaint`, unchanged by anything below: a stray click on
a filtered list must never lift the one block with regulatory weight.

Beside it, `releaseComplaint()` requires three things and refuses without them — **who** (the
authenticated identifier, from the request or the console, never from a form field), **when** (the
server clock), **why** (a stated reason clearing a configured minimum length, so that "ok" does not
satisfy the rule). The state change and the audit event share one transaction: a release that cannot
be logged does not happen. `ComplaintReleaseTest` proves that by dropping the log table mid-flight and
requiring `released_at` to stay `NULL`.

Re-suppression never edits the release away. The history has to read "blocked → released by X on D
because R → blocked again" in full, so `SuppressionEvent` refuses updates and deletes outright.

### Added — two uniques that pull in opposite directions, both about NULL

A unique index does not bind NULL. That is a trap in one place and the mechanism in the other, and an
implementation that has either backwards looks healthy right up until production.

- **`brand_id` is NOT NULL with a default of 0.** Expressing "global" as NULL — the obvious choice —
  would mean two global rows for the same address are both accepted, and the table would quietly grow
  duplicates of the one fact it exists to state once.
- **`dedupe_key` is nullable and unique on purpose.** Provider events carry a key so redelivery is
  harmless; manual actions carry none, so a second legitimate release of the same address is not
  swallowed as a duplicate of the first.

`NullableUniqueTest` writes the row in each case and requires the database to accept or refuse it.
Nothing checks an index name — an index can exist over the wrong columns, over a nullable column, or
not bite at all, and only the write settles it.

### Notes

- Suite: **45 passed (163 assertions)** on SQLite. `phpunit.mysql.xml` runs the identical suite
  against a real server, which matters more here than in most siblings because two guarantees are
  index behaviours SQLite cannot express.
- `tests/Migrations/` runs the migrations against tables that already hold rows, seeding a fresh
  generation between each file. Both migrations are guarded with `hasTable`, so a host that published
  them once meets a no-op rather than an abort — a gate whose migration dies halfway leaves an
  application with no gate at all, which is worse than never installing one.
- `tests/Unit/IndexKeyLengthTest.php` compiles the migrations through Laravel's MySQL grammar in
  pretend mode and measures the DDL InnoDB would receive. It is what decided `dedupe_key` to be a
  `varchar(64)` for a 40-character sha1 rather than the default 255.
- No CP surface, no routes, no views. This package answers a question; it does not render one.
