# Licensing

Two licensing models are in play across the suite, and which one applies depends
on the addon.

## Per addon

| Addon | Licence |
| --- | --- |
| [Brand Context](/brand-context/) | MIT |
| [Identity Contracts](/identity-contracts/) | MIT |
| [Webhook Manager](/webhook-manager/) | MIT |
| [LeadHub](/leadhub/) | MIT |
| [Marketing](/marketing/) | MIT |
| [Email Templates](/email-templates/) | MIT |
| [Activity](/activity/) | MIT |
| [Notifications](/notifications/) | MIT |
| [Automations](/automations/) | Commercial, via the Statamic Marketplace |
| [Table of Contents](/toc/) | Commercial, via the Statamic Marketplace |

The MIT-licensed packages need no key and impose no runtime check. The commercial
ones are licensed, not sold, and resolve their status through Statamic's own
licensing system.

## Statamic's licensing system

For the commercial addons, the licence is entered in Statamic and shown in the
Control Panel's licensing utility. There is no separate key file, no separate
account, and no phone-home written by these addons: the resolution goes through
Statamic's own mechanism, the same one your Statamic Pro licence uses.

A site in development mode does not need a licence. A production domain does.

## Editions

**Automations** ships in two editions:

- **Free** — the full visual builder, all triggers, all logic nodes and the core
  actions.
- **Pro** — premium features, currently the AI action and custom node
  registration, unlocked with a Pro licence.

The active edition is resolved natively through Statamic's licensing system, and
the licensing utility in the CP shows which one is active. A Free install is not
crippled: the builder, the triggers, the branches and the actions you use daily
are all in it.

Automations also exposes a licence configuration for self-hosted arrangements:

```php
// config/automations.php
'license' => [
    // 'config' — a key you set yourself
    // 'remote' — checked against a licence server
],
```

`config` mode is the right answer for an install that must not make outbound
calls.

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

The commercial addons are on the [Statamic Marketplace](https://statamic.com/addons).
The MIT ones are on Packagist and require nothing but `composer require`.
