# Licensing

Two licensing models are in play across the suite, and which one applies depends
on the addon.

This page is about what an addon costs. It says nothing about how finished it is,
and the two do not line up — some MIT packages are proven, some commercial ones
shipped weeks ago. For that, see [how far along each addon
is](/guide/maturity).

## Per addon

<LicenceTable />

The MIT-licensed packages need no key and impose no runtime check. The commercial
ones are licensed, not sold, and resolve their status through Statamic's own
licensing system.

The second column answers a different question from the first. "Commercial" says
a licence is required. "Suite only" says where that licence comes from, and for
those packages the answer is never a Marketplace listing. See
[Buying](#buying) below.

This table is generated from the addon registry, and
`scripts/sync-licenses.mjs` checks that registry against each package's own
`composer.json`. It is generated rather than typed out because a hand-copied
licence has nothing keeping it honest: for a stretch of August 2026 this page
listed six commercial addons as MIT.

## Statamic's licensing system

For the commercial addons, the licence is entered in Statamic and shown in the
Control Panel's licensing utility. There is no separate key file, no separate
account, and no phone-home written by these addons: the resolution goes through
Statamic's own mechanism, the same one your Statamic Pro licence uses.

A site in development mode does not need a licence. A production domain does.

## Editions

Statamic supports addon editions natively: a package declares them in its
`composer.json` and resolves the active one through Statamic's own licensing,
with no key handling of its own.

**No addon in this suite currently ships editions.** Automations did until 2.0.0,
where the edition gates and a home-grown licence manager were both removed. There
is nothing to configure, and no `license` block in any addon's config.

## Statamic Pro

Independent of the addons, one common feature needs it: **more than one Control
Panel user**.

```dotenv
STATAMIC_PRO_ENABLED=true
```

Assigning leads, tasks or opportunities to team members implies more than one CP
user, so LeadHub's assignment features are effectively Statamic Pro features. They
work without it, there is simply only ever one person to assign to.

## Multi-brand as a licensed feature

Brand Context is MIT, and its multi-brand mode is a config flag with no key
attached. But it exposes a hook so a *consuming* product can gate it:

```php
// config/brand-context.php
'license_check' => null,   // a callable that must return true
```

Set it to a callable and multi-brand only activates when that callable agrees.
This exists so multi-brand can ship as a premium tier of something built on top
of the suite; on a normal install, leave it `null`.

## What is not licence-gated

Worth stating, because it is a fair question about a suite with commercial
members:

- No MIT addon degrades if you have no licence for the commercial ones.
- No addon calls home to count contacts, deliveries, campaigns or runs.
- Nothing stops working when a licence lapses in production; Statamic's own
  licensing UI reports the problem, which is the same behaviour as any other
  Marketplace addon.

## Buying

**Twenty-four of the twenty-six packages are on Packagist**, commercial ones
included, and every one of those installs with a bare `composer require`. Client
Rooms and Assessments are not published yet; see
[Client Rooms → Installation](/clientrooms/installation) and
[Assessments → Installation](/assessments/installation).

Being on Packagist is not the same as being free. **Eighteen are commercial** and
**eight are MIT**; the table above is the authoritative list. The commercial ones
resolve as ordinary Composer packages but are licensed rather than sold.

The commercial packages are sold in three ways, and which one applies decides
what you should do about a licence. Eight are meant for individual sale on the
Statamic Marketplace. Eight are licensed only as part of the Suite, with no
individual listing planned. Client Rooms and Assessments are not sold at all
yet. The "How it is sold" column above says which is which, for every addon,
and the same word appears on each addon's own pages.

The grouping is Schedule A of the [Suite EULA](/guide/suite-eula), the contract
you buy.

::: warning Seven of the eight are waiting for a listing
[Table of Contents](/toc/) has a Statamic Marketplace listing. The other seven, <SalesGroup kind="marketplace" except="toc" />, are meant to get one and do not have one yet, so today there is no way to buy a licence for them.

If you are running one of them on a production site, that is not a licence
breach you need to fix today. It is a listing that does not exist yet. Get in
touch at [info@adriangoldner.com](mailto:info@adriangoldner.com) and we will
sort it out when the listing goes up. Tags published before the licence changed
in August 2026 were MIT and stay MIT.
:::

::: warning Eight are sold only in the Suite
The eight are <SalesGroup kind="suite-only" />. They carry no individual price and no Marketplace listing, and none is coming. They are licensed as one package at [suite.adriangoldner.dev](https://suite.adriangoldner.dev), under the [Suite EULA](/guide/suite-eula).

The box above does not apply to these eight. There is no listing to wait for.
:::

Client Rooms and Assessments are commercial as well, but neither is published on
Packagist and neither is part of the Suite as sold today. Their pages say what
the install will be once that changes.

Flow Canvas is MIT from 1.2.0 on, and deliberately: Funnels requires it, so a
commercial editor behind a commercial addon would have meant two licences for
one purchase. A shared foundation that our own addons consume belongs with
Brand Context and Identity Contracts, not in the shop.

For the MIT packages there is nothing further to do. `composer require` is the
whole transaction.
