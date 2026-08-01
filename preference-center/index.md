# Preference Center

<AddonHeader />

One page for everything a person receives — mailing lists, product notifications, cadence,
and the blocks that override all three — assembled from whichever of those sources is
installed.

It is a **view over three other packages**, not a fourth store. It owns no table and no
migration. What it owns is the page, the three doors into it, and the rule that a change
made here is recorded with the proof that authorised it.

## There is no Control Panel screen

Say this first, because it is the thing people go looking for and will not find.

This addon registers **no Control Panel page, no fieldtype, no widget, no Antlers tag, no
permission and no Artisan command**. Its service provider is a plain
`Illuminate\Support\ServiceProvider` rather than Statamic's `AddonServiceProvider`, because
there is nothing for the latter to register.

What it serves instead is **four public URLs**, opened by people who have never seen a
Control Panel:

| URL | What it is |
| --- | --- |
| `/!/preference-center/t/{pcToken}` | The page, entered with a marketing subscription token |
| `/!/preference-center/` | The same page, entered from a session or a followed magic link |
| `/!/preference-center/request` | "Send me a link", for a person who holds neither |
| `/!/preference-center/link/{pcLink}` | Spends a magic link and redirects to the page |

Two Blade templates on a shared layout produce all of it. There is no build step and no
asset pipeline: the page is opened from a mail client by somebody who wanted to turn
something off, so it has to render on the first byte.

::: warning If you already run Marketing, read the cutover first
From 1.3.0 this package owns the preference page and `goldnead/statamic-marketing` no longer
serves its own. Preference links in mail you have **already sent** point at the removed
route. See [Migrating from Marketing](/preference-center/migrating-from-marketing).
:::

## The three doors

Every entrance ends in the same `Access` object — an identity, an address, a brand and a
**proof** — and everything past that point sees only those four things.

| Proof | How it was earned | Strength |
| --- | --- | --- |
| `unsubscribe_token` | The token from a marketing mail. It was in the person's mailbox | Weakest, and permanent |
| `magic_link` | A signed, expiring link this addon mailed on request | Minutes |
| `session` | An authenticated session | Strongest |

The proof is written into every audit record. A consent record that says only *that*
something changed cannot be defended later; one that says what authorised the change can.

## Read order, and why it is not an implementation detail

Suppression is resolved **first**, because its answer changes what the other two blocks are
allowed to show. A mailing list the gate has closed is not offered back. A notification
channel that ends in a mailbox is shown off rather than shown as a wish that will never be
honoured.

```
suppression  →  lists  →  notification types  →  cadence
```

## What is missing is not what is empty

A block whose package is absent is `null`; a block whose package is installed but has
nothing to show is `[]`. The page makes different sentences out of them, because "there are
no mailing lists here" and "this installation has no mailing lists at all" are different
statements.

An installation with none of the three sources renders a single line saying there is nothing
to set, rather than an empty form.

## Where this addon stops

| Concern | Owner |
| --- | --- |
| Which lists exist, and what a consent change means | [Marketing](/marketing/lists) |
| Which notification types exist, and how they are delivered | [Notifications](/notifications/preferences) |
| Whether an address may be mailed at all | [Suppression](/suppression/gate) |
| One-click unsubscribe (RFC 8058) | [Marketing](/marketing/lists) — deliberately, see below |
| Who a visitor is | [Identity Contracts](/identity-contracts/) |
| Which brand a page belongs to | [Brand Context](/brand-context/) |
| The contact timeline the audit entry lands on | [LeadHub](/leadhub/timelines) |

**Unsubscribing stays in Marketing on purpose.** It is a legal obligation and an RFC 8058
endpoint that mail providers POST to unattended. It may not depend on an optional package
being installed. Only the richer preference page lives here.
