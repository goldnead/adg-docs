---
layout: home
title: Statamic Addons
titleTemplate: goldnead — documentation for the Statamic addon suite

hero:
  name: Statamic Addons
  text: One suite, one set of docs
  tagline: >
    Fifteen packages for Statamic 6: a CRM, email marketing, a visual automation
    builder, a webhook layer, an activity ledger, notifications, a subscriber
    preference centre, entitlements, gated resources, events and content tooling.
    Built to be installed one at a time and to compose when you install the next one.
  actions:
    - theme: brand
      text: Start here
      link: /guide/
    - theme: alt
      text: Browse the suite
      link: /guide/suite
    - theme: alt
      text: Which addon do I need?
      link: /guide/choosing

features:
  - icon: ◧
    title: Single-brand by default
    details: >
      Every addon runs on an ordinary one-site install with no tenancy
      machinery visible. Multi-brand isolation is a flag you turn on later, with
      no schema migration to do.
    link: /guide/brands
    linkText: Brands & multi-tenancy
  - icon: ◍
    title: No dependency on your User model
    details: >
      Addons record and notify actors through a shared Identity value object, so
      nothing in the suite ever reaches for App\Models\User.
    link: /guide/identity
    linkText: Identity
  - icon: ⌗
    title: Database or flat files
    details: >
      Configuration in most addons can live in MySQL or as git-versionable YAML
      under content/. Both drivers are first-class and you can migrate between
      them with one command.
    link: /guide/storage
    linkText: Storage drivers
  - icon: ⇄
    title: One place per concern
    details: >
      Transport, orchestration, CRM and ledger are separate addons with
      documented boundaries, so two of them never fire the same side effect
      twice.
    link: /guide/boundaries
    linkText: Boundaries
---

<AddonGrid />

## Install what you need

Each addon installs on its own. Every package is on Packagist, so a bare
`composer require` resolves it and pulls in the foundation packages it needs.
Those foundation packages are inert until you configure them.

```bash
# The CRM, on its own
composer require goldnead/statamic-leadhub
php artisan migrate

# Newsletters on top of it
composer require goldnead/statamic-marketing
php artisan migrate
```

Nothing else is required: every addon in the suite ships its compiled Control
Panel assets, so there is no front-end build step on an install.

New here? [Start with the guide](/guide/), or read
[which addon solves which problem](/guide/choosing).
