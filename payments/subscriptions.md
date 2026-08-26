# Subscriptions, plans and trials

<AddonHeader />

**One mechanism, three faces.** A subscription runs until somebody stops it. A payment plan
stops counting. A trial starts late. They are not three features: a plan is a subscription
with an end, and building them apart would have meant three cancellation paths and three
ways to get the last instalment wrong.

The difference between the first two is one column: `times`.

## A product becomes recurring

```php
'mitgliedschaft' => [
    'name' => 'Mitgliedschaft',
    'amount_cent' => 1900,
    'interval' => '1 month',        // the provider's own vocabulary
],

'kurs-raten' => [
    'name' => 'Kurs, in drei Raten',
    'amount_cent' => 9900,
    'interval' => '1 month',
    'times' => 3,                   // a payment plan
],
```

`interval` is kept as a string rather than parsed into a number and a unit, because the set
of units is the provider's to define and a parser here would be a second, worse copy of it.

`times` absent means "until somebody cancels". A number means "this many and then done".

## Starting one

```php
use Goldnead\StatamicPayments\Support\Subscriptions;

$checkout = app(Subscriptions::class)->start('mitgliedschaft', $buyer, $returnUrl);

abort_if($checkout === null, 404);
return redirect()->away($checkout->checkoutUrl);
```

`null` means one of three things, and all three are worth distinguishing when you debug:
the product is not recurring, the provider cannot run subscriptions, or
`follow_up.collect_mandate` is off — the last of which is logged as a warning.

### Why it takes two steps

**A subscription needs a mandate, and a mandate needs a payment.** No provider will store a
card because a page asked nicely.

1. An ordinary checkout, with the buyer attached to the provider and marked as a first
   payment. The buyer sees a normal payment page.
2. When *that* payment is confirmed paid — by the webhook, never by the browser coming back
   — the agreement is created against the mandate it left behind.

Doing it the other way round, creating the agreement first and hoping the payment lands,
produces subscriptions with no mandate that the provider refuses for ever, silently, on a
rhythm.

The first cycle is already paid, so the provider's rhythm starts one interval later, and a
plan of three instalments asks the provider for **two** more. Asking for three would charge
four in total.

## Trials, and the trade they involve

```php
'mitgliedschaft' => [
    'name' => 'Mitgliedschaft',
    'amount_cent' => 1900,
    'interval' => '1 month',
    'trial_days' => 14,
    'trial_amount_cent' => 100,
],
```

On Mollie there is **no way to store a card without charging something**: no SetupIntent, no
zero authorisation. So a free trial is one of two things, and the config says which:

- a small charge now (`trial_amount_cent`), the card on file, the trial real for everything
  after it; or
- no charge and no card, which means the buyer has to come back and pay by hand — honest,
  and most of them will not.

Hiding that behind the word "trial" would be the wrong kind of convenience.

The difference between the ordinary price and what the trial charges is recorded as a
`Discount` with the code `trial`, so the receipt says what the thing costs *and* what came
off it.

::: warning A trial and a coupon cannot both apply today
`Checkout::start()` takes one `Discount`, and the trial takes it. That is a real limitation
rather than an oversight: two reductions on one line need a rule about which comes off
first, and inventing that rule quietly is how a receipt ends up saying something nobody can
reproduce.
:::

## Every cycle is an ordinary payment

A cycle the provider charges on its own arrives as a plain `Payment` with a `PaymentItem`,
built from the **agreement** and never from the webhook body. It fulfils through the
ordinary path: same claim, same `PaymentPaid`.

So a listener that grants access per payment keeps a subscriber in step without knowing
subscriptions exist. And a report over payment lines includes recurring revenue rather than
leaving all of it out.

Counting a cycle is claimed with a conditional update too, so a redelivered webhook does not
count the same month twice — and the count is what decides when a payment plan is finished.

While the addon is talking to the provider about a cycle it also asks how the **agreement**
is doing, so a suspension after failed charges reaches the row rather than leaving the
screen saying "active" for somebody whose card stopped working.

## Cancelling

```php
app(Subscriptions::class)->cancel($subscription);   // bool
```

**The provider is told first, and its answer is what gets written.** Marking the row
cancelled and hoping is how somebody keeps being charged for a thing their account says
they cancelled.

A provider that refuses, or that accepts the call and goes on reporting the agreement as
running, leaves the row untouched and returns `false`.

In the Control Panel the same method backs a row action and a bulk action under
**Utilities → Subscriptions**, behind the `access subscriptions utility` permission — and a
refusal produces a **red** toast rather than the green one the Control Panel gives every
action by default.

## Ended is not cancelled

| Event | Means |
| --- | --- |
| `SubscriptionCancelled` | Somebody stopped it |
| `SubscriptionEnded` | A payment plan paid its last instalment |

An automation that sends "sorry to see you go" on both would say it to a customer who just
paid everything they owed.

`SubscriptionStartFailed` is the third one to listen for: the money arrived, the payment row
says so, and the agreement behind it does not exist. It is the worst quiet outcome this
addon can produce, so it is not quiet — the payment also carries
`meta.subscription_start_failed_at` and `meta.subscription_start_error`, so a report can
find them without having listened.

## The access a subscription pays for

With [Entitlements](/entitlements/) installed and `entitlements.enabled` on, the bridge keeps
a grant in step by itself. Three rules, each deliberately *not* the obvious thing:

- **A renewal is not a second grant.** It calls the sibling's `renew()`, not `grant()` —
  which refuses to widen an existing window on purpose, because a retry is not a renewal. So
  granting once a month would write a grant a month, and a year of membership would be
  twelve rows. Needs `statamic-entitlements` 1.1; against an older sibling the bridge stays
  quiet rather than writing the wrong thing.
- **Cancelling is not revoking.** Somebody who cancels has paid for the period they are in
  and keeps it to the end. Revoking would take away time they bought, and in the sibling a
  revocation carries a reason precisely because it means "taken away deliberately".
- **A renewal without a date from the provider changes nothing**, and says so in the log. The
  provider knows when it will charge again; a guess here is a grant that ends too early or
  too late, and either way the customer finds out first.

## The Control Panel screen

**Utilities → Subscriptions**: the agreements rather than the money. Product, whether it is a
subscription or a payment plan, what one cycle costs, the rhythm, how many cycles have been
charged (`2 / 3` while there is an end to count towards), the next charge, the status and
the buyer. Sorted by what is charged next, so what is about to happen is at the top.

Two filters: **Status**, and **Still running**. Clicking a row opens a read-only slide-over
with the whole agreement and the cycles actually paid — which are ordinary payments, so they
also appear on the Payments screen.

Nothing here creates a subscription. One is what a confirmed first payment leaves behind,
never something typed into a form.

## Statuses

| Status | |
| --- | --- |
| `initiated` | The row exists; the provider has not answered yet |
| `pending` | The provider has it and has not started charging |
| `active` | Running |
| `suspended` | The provider stopped charging, usually after failed attempts |
| `cancelled` | Somebody stopped it |
| `completed` | A payment plan paid its last instalment |

`isLive()` is the question "will this still be charged", and it is what the **Still running**
filter and the cancel action both ask.
