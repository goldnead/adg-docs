# Drip and locks

<AddonHeader />

Four gates decide whether a lesson is locked, applied in this order:

1. the course's `sequencing_mode`;
2. the lesson's prerequisites, until each is completed;
3. its phase, until every earlier phase is completed;
4. the course's drip (`drip_mode`), with the lesson field that mode reads.

And one rule over all four: **a completed lesson is never locked**, so a learner can always go
back. Writes to a locked lesson are refused, from the facade (`null`) and from the route
(`locked`).

A lesson hidden from the learner by a [visibility rule](/courses/visibility) is not part of
the course for them at all, so it is neither locked nor in anybody's way.

## Lock reasons

A locked lesson carries `lock_reason`, a stable code a template can translate:

| Code | |
| --- | --- |
| `schedule` | the drip has not reached it yet; `available_at` says when, and is empty while no date can be promised (the learner is not enrolled yet) |
| `payment` | the drip waits for a payment: `payments` or `after_trial` mode |
| `paused` | the drip clock is paused after a failed payment, and the lesson would be open by now otherwise |
| `prerequisite` | a prerequisite lesson is not completed |
| `phase` | an earlier phase is not completed |
| `sequence` | the course's sequencing holds it |

When more than one gate holds, the first in that table wins: the reason a learner can do least
about. A lesson held by the drip reports the drip reason first, also before the learner
enrolled.

## Sequencing

On the course entry, `sequencing_mode`:

| Value | |
| --- | --- |
| `none` (default) | no locks from the order |
| `lesson` | each lesson waits for the one before it |
| `section` | each section waits for every lesson of the sections before it |

Reading order is `section_order`, then `sort_order` within the section. Sections are grouped by
`section_key`.

## Prerequisites

`prerequisite_lessons` on a lesson entry lists lessons of the same course. The lesson opens
once all of them are completed. Any lesson can name any other, independent of sections and
phases.

## Phases and test-out

`phase_key` and `phase_order` on a lesson group it into a phase. A lesson in phase *n* waits
until every lesson of every earlier phase is completed.

A **test-out** lesson (`is_test_out`) is the exception: it stays open while its phase is
locked, so a learner who already knows the material can skip ahead. Completing it with
`completeLesson()` completes the unfinished lessons of the earlier phases, marked as skipped.
In `{{ courses:lessons }}` those show `status: skipped` and `is_skipped: true`;
`progress:status` stays `completed`, which is what the rollup counts.

A **milestone** in a phase completes itself once the phase's other lessons are done. See
[Lesson types and proof](/courses/lesson-types#text-milestone-coaching-exercise).

## Drip

The course entry's `drip_mode` says what the drip counts. Each lesson says when it opens, in
the field that mode reads (the lesson blueprint's **Drip** section). **A lesson without the
field, or with 0, opens at once in every mode.**

| `drip_mode` | Lesson field | The lesson opens |
| --- | --- | --- |
| `none` (default) | | at once |
| `schedule` | `week` | in week *n*, which starts `(n − 1) × 7` days after enrollment, or earlier with `advanceToWeek()` |
| `days` | `drip_after` | *n* days after enrollment |
| `date` | `drip_date` | on that calendar day |
| `day_of_month` | `drip_after` | the *n*th time the course's `drip_day_of_month` comes round, the enrollment day included |
| `payments` | `drip_after` | once *n* payments went through, the first included |
| `after_trial` | `drip_after` ≥ 1 | once the first charge after a trial went through; at once for a buyer without a trial |

### By week

Week 1 is open without an enrollment, so a course can be started at all.

```php
Courses::enroll($user, 'cvt-101');           // starts the clock; enrolling again keeps the first date
Courses::advanceToWeek($user, 'cvt-101', 4); // moves the learner on ahead of the calendar
```

The open week is the later of the week the calendar has reached and the week the learner was
moved to. `advanceToWeek()` never moves back: a week that was open stays open.

### By days, by date, by day of the month

`days` counts whole days from the enrollment. `date` opens a lesson at the start of the
day in `drip_date`, for everybody at once, enrolled or not.

`day_of_month` reads a second field on the course, `drip_day_of_month` (1 to 31, default 1).
With the 15th and `drip_after: 1`, a learner who enrolls on the 3rd gets the lesson on the 15th
of the same month, `drip_after: 2` on the 15th of the next. A learner who enrolls on the 20th
gets the first on the 15th of the next month. A day the month does not have falls on its last
day: the 31st in February is the 28th or 29th.

::: tip Calendar days are counted in the display timezone
A date and a day of the month open at midnight in Statamic's
`statamic.system.display_timezone`, the zone the Control Panel shows dates in, and in
`app.timezone` only when that is not set. Leave `app.timezone` on UTC on a live site and set
the display timezone instead: turning `app.timezone` moves every timestamp already stored.
:::

### By payments

`payments` and `after_trial` count what [Payments](/payments/) reports for the course's
subscription, for Stripe and Mollie alike: the first payment and every renewal. A lesson
waiting for one carries `lock_reason: payment` and no `available_at`, because nobody can
promise when a charge goes through.

`after_trial` is for a subscription with a trial: the trial's own start counts as the first
payment, so the lesson opens with the second, the first real charge. A buyer whose plan has
no trial gets it at once.

A site that bills elsewhere writes the count itself:

```php
Courses::recordBilling($user, 'cvt-101', payments: 3, trialUntil: null);
```

The count never goes down.

### When the drip pauses

With [`on_payment_failure: pause_drip`](/courses/payment-failure) the clock stops when a
payment fails: nothing opens that was not open at that moment. A lesson that would have opened
in between reports `paused`. When the payment arrives the clock runs again, and every release
date relative to the enrollment moves on by as long as the pause lasted, so ten unpaid days
bring the next lessons ten days later, not all at once. A fixed `drip_date` does not move.

## Who enrolls a learner

Relative modes count from the enrollment. Without one, a lesson that waits for days, a day of
the month or a week after the first is locked with `lock_reason: schedule` and no
`available_at`.

- **With [Payments](/payments/) installed, a subscription enrolls its buyer.** On
  `SubscriptionStarted`, courses enrolls the Statamic user with the subscription's email address
  in every course the subscription's product (or a product its catalogue entry grants) opens,
  directly or as a bundle, and records the first payment and the trial. A buyer without a user
  account yet is skipped; the grant itself is Payments' business.
- **Everything else is yours to call.** A one-off purchase, a manual grant or a free course
  starts the clock only when your code calls `Courses::enroll()`, for example when the grant
  arrives or on the course's first page. No tag or route enrolls.
