# Seats for groups

<AddonHeader />

One purchase, several accesses. A choir leader buys ten seats for a workshop and hands them
out to her section by email; each person accepts their own seat, and only then do they get
access.

## Turning it on

**Seats per purchase** on the offer, 2 to 1000. Empty means an ordinary purchase.

- **Seats are one-off purchases only.** The form refuses seats on an offer with a rhythm: with a
  subscription every renewal would have to extend the seats, and this version cannot.
- **The product has to grant something.** Seats hand out the product's `grants`. For a product
  that grants nothing the form warns, and a sale logs a warning: seats could be accepted but
  would give access to nothing.

## What happens after the purchase

1. **The buyer gets no access herself.** For a seat offer the catalogue entry carries the grants
   under `seat_grants` instead of `grants`, so [Payments](/payments/) grants nothing to the
   buyer.
2. **A pool opens when the payment is paid**, once per payment line, with `seats × quantity`
   places.
3. **The buyer gets a mail** with a link to a page where she invites people by email, sees who
   accepted, takes seats back and gives them again.
4. **An invited person gets a mail** and accepts on their own page. Only then is access
   granted, under the offer's access window if it has one.

<Figure
  src="offers-seats-manage"
  alt="The buyer's page for a workshop with ten seats: two given, eight free, an invitation form with email and optional name, and the list of given seats with their state and a take-back button"
  caption="The buyer's page. It is authorised by the link in her mail and nothing else." />

Both pages are authorised by a 48-character token and nothing else, because the people who open
them have no account on the site. Keep the mail: the link is the buyer's way in.

The pages live under `seats.prefix`, by default `/!/statamic-offers/plaetze`, and render with
the addon's own small layout. `seats.after_claim_url` adds a button after accepting, for
example to the course login; empty means no button.

Three rules on the buyer's page:

- **One seat per address.** Inviting an address that already has a seat in the pool is refused.
- **No more than bought.** With every seat given, the next invitation is refused until one is
  taken back.
- **The name is a greeting.** It goes into a mail sent under the site's sender, so it is
  limited to letters, spaces, `-`, `.`, `'` and 80 characters.

The writing routes (invite, accept, take back) are throttled at 30 requests a minute: an
invitation sends a mail, and a form that sends any number of mails to any address is a spam
tool.

## Where the access comes from

By default through [Entitlements](/entitlements/), when it is installed: source
`statamic-offers`, reference `seat:<id>`. Two seats for the same person are two accesses, and a
seat given again never revives one that was taken back, because Entitlements refuses the same
tuple.

Access is written and revoked under the **brand of the pool**, not the brand of the request
that opened the page.

Without Entitlements, seats still work, but an accepted seat grants nothing and the log says
so. To grant access some other way, bind your own implementation:

```php
use Goldnead\StatamicOffers\Contracts\SeatAccess;

$this->app->bind(SeatAccess::class, MySeatAccess::class);
```

`revoke()` returns `true` only when there is provably no access left afterwards. `false` leaves
the seat open, to be retried.

## Taking a seat back

On the buyer's page and in the Control Panel. A seat taken back is free again at once, and
whoever had accepted it loses access.

**It is marked as taken back only after its access was revoked.** If Entitlements cannot be
reached at that moment, the seat stays accepted and the log says so. A taken-back seat that is
still shown as accepted is therefore a failed revocation, not a display error.

## Money back, seats back

A **full refund** or a **chargeback** closes every pool of the payment:

- every seat is taken back, and accepted ones lose their access;
- the pool takes no further invitation or acceptance;
- the buyer's page shows what was taken back and nothing to hand out.

Chargebacks need Payments 1.23 or newer; on an older version the event never fires.

A **partial refund** closes nothing. Which seat goes is the buyer's decision, and the page is
there for it.

## Schedule the catch-up

When a pool closes and an access cannot be revoked, that seat stays open. This command retries:

```php
// routes/console.php
Schedule::command('offers:seats-reconcile')->hourly();
```

It is safe to run as often as you like. It prints how many closed pools had open seats, how many
it took back and how many are still open, and **exits non-zero while something is still open**,
so a scheduler that reports exit codes shows it instead of reading "done" every hour.

A redelivered refund or chargeback event retries as well.

## In the Control Panel

The offer panel lists the pools sold under **Seats sold**: buyer, seats given out of seats
bought, open or closed. A closed pool shows the date, the reason and the payment number.

- **Resend link** sends the manage link again, to the buyer's address only.
- **Open page** opens the buyer's page.
- **Take back** per seat, which asks first for an accepted seat.

| Route | Permission |
| --- | --- |
| `POST utilities/offers/seats/{pool}/resend` | `access offers utility` |
| `POST utilities/offers/seats/{pool}/{seat}/revoke` | `access offers utility` |
