# When a payment fails

<AddonHeader />

A course paid by subscription has to decide what a failed renewal means. The course entry's
`on_payment_failure` says it, in **When a payment fails** under Access and pacing:

| Value | What happens | Lifted by |
| --- | --- | --- |
| `keep` (default) | nothing; access runs out at the end of the paid period, as Entitlements has it | |
| `pause_drip` | the [drip clock](/courses/locks#when-the-drip-pauses) stops; lessons already open stay open | the next paid renewal, or a new purchase |
| `revoke` | what that subscription paid for is taken away at once | the next paid renewal, or a new purchase |

The rule is applied when [Payments](/payments/) reports a failed cycle
(`SubscriptionCycleFailed`) and lifted when it reports a renewal (`SubscriptionRenewed`) or a
new subscription (`SubscriptionStarted`). Both providers, Stripe and Mollie, report through the
same events, so nothing here depends on which one charged. Without Payments the rule does
nothing until your code reports the payment itself; see [Without Payments](#without-payments).

Lifting undoes both kinds of hold, not only the course's current mode, so changing the mode
while a learner is held cannot strand them.

## `revoke` takes away one purchase, not the course

A hold set by a failed subscription remembers that subscription and the payment references of
its grants. While it lasts, only those grants stop counting. **Any other source still opens
the course**: a lifetime grant, a bundle, another subscription, a seat on somebody's team. A
learner who bought the course once and later subscribed to a bundle that contains it keeps
the course when the bundle's payment fails.

This needs [Entitlements](/entitlements/) as the bound [`CourseAccess`](/courses/access): a
custom binding cannot tell grants apart, and a payment hold then shuts the course.

A renewal lifts only the hold its own subscription set; a hold from another, still unpaid
subscription stays. A new purchase lifts every payment hold at once, because the learner has
just paid.

When the buyer of a team is held, the team is held with them: members get in only while the
buyer holds the purchase. See [Bundles and teams](/courses/teams).

## A hold set by hand is absolute

```php
Courses::suspendAccess($user, 'cvt-101');   // closes the course
Courses::restoreAccess($user, 'cvt-101');   // opens it again
```

A hold without a subscription behind it shuts the course, full stop: no grant and no team seat
opens it, and no renewal or purchase lifts it. Only `restoreAccess()` or the Control Panel
does. Use it for the case that is not about money: a chargeback being disputed, an account
under review.

## On the Course Progress screen

Every learner with a hold or a paused drip is listed under **Holds**, below the courses:
learner, course, what kind of hold, since when, and the subscription. The badge says what the
learner sees right now:

| Badge | |
| --- | --- |
| Closed | the course is shut for them |
| Open through another purchase | a payment hold, but another grant keeps the course open |
| Drip paused | the course is open, the drip clock stands still |

The subscription column shows the provider's subscription number, the one support finds at
Stripe or Mollie, and **Set by hand** for a manual hold.

Somebody with the permission `manage course holds` can lift a hold from the row's menu, after
a confirmation. That lifts the hold, the manual one included, and restarts a paused drip, as
a paid renewal would. It is for support: the money arrived another way, or the hold was a
mistake. See [The Course Progress screen](/courses/control-panel#holds).

## Without Payments

A site that bills elsewhere reports the payment itself:

```php
Courses::paymentFailed($user, 'cvt-101');     // applies on_payment_failure, answers the mode
Courses::paymentRecovered($user, 'cvt-101');  // lifts both kinds of payment hold

Courses::pauseDrip($user, 'cvt-101');         // the pieces, one by one
Courses::resumeDrip($user, 'cvt-101');
```

A `revoke` reported this way has no subscription to name, and so no grants to tell apart: it
shuts the course until `paymentRecovered()`. It still counts as a payment hold, not a manual
one.

## Events

`DripPaused`, `DripResumed` (with the seconds the pause lasted), `CourseAccessSuspended` and
`CourseAccessRestored`, each with a `$reason`: `payment_failed`, `payment_recovered`,
`new_purchase`, `released_in_cp` or `manual`. See the [Reference](/courses/reference#events).
