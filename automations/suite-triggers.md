# Triggers from the suite

<AddonHeader />

When a sibling addon of the suite is installed, its events become triggers in the node
library. Nothing is configured on either side: the addon is detected at boot with
`class_exists`, the same way as [LeadHub and Marketing](/automations/integrations), and its
triggers appear. Uninstall it and they go.

Every trigger puts flat fields into the run context, so a mail can say
`{{ subscription.product }}` and a Condition can compare `attempt` without a lookup of its own.
The fields are listed in the node's output schema in the editor.

<Figure
  src="automations-library-suite"
  alt="The node library filtered by kurs, listing the course triggers with German labels and descriptions, next to a flow whose trigger is payments.subscription_paused"
  caption="The library in a German Control Panel. Searching finds a trigger by its label and by its handle." />

## Payments

Needs [Payments](/payments/). Of the eleven triggers new in Automations 2.20, the
subscription, card and block triggers need Payments 1.25; Payment Charged Back fires from
Payments 1.23 on.

| Trigger | Handle | Fires when | Extra filter |
| --- | --- | --- | --- |
| Payment Paid | `payments.paid` | a payment is confirmed paid by the provider | |
| Payment Failed | `payments.failed` | a payment is reported failed, expired or cancelled | |
| Payment Refunded | `payments.refunded` | a refund is recorded, in full or in part | only full refunds |
| Payment Charged Back | `payments.charged_back` | the bank reverses a payment. Payments withdraws the access itself; use this to alert a person | |
| Checkout Abandoned | `payments.checkout_abandoned` | a checkout was started and left unpaid past the waiting period | |
| Checkout Blocked | `payments.checkout_blocked` | a checkout is refused by the block list, the rate limit or the captcha | reason |
| Subscription Started | `payments.subscription_started` | a subscription is confirmed and its first cycle is paid | |
| Subscription Start Failed | `payments.subscription_start_failed` | a subscription payment succeeded but no subscription was created behind it | |
| Subscription Renewed | `payments.subscription_renewed` | once per cycle charged and paid | |
| Subscription Charge Failed | `payments.subscription_attempt_failed` | once per failed charge of a running subscription, with the number of failures in a row | only failure number *n* |
| Subscription Payment Upcoming | `payments.subscription_payment_upcoming` | a set number of days before the next charge | |
| Card Expiring | `payments.subscription_card_expiring` | the card behind a subscription expires soon. Stripe cards and Mollie credit card mandates only | |
| Card Expired | `payments.subscription_card_expired` | the card has expired and the next charge would fail | |
| Subscription Paused | `payments.subscription_paused` | a subscription is paused, in the Control Panel or by the customer in the portal | |
| Subscription Resumed | `payments.subscription_resumed` | a paused subscription runs again, by hand or on the date set when pausing | |
| Subscription Changed | `payments.subscription_changed` | a subscription moves to another product | upgrade or downgrade |
| Subscription Replaced | `payments.subscription_replaced` | a purchase ends an earlier subscription of the same customer, as the product is set up to do | the replaced product |
| Payment Plan Completed | `payments.subscription_plan_completed` | the last instalment of a payment plan is paid | |
| Subscription Cancelled | `payments.subscription_cancelled` | the provider confirms a cancellation | |
| Subscription Ended | `payments.subscription_ended` | a subscription reaches its own end | |

**Two pairs fire on the same moment**, and each trigger's description says so. A paid-off
payment plan fires both `subscription_plan_completed` and `subscription_ended`; use one of the
two in a flow, not both.

**Failure number.** `subscription_attempt_failed` fires once per failed charge, not once per
webhook delivery, and carries `attempt`: 1 for the first failure, counting up, reset by a paid
cycle. On Stripe, the provider's own retries of one invoice stay one attempt. With the filter,
one flow answers the first failure gently and another the third one firmly.
`SubscriptionCycleFailed`, which fires per delivery, is deliberately not a trigger.

