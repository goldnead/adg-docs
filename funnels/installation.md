# Installation

<AddonHeader />

<Requirements database="MySQL or SQLite" />

```bash
composer require goldnead/statamic-funnels
php artisan migrate
php artisan vendor:publish --tag=statamic-funnels
```

Funnels then live under **Utilities → Funnels**.

<Figure
  src="funnels-list"
  alt="The Funnels listing with handles, live and draft badges"
  caption="Funnels live under Utilities. A draft is reachable only through preview." />

## What comes with it

Three packages are hard dependencies and install alongside it:

| Package | Constraint | Why |
| --- | --- | --- |
| `goldnead/statamic-flow-canvas` | `^1.1` | The editor. The same canvas the automations editor runs on, not a copy of it. |
| `goldnead/statamic-offers` | `^1.2` | What a thing costs. An offer step sells an offer, at the price that lives there. |
| `goldnead/statamic-payments` | `^1.6` | Takes the money, and decides what "paid" means. |

There is no build step. The addon ships its compiled Control Panel assets under
`dist/build/`, and Statamic publishes them to `public/vendor/statamic-funnels/` on
install.

## The third command is not optional

`vendor:publish --tag=statamic-funnels` copies the **front-end** stylesheet and countdown
script to `public/vendor/statamic-funnels/`. The shipped step template links them from
there.

Without it, a funnel step still renders and can still be walked, but the page links a
stylesheet that 404s and an offer with a deadline shows a number that never ticks. Both
of those look like a broken funnel rather than a missing publish.

A site with its own front end can skip it and set `styles => false` instead. See
[Configuration](/funnels/configuration#styles).

Other publishable tags:

| Tag | What it publishes |
| --- | --- |
| `statamic-funnels-config` | `config/statamic-funnels.php` |
| `statamic-funnels-views` | The shipped step template, into `resources/views/vendor/statamic-funnels/` |
| `statamic-funnels-migrations` | The migrations, if you want them in your own repo |

## Payments needs its webhook reachable

**Accepted means paid**, and only the payment provider's webhook says so. The walk moves
on when `PaymentPaid` fires, never when the buyer lands back on the return page — a buyer
who closes the tab has still paid, and a buyer who reaches the return page has not
necessarily.

So a funnel that sells anything is only as reliable as the payments webhook. If that
endpoint is unreachable from the internet, offers will be paid for and no walk will ever
advance past them. Set it up as
[Payments](/payments/) documents, and check it before
publishing a funnel with an offer in it.

No queue worker and no scheduler entry are needed. Nothing in this addon is deferred or
scheduled: a walk advances inside the request that advances it, or inside the webhook that
paid for it.

## Permissions

The Control Panel screens sit behind Statamic's utility permission,
`access funnels utility`. Grant it per role under **CP → Users → Permissions →
Utilities**.

The permission is what mints a [preview pass](/funnels/reference#preview-passes), so
somebody who cannot open the utility cannot render an unpublished funnel either.

## Verifying the install

1. CP → **Utilities → Funnels → New funnel**. It opens on a canvas with one **Entry**
   step, already there.
2. Click the **+** under it and add a **Finish** step.
3. **Preview**. The stepper walks entry, then finish.
4. Toggle **Live**, save, and open the public URL shown in the header.

If the utility is missing, the role lacks `access funnels utility`. If the page 404s, the
funnel is not live — an unpublished funnel answers 404 rather than showing a warning, on
purpose: a half-built funnel handed to a visitor is worse than a missing page, because it
takes money in the middle.

## Multiple Control Panel users

Anything that gives different people different access implies more than one CP user, which
requires Statamic Pro:

```dotenv
STATAMIC_PRO_ENABLED=true
```

## Licence

Commercial: `composer.json` says `proprietary`. See [Licensing](/guide/licensing) for how
the commercial addons in the suite resolve their licence.
