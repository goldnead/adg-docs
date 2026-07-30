# Introduction

This site documents ten addons for **Statamic 6**. They are separate Composer
packages, released and versioned independently, and each one is useful on its
own. What makes them a suite is that they agree on four things: how a brand is
scoped, who an actor is, where configuration lives, and which addon owns which
concern.

If you only ever install one of them, you can ignore all four. This guide exists
for the point at which you install the second one.

## What is here

| Layer | Addons | What it is for |
| --- | --- | --- |
| Foundation | [Brand Context](/brand-context/), [Identity Contracts](/identity-contracts/) | Install-once packages the others build on. Inert on their own. |
| Integration | [Webhook Manager](/webhook-manager/), [Automations](/automations/) | Getting data in and out of the site, and reacting to events. |
| CRM & marketing | [LeadHub](/leadhub/), [Marketing](/marketing/), [Email Templates](/email-templates/) | Contacts, consent, campaigns. |
| Platform | [Activity](/activity/), [Notifications](/notifications/) | Shared services any domain addon can record into. |
| Content | [Table of Contents](/toc/) | Front-end helpers for editorial work. |

A one-page tour of all ten, with the dependency graph, is in
[The suite](/guide/suite). If you know the problem but not the addon, read
[Choosing an addon](/guide/choosing).

## How to read the addon docs

Every addon section has the same shape, deliberately:

- **Overview** — what the addon is, what it is not, and the shortest useful
  example.
- **Installation** — Composer, migrations, publishing, and what a fresh install
  looks like in the Control Panel.
- **Configuration** — every config key that matters, with its default.
- **Guides** — the subject matter, one topic per page.
- **Reference** — console commands, events, permissions and the public API in
  one place.
- **Troubleshooting** — the failures that actually happen, with the symptom
  first.
- **Changelog** — the release notes, as published with the package.

So "where are the console commands for X" always has the same answer:
`/<addon>/reference`.

## Conventions in these docs

`php please` and `php artisan` are interchangeable in a Statamic project. The
docs use `php artisan` for commands that are plain Laravel and `php please`
where Statamic's own wrapper is the more natural habit; either works.

Code samples assume a queue worker is running unless stated otherwise. Several
addons will function with `QUEUE_CONNECTION=sync` and none of them are good
ideas that way; see [Queues & scheduling](/guide/queues).

Anything described as **fail-safe** means the same specific thing throughout the
suite: the addon catches its own exception, logs it, and returns. A CRM write
must not roll back the form submission that caused it, and a mail transport
error must not roll back the comment. Where that guarantee does *not* hold, the
page says so.

## Getting started

1. [Installation](/guide/installation) — install any addon in the suite, and
   what the foundation packages do when they arrive as a dependency.
2. [Compatibility](/guide/compatibility) — versions, PHP, Laravel, Statamic and
   the inter-addon constraints.
3. [Boundaries](/guide/boundaries) — read this before wiring the same event in
   two addons.
