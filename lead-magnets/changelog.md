---
title: Lead Magnets changelog
editLink: false
---

# Changelog

<AddonHeader slug="lead-magnets" />

Release notes for `goldnead/statamic-lead-magnets`, as published with the package.

::: warning Nothing is released yet
The repository has **no git tag** and the package is not on Packagist. Everything below sits under
`[Unreleased]`.

Composer cannot install this addon from a version constraint until a first version is tagged
**and** the release workflow succeeds on that tag. The second half matters: the Control Panel
bundle is not committed, so a tag published without that workflow installs with no CP assets and
no error.
:::

Cross-version upgrade notes for the whole suite are in [Upgrading](/guide/upgrading).

## Unreleased

### Added

- **Gated resources in the Control Panel**: file or link, with double opt-in switchable per
  resource.
- **Public request endpoint** with a honeypot, a throttle and address normalisation.
- **Confirm-first grant state** (`pending` to `active`), activated by a conditional `UPDATE` so a
  repeated confirmation activates and delivers exactly once.
- **Signed, time-boxed download links**, capped by the grant's own lifetime and by an optional
  download limit.
- **Download audit**: one row per redemption, with a hashed client address.
- **Domain events** `ResourceRequested`, `ResourceConfirmed`, `ResourceDelivered` and
  `ResourceDownloaded`.
- **Five optional bridges**: leadhub (contact and tags), marketing (mailing-list subscription),
  email-templates (mail bodies), suppression (send gate) and activity (ledger). Each is inert when
  its addon is absent.
- **`lead-magnets:sweep`** and an hourly schedule entry for housekeeping of lapsed grants.
- **Multi-brand support** through `goldnead/statamic-brand-context`: resources, grants and
  download rows are brand-scoped, and each session-less public route derives the brand from the
  value the visitor already carries.

### Decisions worth recording

**Grant state lives in this package rather than in `goldnead/statamic-entitlements`.** That
package did not exist when this one was built: it was deferred until a second consumer justified
designing the shared abstraction, and this addon is meant to be that consumer. Taking the target
architecture literally would have meant not building this addon at all.

The cost is two grant models and a migration once entitlements ships. The benefit is that the
addon exists and supplies the second use case. The alternative, building entitlements first,
designs the abstraction before the second real case. The full account, including what the local
model deliberately does not do, is on [Grant state](/lead-magnets/grant-state).

[Entitlements](/entitlements/) has since been built. The bridge between the two has not, and this
package still names it in prose only.

**Idempotency is one statement in the database, not a check in PHP.** `activate()` is a
conditional `UPDATE … WHERE state = 'pending'` with an affected-row check. It holds against a
double-clicked link, a mail scanner prefetching the URL, a queue retry and two web workers at
once, because there is no window between reading the state and writing it.

**`expires_at` means two different things, and activation switches the clock.** While pending it
is the confirmation window; once active it is the access lifetime. Leaving the confirmation
deadline in place would have expired every grant three days after it was confirmed, which surfaces
weeks later as "the download link stopped working".

**Access is decided by the timestamp, not by the state column.** `hasLapsed()` reads `expires_at`,
so no access decision depends on the sweep having run. The sweep is housekeeping.

**Revocation defeats a valid signature.** The signature proves the link was issued; whether the
access still stands is a separate question the controller asks after the middleware has passed.

**Resource handles are globally unique, not per brand.** The public request endpoint is opened
with no session, so the handle is the only thing the visitor carries and the brand is derived from
it. That derivation is safe exactly as long as a handle addresses one resource across all brands.
The cost is real: two brands cannot both own a `warmup-routine`. Marketing made the same trade for
list handles.

**No foreign keys anywhere.** `contact_id` points at LeadHub, which may not be installed, and a
foreign key to a table that may not exist is not a constraint, it is an install failure.

**A resource request is not a mailing-list opt-in.** The Marketing bridge subscribes the confirmed
address to a named list, and it deliberately does not borrow Marketing's double opt-in to cover the
file request. The confirmation this package sends is consent to receive one file.

**Never `method_exists()` on a facade class.** Every bridge probes `getFacadeRoot()` instead. A
facade forwards through `__callStatic` and declares none of the methods it forwards, which is why
a whole set of LeadHub bridges elsewhere in the suite silently did nothing.

### Not in v1

Account-based access instead of a download, which needs identity decisions this package does not
make. Follow-up sequences, which belong in Marketing. Segments. Analytics conversion events.

There are also no Antlers tags, no fieldtypes and no widgets. The request form is three fields and
a documented endpoint.

`goldnead/statamic-marketing` was deliberately **not modified** while this was built. Not out of
production risk, but out of scope: this addon has to work without Marketing, and the only way to
prove that is to leave Marketing alone. The coupling is read-only, through existing public
contracts.

### Notes

- The Control Panel bundle is not committed. It is attached to each GitHub release by the release
  workflow and fetched at install time by `pixelfear/composer-dist-plugin`.
- Suite: 12 test files, green against SQLite and MySQL. Two of them exist because the scope spec
  named them: `ConfirmationIdempotencyTest` for the repeated confirmation, and
  `DownloadSecurityTest` for the expired and tampered link, fourteen cases.
- `NoSiblingsInstalledTest` runs the full request, confirm and download flow in a process where
  **none** of the five sibling classes exists, because none is in `require` or `require-dev`. The
  absence is structural rather than mocked.
- `release.versioning` is the only suppressed `addon-lint` rule, and only for the pre-release
  window.
- `release.screenshots` is not met. The studio playground lives on a path that is unreadable on
  the build machine.
- Two docblocks name test files that do not exist (`BridgeBootOrderTest.php`,
  `CpWriteRouteAuthorizationTest.php`). The assertions they describe are real and live in
  `BridgeTest.php` and `CpAuthorizationTest.php`.
- A Vitest suite is declared in `vite.config.js` and `package.json`, and `tests/js/` does not
  exist. The three Vue pages have no unit coverage and are exercised only through Inertia response
  assertions.