**Context.** The subscription carries `paused_at` and `resumes_at` on every subscription
trigger. `subscription_paused` adds `resumes_at` and `by`, `subscription_payment_upcoming` adds
`due_at` and `days_before`, the card triggers `expires_at` or `expired_at`.
`subscription_changed` has a `change` block with both products and amounts, the credit
(`proration_cent`), `direction`, whether it applied at once, and the payment for the difference.
`subscription_replaced` has `replaced`, `replacement`, the `purchase` and the `credit` given.

### Checkout Blocked is for your team

`payments.checkout_blocked` is meant for an alert to a person: the reason (blocked address,
blocked domain, blocked IP address, too many attempts, captcha failed), the email the visitor
typed, and the network they came from. **Do not send mail to `blocked.email`**: it is whatever
the refused visitor typed.

The run context holds **no full IP address**, only the network: `blocked.ip_prefix`, the /24
for IPv4 or the /48 for IPv6. A run context is stored, shown in the run log and can be sent on
by a webhook node. The network is enough to see a pattern.

### Filter by product, offer or pricing option

Every payments trigger that concerns a product has three filters:

| Filter | Matches |
| --- | --- |
| Product | exactly this product handle, as before |
| Offer | every purchase through this [offer](/offers/), whichever pricing option or amount was chosen: `offer:kurs`, `offer:kurs:raten3`, `offer:kurs:=2500` |
| Pricing option | exactly one pricing option, for example the instalment plan `offer:kurs:raten3` |

*Product* stays exact on purpose, so a saved flow on `offer:kurs` does not suddenly start on the
instalment plan too. For "any way of buying this course" pick *Offer*, for "only the instalment
plan" *Pricing option*. Both lists are narrowed to the current brand and need
[Offers](/offers/) installed to fill them. The handle is split with Offers' own parser when it
is there, and by the same rule otherwise.

Only the main product of a payment is compared. A bump bought with it does not match.

<Figure
  src="automations-pricing-option-filter"
  alt="A flow on Payment Paid with the trigger's settings open: Product and Offer left empty, Pricing option set to one instalment option"
  caption="A flow that only starts for one pricing option of an offer." />

## Funnels

Needs [Funnels](/funnels/); `funnels.upsell_declined` needs Funnels 1.17.

| Trigger | Handle | Fires when | Filter |
| --- | --- | --- | --- |
| Funnel Step Entered | `funnels.step_entered` | a visitor arrives on a step | funnel, step |
| Funnel Form Submitted | `funnels.form_submitted` | the form on a step is submitted | funnel |
| Funnel Offer Accepted | `funnels.offer_accepted` | an offer is accepted and the payment went through | funnel |
| Funnel Offer Declined | `funnels.offer_declined` | every decline of an offer | funnel, step, offer |
| Upsell Declined | `funnels.upsell_declined` | a buyer declines an offer after a paid purchase in the same funnel | funnel, step, offer, bought offer |
| Funnel Completed | `funnels.completed` | a visitor reaches the end of a funnel | funnel |

`offer_declined` and `upsell_declined` fire on the same click when the visitor had already paid.
To follow up buyers only, use `upsell_declined`: it carries what they bought under `payment`,
and *Bought offer* narrows it to one purchase, whichever pricing option was chosen.

## Courses

Needs [Courses](/courses/).

| Trigger | Handle | Fires when |
| --- | --- | --- |
| Learner Enrolled | `courses.learner_enrolled` | once, on the first enrollment in a course |
| Lesson Completed | `courses.lesson_completed` | a lesson is completed, by hand, by watching it or by passing its quiz |
| Lesson Unlocked | `courses.lesson_unlocked` | a lesson opens because of something the learner did or paid; not for lessons opened by date alone |
| Quiz Passed | `courses.quiz_passed` | the quiz in a lesson is passed |
| Quiz Failed | `courses.quiz_failed` | every attempt that did not pass |
| Course Completed | `courses.course_completed` | once, when every lesson is completed |
| Drip Paused | `courses.drip_paused` | new lessons stop opening, for example after a failed payment |
| Drip Resumed | `courses.drip_resumed` | new lessons open again after a pause |
| Course Access Suspended | `courses.access_suspended` | a course is closed for a learner, after a failed payment or by hand |
| Course Access Restored | `courses.access_restored` | a closed course opens again |
| Team Member Added | `courses.team_member_added` | a buyer gives a team seat to somebody |
| Team Member Removed | `courses.team_member_removed` | a buyer takes somebody off a course team |

