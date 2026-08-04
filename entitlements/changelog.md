---
title: Entitlements changelog
editLink: false
---

# Changelog

<AddonHeader slug="entitlements" />

Release notes for `goldnead/statamic-entitlements`, as published with the package.

::: warning Nothing is released yet
The repository has **no git tag** and the package is not on Packagist. Everything below sits under
`[Unreleased]`.

The `release.versioning` lint rule is deliberately **not** suppressed: it is correct and has to keep
firing until publishing this addon is decided.
:::

Cross-version upgrade notes for the whole suite are in [Upgrading](/guide/upgrading).

## Unreleased

### Added

- **Grants** with a polymorphic subject, product slug, source, source reference, window, grace
  period and revocation, brand-scoped from the first migration.
- **One state machine**, `Pending`, `Scheduled`, `Active`, `GracePeriod`, `Expired`, `Revoked`,
  resolved in exactly one place, with a query projection pinned to it by an exhaustive test.
- **`Scheduled` as a state of its own**, replacing the extracted system's habit of reporting a
  not-yet-started grant as expired on the customer's own account screen.
- **Real revocation**: `revoke()` with a mandatory reason, `restore()` as a separate decision, both
  read by the resolver.
- **Idempotency enforced by a unique index** over `(subject_type, subject_id, product_slug, source,
  source_ref, brand_id)`, present in the table's first migration, with `source_ref` NOT NULL so the
  constraint also binds grants with no external reference.
- **Atomic `claimPending()`** for exactly-once confirm-first delivery.
- **Four events**, `EntitlementGranted`, `EntitlementPending`, `EntitlementRevoked` and
  `EntitlementExpired`, each fired once per transition. The package itself sends nothing.
- **`entitlements:announce`**, the pass for the two transitions the clock causes.
- **Control Panel**: listing with state, source and product filters, a detail screen with a
  timeline, a manual grant form, a revocation form with a required reason, and three separate
  permissions.
- **Extension points**: `SubjectResolver`, `PackageResolver`, and a source display registry.
- **Optional `statamic-activity` bridge**, attached by `class_exists` and never required.

### Decisions worth recording

**`source_ref` is `NOT NULL DEFAULT ''`, against a spec that called for nullable.** NULLs never
collide in a unique index, on any engine, so a nullable column would have switched idempotency off
for exactly the grants that carry no external reference: manual grants from the Control Panel,
opt-ins, everything a human creates by hand and then double-submits. An order from a payment
provider always carries a reference and would have been protected; the grant an administrator types
twice would not.

A constraint that does not hold for the most hand-driven write path is not idempotency, it is the
appearance of it. Absence is the empty string and `hasSourceRef()` asks the question. It is pinned
by a test that races a raw insert past the model, and by a structural rule that lets **no** unique
index in this package cover a nullable column. The full account is on
[Reference](/entitlements/reference#source-ref-is-not-null-and-that-is-the-point).

**The unique index is in the table's first migration.** An idempotency constraint added later is a
constraint that has to be reconciled with the duplicates that accumulated before it, which is the
work the extracted system was in the middle of when this package was written.

**`brand_id` is in the unique key.** The spec left it undecided. Leaving it out means a grant
written in one brand blocks the same grant in another, which is a cross-tenant failure. The accepted
cost is the same purchase producing a row in two brands, which is a reporting question and cheaper
than a leak.

**Two states are derived rather than stored.** The clock moves and the database does not. Storing
`Scheduled` and `Expired` would mean a job whose lateness changes what a customer can do.

**One resolver, and its SQL projection is pinned to it.** Two implementations of a state machine is
two things to get wrong, so a test walks the full cartesian product of five statuses, three starts,
three expiries, three grace values and two revocation signals, 270 rows, and asserts that the SQL
and the PHP select the same ids for every one of the six states.

**Revocation answers on either signal and fails closed.** The spec asked for a test enforcing that
`status = 'revoked'` exactly when `revoked_at` is set. The implementation refuses to enforce that
consistency and instead answers revoked on **either** signal, so a half-written revocation still
denies access. The test suite tests the contradiction rather than the invariant.

**`announced_state` holds the last announced state.** The spec left the idempotency mechanism for
`EntitlementExpired` open and considered flipping `status`. One column holding what was last
announced serves both clock transitions, and flipping `status` would have made it a second source of
truth alongside the resolver.

**`SUPER_USER` is dropped.** The extracted system had a reason code that short-circuited every
check. Access is a property of grants, not of the person asking, and a test asserts a superuser gets
no special treatment.

**The package sends nothing.** No mail, no notifications, no magic links, no account creation,
asserted with fakes across every write path. The class this was extracted from was account creator,
grant writer and mail sender at once, which is what made all three impossible to change.

### Also deviating from the extraction spec

- The spec listed the column as `brand`; it is `brand_id`.
- The spec asked for a table-prefix config key; the table name is hard-coded.
- The spec named four write methods; `restore()` and `enterGracePeriod()` also exist, the second
  because `grace_period` would otherwise be a state with no writer.
- The spec asked for subject and brand filters in the Control Panel; there are three filters, state,
  source and product, and the subject is reachable through the search box only.
- The spec asked for a state history on the detail screen; what is there is a timeline of the five
  stored timestamps. A grant row is a current state, not a log, and the history lives in the events
  and the optional ledger.
- `EntitlementExpired` carries neither a previous state nor an actor. There is no actor: the clock
  did it.
- The spec asked for two parallel `grant()` calls against MySQL. The race is simulated in one
  process, with a raw duplicate insert doing the work the second connection would have done. The
  MySQL leg makes the constraint real; the concurrency is still simulated, and the test header says
  so.

### Not in v1

Products and packages as their own data models; the grant keeps a free `product_slug` and a package
resolver stays an optional extension point. A policy engine. User and group synchronisation, which
is consumer wiring for an `EntitlementGranted` listener. Automation triggers as a hard coupling.
Seats, organisations, rosters, grant transfer, usage counters, and trials as a state of their own.

Also absent: bulk import, statistics, a dashboard widget, any Antlers tag, any fieldtype, any
public route.

### Notes

- Suite: **116 tests**, green against SQLite and MySQL, plus three Vitest specs for the two Control
  Panel pages.
- `WithoutAnyBridgeTest` is the acceptance criterion in test form: with no bridge attached, a grant
  can be written, resolved, decided and revoked, its events fire, the pass runs and the listing
  serves 200.
- The README lists LeadHub under "optional siblings, attached by `class_exists`". There is no
  LeadHub bridge and none is needed: the subject is polymorphic, so a CRM contact is a valid subject
  with no coupling. The capability is real and the description of it is wrong.
- The README counts three extension points. There are two interfaces; the third is a config array.
- Two `addon-lint` rules are downgraded to `minor` with written rationale.
  `release.screenshots` and `release.versioning` remain unsuppressed and still fire.
