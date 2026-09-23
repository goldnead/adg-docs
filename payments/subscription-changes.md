# Pausing, switching and replacing

<AddonHeader />

A running subscription can be paused and resumed, moved to another product with the difference
charged pro rata, or ended by the purchase of something that replaces it. All three arrived in
**1.25** and all three ask the provider first and write the row second, like cancelling does.

<Figure
  src="payments-subscription-paused"
  alt="The subscription detail in the Control Panel, German: status Pausiert, paused since 20 September 2026, resumes on 28 October 2026, and in the history a line reading Pausiert vom 23.07.2026 bis 03.08.2026"
  caption="A paused agreement in the Subscriptions screen: when it was paused, the date it resumes by itself, and earlier pauses in its history." />

## Who may do it

In the Control Panel, pausing, resuming, switching **and cancelling** need the permission
**Manage subscriptions** (`manage payment subscriptions`) on top of `access subscriptions utility`.

::: warning Upgrading from 1.24: roles lose the cancel action
Until 1.24 the screen permission alone could cancel. From 1.25 a role without
`manage payment subscriptions` simply no longer sees the menu entry, with no error anywhere. Add
the permission to every role that should keep cancelling. Super users are not affected. See
[Installation → Upgrading to 1.25](/payments/installation#upgrading-to-1-25).
:::

In the [customer portal](/payments/portal) the buyer may pause where `portal.allow_pause` is on
(or the product says `pausable: true`) and switch where `portal.allow_switch` is on and the
product lists targets under `switch_to`. Both are off by default.

## Pausing and resuming

Row action **Pause** on the Subscriptions screen, with an optional date to resume on. Without a
date the pause lasts until somebody resumes it: row action **Resume**, or the button in the
portal.

- **Stripe** pauses natively (`pause_collection` with `void`: invoices during the pause are
  voided).
- **Mollie** has no pause. The running agreement is ended, and on resume a new one is started
  against the same mandate.
- On both, **nothing is charged during the pause and nothing at the moment of resuming.** The
  next charge falls on the old billing day, counted from the original day: an agreement billed on
  the 31st stays on the 31st.
- Payment plans (instalments), trials and agreements in dunning are not paused.

The status is `paused`, next to `suspended`, which stays the provider's word for failed charges.
A paused agreement can still be cancelled.

### The access during a pause

`pause.access` (env `STATAMIC_PAYMENTS_PAUSE_ACCESS`):

| Value | |
| --- | --- |
| `period_end` (default) | The paid period stays, then the access rests until the resume. |
| `immediate` | The access ends at once and comes back on resume. |
| `keep` | The access stays through the pause. |

### Money that arrives during a pause

A charge that settles during a pause is counted, not dropped. A late direct debit on the
agreement a Mollie pause ended moves the resume date one period on. Stripe lifting a pause on
its own is followed by the row when its charge arrives or on the next refresh
(`SubscriptionResumed` with `by: 'provider'`).

### Resuming on a date

A pause with a date resumes when this runs:

```php
// routes/console.php
Schedule::command('payments:resume-paused')->daily()->withoutOverlapping();
```

Schedule it wherever subscriptions are paused. It also does the [clean-up](#the-clean-up-run)
below, which is reason enough to schedule it even when nobody pauses with a date.

## Switching to another product

Row action **Switch**, and in the portal where it is allowed. Between recurring products with the
same rhythm and the same currency; a switch between a monthly and a yearly product is refused.

- **Upgrade** (the new product costs more): applies at once. The difference for the rest of the
  current period is charged as its own payment (`meta.proration = true`,
  `meta.subscription_change`), and the new amount from the next charge.
- **Downgrade**: applies from the next charge. Nothing is charged or refunded.
- Neither provider prorates on its own side (Stripe gets `proration_behavior=none`).
- A difference below `switch.min_proration_cent` (50) is not charged.
- A running coupon ends with the switch.

**Which products are offered.** The product's `switch_to` list. Without one, the Control Panel
offers the recurring products of the same brand, rhythm and currency. A catalogue entry without
`brand_id` counts as every brand's and is offered to all of them; give entries a `brand_id`, or
give the product a `switch_to` list, to narrow it. The portal only ever offers `switch_to`.

A difference that later fails is marked in the agreement's history. The difference is charged at
most once per switch and period, however often the switch is retried.

## A purchase that replaces a subscription

A catalogue entry with `replaces` ends the buyer's running agreements of those products when it
is paid:

```php
'jahresabo' => [
    'name' => 'Jahresabo',
    'amount_cent' => 19000,
    'interval' => '12 months',     // the provider's own vocabulary
    'replaces' => ['monatsabo'],
],
```

The buyer is matched by the email address on the payment. What is left of the old period moves
the new agreement's first charge back (`replaces_credit`, on by default): a credit as a later
start, never a refund. Event `SubscriptionReplaced`.

## Two requests at once

Every pause, resume, switch and cancellation first **claims** the row with a conditional update
(`active` → `pausing`, `paused` → `resuming`, → `switching`, → `cancelling`) and only then asks the
provider. Two clicks at once, or the portal and the Control Panel at the same moment, reach the
provider once. A cancellation waits for a pause, resume or switch that is still talking to the
provider. Creating an agreement and charging a difference send an idempotency key to Mollie and
Stripe.

A timeout, connection error or 5xx from the provider counts as "no answer", not as a refusal: the
row keeps its claim and the clean-up run settles it. The Control Panel shows those states in
words ("Pausing", "Switching" and so on; "Wird pausiert", "Wird gewechselt" in German). In the portal, a contract that is being
changed right now asks the buyer to try again in a moment; the statutory cancellation button still
works and is noted on the row, then carried out once the change is done.

### The clean-up run

`payments:resume-paused` puts right rows that a dead process left in a claim for more than ten
minutes:

- a half resume: it looks for the agreement the resume started at the provider and adopts it, or
  starts it again under the same key;
- a half pause: finished or put back to `active`;
- a half cancellation: finished, including an agreement a resume or switch left behind;
- a half switch it cannot read back: an error in the log, and a person decides.

For that last case the Control Panel has the row action **Release switch**: somebody checks the
provider and says whether the old or the new product is true.

## Brands

`payments:resume-paused`, `payments:reminders`, the Mollie and Stripe webhooks and Stripe refunds
and disputes run each row's work under that row's brand, through
[Brand Context](/brand-context/)'s `Brands::runFor()`. Listeners that care about the current brand
hear the right one. On brand `0`, or without Brand Context installed, nothing changes.

## Events

| Event | When |
| --- | --- |
| `SubscriptionPaused` | the provider confirmed the pause; `$resumesAt`, `$by` (`cp`, `portal`) |
| `SubscriptionResumed` | it runs again; `$by` (`cp`, `portal`, `schedule`, `provider`) |
| `SubscriptionChanged` | a switch was accepted; from and to product and amount, `$prorationCent`, `$prorationPayment`, `$immediate`, `$by` |
| `SubscriptionReplaced` | a purchase ended another agreement; `$replaced`, `$purchase`, `$replacement`, `$creditCent`, `$creditDays` |

The full list is on [Reference → Events](/payments/reference#events).
