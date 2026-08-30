# The demo playground

Reading about an addon is one thing. Clicking through it is another. A seeded
playground with the whole suite installed runs at
[demo.adriangoldner.dev](https://demo.adriangoldner.dev), and it runs the
released versions: every addon in it is the tag you get from Packagist, not a
development snapshot.

It plays a small agency, **Nordlicht Studio**, with three clients. Every brand
has its own voice, its own products and its own pages, and the whole trade
runs against a Mollie test account. No real money moves.

## Getting in

Sign in to the [Control Panel](https://demo.adriangoldner.dev/cp/auth/login)
with:

```
mira@nordlicht.beispiel
demo-local-password
```

That account has full access. Four more accounts exist with deliberately
restricted permissions, because a demo where everything is allowed hides what
the permission system does.

No account needed for the public sites:

- `/` — Nordlicht Studio itself, including a consent-gated YouTube embed
- `/chorwerkstatt` — courses, a membership, a three-installment training
- `/halbmond` — a record, tickets, a fan club subscription
- `/lindhorst` — a free first consult, a five-session card, a subscription
  with a trial
- `/sonderzeichen` — a brand whose name carries the characters that break
  mail headers, URLs and HTML attributes

## Working in two brands at once

The demo runs in multi-brand mode, so the CP shows the brand switcher. Lists
and forms are scoped to the brand you switched to: the Products screen of
Chorwerkstatt holds four rows, the one of Halbmond holds two, and neither
shows the other's. See [Brands & multi-tenancy](/guide/brands) for what that
means on an ordinary install (short answer: nothing, until a second brand
exists).

## Try a purchase

The checkout runs against Mollie's test environment. Pay with the test card:

```
4242 4242 4242 4242
```

Any future expiry date, any three digits as the CVC. Subscriptions, trials,
installment plans and vouchers all run through the same door.

## What is deliberately broken

The seed data is uncomfortable on purpose. The demo is also the only test run
that drives all addons together, and pleasant data never exercises an error
state. So these are features, not bugs, and fixing them would take the demo's
teeth out:

- Offers that point at a product which does not exist, or which the catalogue
  rejects. They are marked as unsellable instead of silently selling.
- Products with a negative price, a price typed as text, no price at all, and
  one with a dot in its handle.
- A product row that tries to outbid the configuration (`cw-kurs`, 259.00 in
  the row against 249.00 in the config file). The config wins, and the screen
  says so with a badge.
- A product pointing at a concert that was never created (`sz-phantom`):
  flagged in the row and counted in a banner above the table.
- Vouchers that are expired, not yet started, used up, or typed as 500 %.
- A subscription the provider never confirmed, and one that was suspended.
- A funnel with a loop, an orphan, a dead end, and a disabled step in the
  middle of the path.
- An outbound webhook to `127.0.0.1:9` that never answers. It is the only
  failure in the log after a rebuild, and it belongs there: without it, the
  retry schedule and the error classification would have nothing to do.
- An event in the hour that the clock change skips, and one in a different
  time zone than its parent event.
- An account without any role, one whose name carries `&`, `<` and quotes,
  and a mail template with a placeholder nobody fills.

If you install the suite fresh and something looks broken in the same way,
that is worth a bug report. In the demo, it is the scenery.

## Nothing sticks

The playground resets itself every night at 03:17 UTC: content, users,
database, configuration and storage go back to the seeded state. Change
whatever you want, delete whatever you want, seed your own chaos. Tomorrow
morning it is gone.

That also means nobody can lock you out for long: if a previous visitor
changed the password or made a mess of the CP, the next reset undoes it.
