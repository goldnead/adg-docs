**Version 0.1, draft of 5 September 2026. Not yet approved and not in force.**

## Parties

**Licensor:** Adrian Goldner, Keplerstraße 25, 60318 Frankfurt am Main, Germany.
VAT identification number: [to be filled in].
Contact: [info@adriangoldner.com](mailto:info@adriangoldner.com).

**Licensee:** the business that buys a licence.

Below, "you" means the licensee and "we" means the licensor.

## Scope, and who may buy

This agreement covers the sixteen commercial packages listed in Schedule A, together the
goldnead Statamic Addon Suite ("the Suite"). The eight MIT-licensed packages named at the end
of Schedule A are not covered: they are MIT, and nothing here restricts what you do with them.

**We license to businesses only.** By buying a licence you confirm that you buy in the course
of a trade, business or profession. Buyers in another EU member state give us a valid VAT
identification number; buyers outside the EU confirm that they buy for business use. Buyers
everywhere confirm that no sanction or export restriction makes the sale unlawful. Because
this is a contract between businesses, the statutory consumer rights of German law do not
apply: no right of withdrawal under § 355 BGB, no cancellation button under § 312k BGB.

If you buy as a consumer anyway, you were not entitled to do so. We may then end the licence
and refund what you paid.

The Suite is self-hosted software. You install it into your own Statamic installation with
Composer and it runs on your server. Everything it stores stays in your database and your
filesystem, apart from the traffic described in section 5.

## 1. The three licences

| Licence | Price | What it covers |
|---|---|---|
| Site | 499 USD once | The Suite on one production domain, and twelve months of updates. |
| Renewal | 199 USD once | Twelve more months of updates for an existing site licence. |
| Agency | 1,999 USD per year | The Suite on any number of production domains you operate, including sites you build and run for your clients, and updates for the same year. |

Your **term** is the period in which you receive updates: twelve months from purchase for a
site licence, twelve more for each renewal, and the running year of an agency licence.

A **production domain** is the domain your live site answers on. Its `www` variant, a redirect
domain pointing at the same site, and a temporary migration hostname for that same site count
as a single production domain. Development, staging, preview and local copies of that site do
not count at all, and there is no limit on them.

**A renewal is a separate purchase, and you never have to make it.** We do not charge you
automatically and there is nothing to cancel.

## 2. What the licence grants

We grant you a non-exclusive, worldwide right to:

- install and run the Suite on the production domains your licence covers;
- modify the code for your own use, including for a client site you build and operate;
- keep and run copies for development, staging, backup and archiving.

**Issues and pull requests are welcome.** Every package in Schedule A has its source on
GitHub with issues open, and you do not need a licence to file one. If you send us a pull
request, you grant us a non-exclusive, worldwide, perpetual and irrevocable right to use,
modify and distribute what you sent as part of the package, under the package's own licence.
You keep the copyright in your contribution. We are not obliged to merge anything.

The right runs for your term. For the versions you installed during that term it keeps running
afterwards, as section 4 describes.

**The Suite is licensed, not sold.** We keep every right we do not grant here, including
copyright in the code. If a package in Schedule A ships editions, your licence covers its paid
edition; Statamic may still show the alert described in section 5 for that package.

## 3. What the licence does not allow

- **No resale.** You may not sell, sublicense, rent or give away the Suite, or any package
  from it, as a product of your own. Building a client site with it is what the licence is
  for. Passing the packages on so someone else can build with them is not.
- **No redistribution outside a site.** You may not publish the code of a commercial package,
  in whole or in substantial part, anywhere a third party can obtain it. These packages are
  already on Packagist; that is our decision to make, not a permission we grant you to repeat
  elsewhere.
- **No sharing one licence across businesses.** A site licence belongs to one production
  domain. An agency licence covers the sites you operate. It does not cover another agency's
  sites.

If you break these terms, the licence ends. We will write to you first and give you a
reasonable period to put it right, unless the breach is deliberate.

## 4. What happens when a term ends

**Nothing switches off and nothing degrades.** The version you have installed keeps running,
without a time limit, on the domains it was licensed for. You do not have to uninstall it,
delete it or hand anything back. The only thing you lose is the right to versions released
after the term ended.

For an agency licence: the sites already live on the day the term ends keep running on the
version they have, whoever operates them. Putting the Suite on a new production domain after
that day needs a current licence.

