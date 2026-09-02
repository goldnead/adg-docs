# Introduction

This site documents twenty-six packages for **Statamic 6**. They are separate
Composer packages, released and versioned independently, and each one is useful
on its own. Twenty-four of them are Statamic addons; Identity Contracts and Flow
Canvas are plain libraries the addons build on, the first needing Laravel and
nothing else, the second only PHP. What makes them a suite is that they agree on
four things: how a brand is scoped, who an actor is, where configuration lives,
and which addon owns which concern.

If you only ever install one of them, you can ignore all four. This guide exists
for the point at which you install the second one.

All twenty-six are tagged, and twenty-four of them are published on Packagist, so
a bare `composer require` resolves any of those. Client Rooms and Assessments are
not published yet, and their repositories are private, so they cannot be
installed at all today — their installation pages say so plainly.

## What is here

| Layer | Addons | What it is for |
| --- | --- | --- |
| Foundation | [Brand Context](/brand-context/), [Identity Contracts](/identity-contracts/), [Suppression](/suppression/) | Install-once packages the others build on. Inert on their own. |
| Integration | [Webhook Manager](/webhook-manager/), [Automations](/automations/) | Getting data in and out of the site, and reacting to events. |
| CRM & marketing | [LeadHub](/leadhub/), [Marketing](/marketing/), [Preference Center](/preference-center/), [Lead Magnets](/lead-magnets/), [Assessments](/assessments/), [Email Templates](/email-templates/) | Contacts, consent, campaigns. |
| Platform | [Activity](/activity/), [Notifications](/notifications/), [Entitlements](/entitlements/), [Booking](/booking/), [Client Rooms](/clientrooms/), [Flow Canvas](/flow-canvas/) | Shared services any domain addon can record into, ask, or build on. |
| Commerce | [Payments](/payments/), [Products](/products/), [Offers](/offers/), [Invoices](/invoices/), [Funnels](/funnels/), [Insights](/insights/) | Selling on the site you already run: the till, the thing sold, how it is presented, the document and the figures. |
| Content | [Events](/events/), [Table of Contents](/toc/), [Consent](/consent/) | Dated content, cookie consent, and front-end helpers for editorial work. |

A one-page tour of all twenty-six, with the dependency graph, is in
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
