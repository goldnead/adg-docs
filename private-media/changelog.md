---
title: Private Media changelog
editLink: false
---

# Changelog

<AddonHeader slug="private-media" />

Release notes for `goldnead/statamic-private-media`, as published with the package.

Cross-version upgrade notes for the whole suite are in
[Upgrading](/guide/upgrading).

## 0.1.0 (2026-09-22)

First release, extracted from adriangoldner.com.

### Added
- Signed links bound to the viewer: `&#123;&#123; private_media:url }}` and `PrivateMedia::url()`.
- Delivery route (off by default, configurable prefix and middleware) with signature, expiry,
  user, path and access checks, each refusal named by a code.
- Streaming with single byte ranges (206, suffix ranges, 416), or a redirect to a temporary URL.
- Path fences: shape check, lookup in the configured asset container, realpath under the disk root.
- `MediaAccess` contract; statamic-entitlements as default, closed without it.
- Audit table `private_media_access_log`, `private-media:prune`.
- Events `MediaServed` and `MediaRefused`.
- Route throttle (`routes.throttle`, default `300,1`); anonymous refusals go to the log, not the table.
- Active content (HTML, SVG, XML, JS …) as attachment; every stream with `Content-Security-Policy: sandbox`;
  UTF-8 file names with an ASCII fallback.
- A file that cannot be opened is `storage_unavailable` (503), not a truncated 200.
- Refusal JSON keeps umlauts and slashes unescaped, readable when opened in a tab.
