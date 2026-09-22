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
[Tags and the form route](/courses/tags#post-courses-progress). The ones that surprise:

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

## Every lesson with a week stays locked

The learner was never enrolled, so the clock never started and only week 1 is open. Call
`Courses::enroll()` where the course starts. See [Drip and locks](/courses/locks#drip-by-schedule).

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