During your term you get every version we release for the packages in Schedule A, and you
choose when to install it. We do not promise how often we release, and a new version may
change behaviour; each package keeps a changelog, and breaking changes go through a major
version.

## 5. No licence check, and what leaves your server

**We built no key, no licence server and no activation into these packages.** None of them
sends us your installation, your domain, your data or your usage.

Three things you cannot redirect leave your server, and none of them reports to us:

- **Statamic reports your installation to Statamic.** Statamic's own Outpost reports to
  `outpost.statamic.com`: your Statamic licence key, the host name, the server IP and port,
  your PHP, Laravel and Statamic versions, whether Statamic Pro is enabled, and the name,
  version and edition of every installed addon. It does this no more than once every five
  minutes while the site has traffic, and also from console commands. That is Statamic core,
  and it happens on every Statamic site whether or not our packages are installed. If you
  write a privacy notice for your site, this belongs in it.
- **Payments settles through Mollie.** It ships no other gateway, so every checkout sends your
  buyer's name, email address, country and amount to Mollie. You cannot point it elsewhere.
  Mollie is your payment provider, under a contract you hold with them.
- **Invoices checks VAT identification numbers against VIES**, the European Commission's
  service. The check is on by default and sends the number being checked to the Commission.
  You can switch it off. Invoices then blocks every sale to an EU business, because it accepts
  only a confirmed or a pending number.

Everything else goes where you point it, and stays off until you configure it:

| Package | Sends to |
|---|---|
| Webhook Manager, Automations | any endpoint you enter, Slack, Discord and Mattermost included |
| Automations | an AI provider of your choice, Cal.com, VocalFlow |
| LeadHub | HubSpot, Brevo, or a webhook of your own |

Mail is the exception. Payments, Invoices, Funnels, LeadHub, Marketing, Lead Magnets,
Automations, Webhook Manager and Email Templates all hand outgoing mail to your Laravel
application's own mail service, which you choose. The invoice mail carries your buyer's name,
address and the invoice PDF, and your records keep it as long as they keep the invoice.

**Separately, Statamic's licensing utility shows an alert** in the Control Panel for a package
that has a Marketplace listing when no Marketplace licence is present for it. The package keeps
working. The wording differs on a development domain, but the alert still appears. Of the
packages in Schedule A, only Table of Contents has a listing today. **A Suite licence is not a
Statamic Marketplace licence**, because the Marketplace is Statamic's and we cannot grant you
a licence in their system by selling you ours.

**You do not have to buy that listing separately.** Table of Contents is our own package, so
we issue you a Marketplace licence for it at no extra cost, and the alert goes away. Ask us
for it and we will send it. If a further package in Schedule A is listed on the Marketplace
later, the same applies to it.

Brand Context is an MIT package and not part of this agreement. It offers an optional
`license_check` callable that a product built on these packages can use to gate its own
features. It is `null` unless you set it, and we never set it.

## 6. Support, and what we do not promise

**A licence buys software and updates. It does not buy support.** Write to
[info@adriangoldner.com](mailto:info@adriangoldner.com) with a question about the Suite and we
will answer it, but **we promise no response time, no availability and no fix by a given
date.** No service level agreement is included in any of the three prices.

