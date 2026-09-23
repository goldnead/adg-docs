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

Four packages are hard dependencies and install alongside it:

| Package | Constraint | Why |
| --- | --- | --- |
| `goldnead/statamic-brand-context` | `^1.13` | Brands, the settings tab, and the brand an order is checked under. |
| `goldnead/statamic-flow-canvas` | `^1.3` | The editor. The same canvas the automations editor runs on, not a copy of it. |
| `goldnead/statamic-offers` | `^1.11.1` | What a thing costs. An offer step sells an offer, at the price that lives there. |
| `goldnead/statamic-payments` | `^1.22` | Takes the money, and decides what "paid" means. |

Parts of the checkout need newer siblings than these floors, and switch themselves off
without them: the coupon from a link, pay what you want and the country question need
[Offers](/offers/) 1.12; the captcha, the reminder consent and a funnel-wide coupon on a
one-click upsell need [Payments](/payments/) 1.25. See
[The checkout step](/funnels/checkout).

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

A walk advances inside the request that advances it, or inside the webhook that paid for it.
No scheduler entry is needed. A queue worker is: mail nodes, the step pictures in the editor
and the [Meta Conversions API](/funnels/tracking#meta-conversions-api) events are queued jobs.

## Permissions

The Control Panel screens sit behind Statamic's utility permission,
`access funnels utility`. Grant it per role under **CP → Users → Permissions →
Utilities**. Two more, under the group Funnels:

| Permission | Allows |
| --- | --- |
| `edit funnels tracking code` | Changing a funnel's [tracking code](/funnels/tracking#who-may-edit-it), pixel ID and consent services. Without it those fields are read-only. |
| `manage funnels settings` | The Funnels tab on the suite's settings screen |

## Updating to 1.17

No migrations. Two changes in behaviour to check before updating a live site:

- **Frames from other domains.** Funnel pages now send
  `Content-Security-Policy: frame-ancestors 'self'` plus the domains listed on the funnel. A
  site that frames a funnel from another domain has to be listed on it. See
  [Embedding](/funnels/embedding#which-sites-may-frame-it).
- **HTML in texts is shown as text.** Headline, text, offer and bump texts, labels and the
  withdrawal wording are escaped. Markdown still works. See
  [The checkout step → Escaping](/funnels/checkout#escaping).

Grant `edit funnels tracking code` to whoever should maintain tracking code, and republish the
front-end assets (`vendor:publish --tag=statamic-funnels --force`) for the new `embed.js` and
`funnels.js`.

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
