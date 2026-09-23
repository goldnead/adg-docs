# Troubleshooting

<AddonHeader />

## Every course is closed

In order:

1. **Is Entitlements installed, at 1.3 or later?** Without it, and without a
   `CourseAccess` binding of your own, every course is closed. That is the default on
   purpose. See [Access and entitlements](/courses/access).
2. **Does the learner hold the course's product?** The product is the course entry's
   `product` field, or the course slug when that is empty.
3. **Is the subject type right?** See the next section.

## A learner with a grant sees nothing

The grant was written under a different subject type than the one this package asks with.
Entitlements addresses a subject as a type and an id, and both have to match.

- On a site whose Statamic users live in Eloquent, the user is unwrapped to its model and the
  model's morph class is used. A checkout that granted to the model matches.
- On a flat-file site, the type is `user` unless
  [`COURSES_SUBJECT_TYPE`](/courses/configuration#entitlements-subject-type) says otherwise.
  Set it to whatever type the grants carry.

## The tags render nothing

`courses:progress`, `courses:lessons` and `courses:continue` render nothing for a guest, for
a course slug that does not exist, and for a learner without access. That is the point: a
template must not leak a paid outline. Check that somebody is signed in and that
`{{ courses }}` reports `has_access` for the course.

## The form renders nothing

[`routes.enabled`](/courses/configuration#routes-enabled) is off, or `COURSES_ROUTES_ENABLED`
is `false`. The tag renders an empty string rather than a form that would post to a 404.

## The form post comes back with an error

Read the code: `{{ get_error:courses }}` after a form post, `{"error": "…"}` for a request
that asks for JSON. The table of codes is on
[Tags and the form routes](/courses/tags#post-courses-progress). The ones that surprise:

- **`proof_required`**: a quiz, assignment or reflection cannot be ticked off by hand. Your
  code calls `Courses::completeLesson()` after checking the proof.
- **`not_acknowledgeable`**: `acknowledge` only works for `text`, `milestone`, `coaching` and
  `exercise`. A video is ticked with `complete`.
- **`locked`**: the lesson's `lock_reason` says which gate holds.

A 419 means the form had no CSRF token. `{{ courses:form }}` includes one; a script sends
`X-CSRF-TOKEN`.

## A video never completes itself

The lesson has no `video_duration`, or one the package cannot read. It takes `mm:ss`,
`hh:mm:ss` or plain seconds; anything else counts as unknown, not as zero, and a video of
unknown length completes only by the learner's tick or by a duration the player sends. See
[Lesson types and proof](/courses/lesson-types#video).

## Every lesson with a week or a number of days stays locked

The learner was never enrolled, so the clock never started: only week 1 is open, and a lesson
waiting for days or a day of the month shows `lock_reason: schedule` with no `available_at`.
A subscription through Payments enrolls its buyer; anything else needs `Courses::enroll()`
where the course starts. See [Who enrolls a learner](/courses/locks#who-enrolls-a-learner).

## A lesson waits for a payment that went through

`lock_reason: payment` counts what Payments reported through its subscription events. A
one-off purchase is no subscription and reports no count, so `payments` and `after_trial`
suit courses sold by subscription. The buyer also needs a Statamic user with the
subscription's email address when the event arrives; a subscription for an address without an
account is skipped (logged at debug level). A site that bills elsewhere calls
`Courses::recordBilling()`.

## A lesson opens a day early or late

The drip by date and by day of the month counts calendar days in
`statamic.system.display_timezone`, and in `app.timezone` only when that is unset. Set the
display timezone to the site's zone. Do not turn `app.timezone` away from UTC on a live site.

## After updating, the new fields are missing from the Control Panel

The blueprints still are the 0.1 ones. Run `php artisan migrate`, then
`php artisan courses:install --merge` (see first with `--dry-run`). Not `--force`, which loses
fields added by hand. See [Upgrading from 0.1](/courses/installation#upgrading-from-0-1).

## The lesson form fails with "An asset container has not been configured"

The download block's file field has no container. `courses:install` writes one in, but a site
without any asset container at install time got a warning instead. Create a container, then
run `php artisan courses:install --force`, or set the container on the field by hand.

## A private download does not show

The block is dropped when Private Media is not installed, when the file lies outside Private
Media's container (logged as a warning), or when there is no signed-in learner to sign the
link for. See [Lesson content](/courses/lesson-content#private-downloads).

## A lesson is missing for one learner but not another

A [visibility rule](/courses/visibility) on the lesson or its section does not match that
learner. A rule that names only LeadHub tags or segments matches nobody without LeadHub, or
for a learner whose email address has no LeadHub contact.

## A passed quiz does not complete the lesson

In order: the questionnaire was submitted by a signed-in user (an anonymous submission counts
for no lesson); the lesson's `assessment` is the questionnaire's handle; the lesson was not
locked when it was submitted; the score reaches `assessment_min_score` and, if levels are set,
the result level is one of `assessment_pass_levels`. A failed attempt shows in
`{{ courses:quiz }}` as `attempts`. See [Quizzes](/courses/quizzes).

## A learner is shut out after a failed payment although they bought the course once

With Entitlements as the bound `CourseAccess`, a payment hold takes away only what the failed
subscription paid for, and another grant keeps the course open. A custom `CourseAccess` cannot
tell grants apart, so there the hold closes the course. A hold set by hand closes it in every
case. The Holds table on the Course Progress screen shows which kind it is. See
[When a payment fails](/courses/payment-failure).

## A team member cannot get in

The member signs in with a different address than the one the buyer added; or the buyer no
longer holds the purchase (refund, expiry, a hold of their own), which closes the course for
the whole team. See [Bundles and teams](/courses/teams).

## Lessons are missing from a course

A lesson belongs to a course through its `course` entries field. A lesson whose field is
empty, or points at an entry in another collection, is not part of any course. If you changed
the [collection handles](/courses/configuration#collections) after installing, the blueprints'
entries fields still point at the old ones; run `php artisan courses:install --force` to
rewrite the blueprints.

## The Course Progress screen says the tables are missing

`php artisan migrate` has not run. The log says the same:
`statamic-courses: the course tables are missing; run php artisan migrate.`

## The Course Progress entry is not in the navigation

The user lacks `view course progress`, or [`cp.enabled`](/courses/configuration#cp) is off.
With Payments installed the entry sits in the suite's shared section rather than under
Content.
