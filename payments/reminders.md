# Reminders and card expiry

<AddonHeader />

From **1.25** the addon can write to a subscriber before something happens to their money: a
few days before a charge, before the card on file expires, and once it has. Three kinds, **each
off by default**, each with its own switch.

## Switching them on

```dotenv
STATAMIC_PAYMENTS_REMIND_UPCOMING=true   # before every charge
STATAMIC_PAYMENTS_REMIND_CARD=true       # card expiring, and card expired
```

```php
// config/statamic-payments.php
'reminders' => [
    'upcoming' => ['enabled' => …, 'days' => 7, 'mail' => true, 'template' => null, 'subject' => null],
    'card_expiring' => ['enabled' => …, 'days' => 30, 'mail' => true, 'template' => null, 'subject' => null],
    'card_expired' => ['enabled' => …, 'mail' => true, 'template' => null, 'subject' => null],
    'card_check_days' => 7,
],
```

| Kind | Goes out | Event |
| --- | --- | --- |
| `upcoming` | `days` (7) before each charge | `SubscriptionPaymentUpcoming` (`$dueAt`, `$daysBefore`) |
| `card_expiring` | `days` (30) before the card on file expires | `SubscriptionCardExpiring` (`$expiresAt`) |
| `card_expired` | once the card has expired | `SubscriptionCardExpired` (`$expiredAt`) |

`mail: false` keeps the event, for [Automations](/automations/) or a listener of your own, and
sends no mail. A product whose catalogue entry says `reminders => false` gets none.

## The run

Nothing is sent until this is scheduled:

```php
// routes/console.php
Schedule::command('payments:reminders')->dailyAt('09:00')->withoutOverlapping();
```

**Each reminder goes out once per agreement and date**, however often the run goes: it is claimed
in `payment_subscription_notices` under a unique index before anything is sent. Days are counted
in Statamic's display time zone. Each row runs under its own brand
(`Brands::runFor()`), so the mail goes out with that brand's sender.

## The card's expiry

Read from the provider and cached on the row (`card_expires_at`), asked again every
`card_check_days`:

- **Stripe:** the newest card of the customer.
- **Mollie:** the valid credit-card mandate.
- **SEPA direct debit** has no expiry, so it never gets a card reminder.

## The mail

The built-in mail is Blade, addresses the buyer formally ("Sie"), like the family's other
transactional mails, and carries a link into the [customer portal](/payments/portal) to replace
the card. That link works until the day the mail is about. The amount is the amount actually
charged: with a running coupon, the lowered amount, and the coupon with the date of the last
charge it covers.

To write it yourself, set `template` to an [Email Templates](/email-templates/) slug. The
variables are `buyer.*`, `plan.*`, `date`, `date_display` and `portal_url`. `subject` overrides
the subject line.

::: warning SEPA pre-notification is your decision
The SEPA scheme asks for a pre-notification before each direct debit. Whether the provider's own
notice covers that, or the `upcoming` mail should, is a decision for the site. The addon does not
claim either.
:::