Filters: the course (entry ID or slug), and on the lesson and quiz triggers the lesson slug.

Course events carry only IDs. The trigger looks the learner up and puts them under `user`
(`id`, `email`, `name`), and the course under `course` with its title. `user.email` is therefore
the subject of the run, and "only once per person" works without a setting. A learner who can no
longer be found, because the user was deleted, is skipped with a warning in the log rather than
started with an empty subject.

On the two team triggers the **member** is the subject (`member.email`), and the buyer is under
`owner`.

## Affiliates

Needs [Affiliates](/affiliates/).

| Trigger | Handle | Fires when | Filter |
| --- | --- | --- | --- |
| Commission Earned | `affiliates.commission_earned` | a sale earns a partner a commission or a joint-venture share | kind: sale, recurring payment, order bump, upsell, joint venture |
| Commission Reversed | `affiliates.commission_reversed` | a commission is taken back after a refund, a chargeback or by hand | |
| Partner Applied | `affiliates.partner_applied` | somebody applies to the partner programme | |
| Partner Approved | `affiliates.partner_approved` | a partner is approved and can start referring | |

The partner is in the context with address and code. Their payout details are not, on purpose.

## Entitlements, Booking, Invoices

| Trigger | Handle | Needs |
| --- | --- | --- |
| Access Granted · Pending Confirmation · Renewed · Revoked · Expired | `entitlements.granted` · `entitlements.pending` · `entitlements.renewed` · `entitlements.revoked` · `entitlements.expired` | [Entitlements](/entitlements/) |
| Booking Made · Rescheduled · Cancelled | `booking.made` · `booking.rescheduled` · `booking.cancelled` | [Booking](/booking/) |
| Invoice Issued · Credit Note Issued | `invoices.issued` · `invoices.credit_note_issued` | [Invoices](/invoices/) |

## The brand comes from the event

With [multi-brand](/guide/brands) on, a flow belongs to a brand. Since 2.20 a sibling's event
starts the flows of **the brand the event belongs to**, not of whatever brand happens to be
current:

1. an explicit `brandId` on the event (every Courses event carries one from Courses 0.2);
2. otherwise the `brand_id` of the subscription, payment, partner, commission or grant it
   carries;
3. for a course event without either, the brand of the course entry's Statamic site, through
   `brand-context.sites`.

The lookup and the run happen inside that brand, and the request's own brand is untouched
afterwards. This matters for events that no request carries. Before 2.20 a command such as
`payments:reminders` has no current brand, so its reminders started nothing, and a webhook fell
back to the default brand and started the wrong brand's flows, with the wrong sender. That
applied to the older `payments.*`, `entitlements.*`, `booking.*` and `invoices.*` triggers as
well.

An event with no brand of its own and none current starts nothing and logs
`Automations: event carries no brand and none is current; no automation started.` An event that
names a brand that does not exist logs the same way. Without `multi_brand` nothing changes.

## Labels in German

In a German Control Panel, the label, description and group of every Payments, Funnels, Courses
and Affiliates trigger are German, so searching the library for "abo" finds the subscription
triggers. The strings live in the addon's own translation namespace, so a word like "Courses"
is not translated in other addons as a side effect. The trigger's settings fields are still in
English.

## Detection

The detector's class names can be overridden per integration under
`automations.integrations.<name>.detect`, as for the others: `payments`, `funnels`, `courses`,
`affiliates`, `offers`, `entitlements`, `booking`, `invoices`. No migration and no required
config key comes with any of these triggers.