The Suite is work in progress. Which packages have run in production and which have not is
written down per package at
[docs.adriangoldner.dev/guide/maturity](https://docs.adriangoldner.dev/guide/maturity). Read it
before you put a package on a client site. We do not promise that any package fits your
particular purpose.

## 7. Warranty and liability

You buy the Suite as it is on the day you buy it. The statutory warranty rights for defects
apply as German law provides them between businesses. We give no additional guarantee and no
assurance about specific features, uptime or results.

Our liability is limited as follows:

- **Unlimited** for damage caused intentionally or by gross negligence, for injury to life,
  body or health, and where the German Product Liability Act applies.
- For simple negligence, **only where we breach a core obligation of this agreement** (one
  whose fulfilment makes proper performance possible at all and on whose fulfilment you may
  routinely rely), and then only for damage that was foreseeable and typical for this kind of
  agreement.
- **Capped**, in that case, at what you paid us in the twelve months before the damage
  occurred.
- **Excluded otherwise**, in particular for loss of profit, for loss of data where you had no
  working backup, and for consequential damage.

You are responsible for backups, for testing an update before it reaches a live site, and for
what your own site does with the data the Suite stores.

The Suite depends on third-party open-source packages, each under its own licence. We give no
warranty for those and they are not part of what we license here.

## 8. Prices, payment, refunds and tax

Payment is due when you order, and the invoice follows by email. **A licence takes effect when
we receive payment.**

**A licence is not refundable**, apart from a claim under the statutory warranty rights in
section 7 and the consumer case under Scope above.

**Buying a package on its own first does not reduce the price of the Suite.** Some packages in
Schedule A are sold individually on the Statamic Marketplace. If you bought one there and later
buy a Suite licence, the Suite costs its full price. The two purchases are separate, and we
credit nothing from one against the other.

The prices in section 1 are those current on the version date of this document. A renewal or an
agency year is priced at our rate on the day you buy it.

**All prices are net and exclude value added tax.** We charge no German VAT:

- German customers: we are a small business under § 19 UStG.
- Businesses in another EU member state: reverse charge. You account for the tax yourself and
  give us a valid VAT identification number.
- Businesses outside the EU: the supply is not taxable in Germany.

Any tax due in your own country is yours to handle.

## 9. Moving a licence

A site licence follows the site, not the domain name. If a licensed site moves to a new
production domain, tell us in writing and the licence moves with it. **A transfer does not add
a licence. One production domain stays covered.**

The same applies when you hand a site over to the client who will run it, with one difference
under an agency licence: there the client needs a licence of their own to keep receiving
updates, and **that licence is a purchase, not something the agency licence includes.** We
issue it at our rate on the day, or move an existing one. Section 4 covers sites that are still
live when an agency term ends.

Apart from these cases you may not transfer this agreement or any licence under it without our
written consent, which we will not unreasonably withhold.

## 10. Changes

We may change these terms for new purchases. **A change never applies backwards to a licence
you already hold.** The version of this document current on the day you bought governs your
licence, and we keep every version available.

We may also add a package to Schedule A or discontinue one, for new purchases. **Neither
changes a licence already sold.** If we discontinue a package during your term, you keep the
right to run the last version we released, and section 4 applies to it like any other package.

## 11. Duration, law, language, venue

This agreement runs for as long as you use the Suite. Section 4 governs what happens at the end
of a licence term.

If a clause turns out to be invalid, the rest stays in force.

**German law applies**, excluding the UN Convention on Contracts for the International Sale of
Goods. This English text is the governing version, and German statutes are cited by their
German designations. **The place of jurisdiction is Frankfurt am Main**, to the extent that a
place of jurisdiction can be agreed.

## Schedule A: the packages

Sixteen commercial packages. Eight are intended for individual sale on the Statamic
Marketplace, and only Table of Contents is listed there today. The other eight are sold only as
part of the Suite.

**Intended for the Statamic Marketplace**

| Package | Composer name |
|---|---|
| Table of Contents | `goldnead/statamic-toc` |
| Automations | `goldnead/statamic-automations` |
| LeadHub | `goldnead/statamic-leadhub` |
| Webhook Manager | `goldnead/statamic-webhook-manager` |
| Marketing | `goldnead/statamic-marketing` |
| Lead Magnets | `goldnead/statamic-lead-magnets` |
| Events | `goldnead/statamic-events` |
| Email Templates | `goldnead/statamic-email-templates` |

**Only in the Suite**

| Package | Composer name |
|---|---|
| Payments | `goldnead/statamic-payments` |
| Offers | `goldnead/statamic-offers` |
| Invoices | `goldnead/statamic-invoices` |
| Funnels | `goldnead/statamic-funnels` |
| Products | `goldnead/statamic-products` |
| Booking | `goldnead/statamic-booking` |
| Consent | `goldnead/statamic-consent` |
| Insights | `goldnead/statamic-insights` |

**Not covered by this agreement, and MIT-licensed**

| Package | Composer name |
|---|---|
| Brand Context | `goldnead/statamic-brand-context` |
| Identity Contracts | `goldnead/statamic-identity-contracts` |
| Suppression | `goldnead/statamic-suppression` |
| Entitlements | `goldnead/statamic-entitlements` |
| Flow Canvas | `goldnead/statamic-flow-canvas` |
| Activity | `goldnead/statamic-activity` |
| Notifications | `goldnead/statamic-notifications` |
| Preference Center | `goldnead/statamic-preference-center` |

Use them under the MIT licence in each package.

**Not covered by this agreement, and not currently sold**

Client Rooms (`goldnead/statamic-clientrooms`) and Assessments
(`goldnead/statamic-assessments`). Both are commercial. Neither is published on Packagist, and
neither is part of the Suite as sold today.
