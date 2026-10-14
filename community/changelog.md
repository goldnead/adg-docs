---
title: Community changelog
editLink: false
---

# Changelog

<AddonHeader slug="community" />

Release notes for `goldnead/statamic-community`, as published with the package.

Cross-version upgrade notes for the whole suite are in
[Upgrading](/guide/upgrading).

## 0.1.1 — 2026-10-15

### Fixed

- `composer.json` required `goldnead/statamic-teams` as a dev branch and set `minimum-stability` to `dev`, so 0.1.0 could not be installed from Packagist. It now requires `^0.4` and `stable`.

## 0.1.0 — 2026-10-15

### Added

- Control Panel backend: navigation section Community (Posts, Comments, Rooms), listings with search and filters, approve, hide with reason, show again and delete as row and bulk actions, room form with a pinned post, dashboard widget. Permission `view community`, with `moderate community` below it. German translation in `lang/de.json`, built assets in `dist/`.
- Migration `2026_10_14_000001`: composite feed index `(status, hidden, published_at)`, `hidden_reason` on posts and comments, `pinned_post_id` on rooms.
- `RoomService::save()` and `RoomService::pin()`; `PostService::hide()` takes a reason.

### Changed

- `PostService::approve()` publishes conditionally in the database, so concurrent approvals fire `PostCreated` once.
- `ReactionService::react()` returns the existing reaction when a double click hits the unique key.
- `CommunityPolicy::update()` needs a confirmed account.
- `RoomService::syncCurated()` and `save()` refuse a `kind` that is not in `Room::KINDS` (`CommunityException`).

### Fixed

- Links in post and comment bodies are allow-listed by scheme (`http`, `https`, `mailto`, `tel`, relative). `vbscript:`, `data:`, `file:` and others were let through before.
- Titles and regions are cut at 255 characters and bodies over 60000 bytes raise `CommunityException::tooLong()`. SQLite accepted both silently; MySQL failed the insert.

### Added

- `phpunit.mysql.xml` and a MySQL leg in CI; Laravel and `--prefer-lowest` axes in the test matrix.
- Pint, Larastan (level 5, with baseline), `.gitattributes`, `LICENSE.md`.
- `extra.statamic` carries `slug` and the developer link.
