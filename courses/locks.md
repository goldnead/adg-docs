# Drip and locks

<AddonHeader />

Four gates decide whether a lesson is locked, applied in this order:

1. the course's `sequencing_mode`;
2. the lesson's prerequisites, until each is completed;
3. its phase, until every earlier phase is completed;
4. with `drip_mode: schedule`, its week.

And one rule over all four: **a completed lesson is never locked**, so a learner can always go
back. Writes to a locked lesson are refused, from the facade (`null`) and from the route
(`locked`).

## Lock reasons

A locked lesson carries `lock_reason`, a stable code a template can translate:

| Code | |
| --- | --- |
| `schedule` | its week has not opened yet; `available_at` says when, and is empty while the learner is not enrolled |
| `prerequisite` | a prerequisite lesson is not completed |
| `phase` | an earlier phase is not completed |
| `sequence` | the course's sequencing holds it |

When more than one gate holds, the first in that table wins: the reason a learner can do least
about.

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

## Drip by schedule

On the course entry, `drip_mode: schedule`, and on a lesson, `week`. Week *n* opens
`(n − 1) × 7` days after the learner enrolled. Week 1 is open without an enrollment, so a
course can be started at all. A lesson without a `week` is not held by the schedule.

```php
Courses::enroll($user, 'cvt-101');           // starts the clock; enrolling again keeps the first date
Courses::advanceToWeek($user, 'cvt-101', 4); // moves the learner on ahead of the calendar
```

The open week is the later of the week the calendar has reached and the week the learner was
moved to. `advanceToWeek()` never moves back: a week that was open stays open.

Weekly from enrollment is the only schedule. There is no "open after N days" per lesson and no
fixed calendar date.

::: tip Enrolling is yours to call
Only `enroll()` and `advanceToWeek()` start the clock; no tag, route or listener in the package
calls them. Call `enroll()` where your site starts a course, for example when the grant
arrives, or the learner stays in week 1.
:::
