# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=courses-config
```

Ten keys in `config/courses.php`, three of them with an environment variable. There is no
settings screen. What a course does (drip, payment rule, bundles, seats) is set on the course
entry, not here.

| Key | Default | What happens when it is wrong |
| --- | --- | --- |
| `collections.courses` | `'courses'` | Changed after installing, the package looks for courses in a collection that has none. |
| `collections.lessons` | `'course_lessons'` | The same, for lessons. |
| `auto_completion_threshold` | `90` | Percent of a video that counts as watched. Too low, a skipped lesson completes itself. |
| `proof_required_types` | `['quiz', 'assignment', 'reflection']` | A type left out can be ticked off by hand. |
| `record_events` | `true` | Off, nothing is written to `courses_lesson_events`. |
| `downloads.container` | `null` (`COURSES_DOWNLOADS_CONTAINER`) | Read by `courses:install` only. A handle that does not exist falls back to the first container. |
| `routes.enabled` | `true` (`COURSES_ROUTES_ENABLED`) | Off, `POST /!/courses/progress` does not exist and `{{ courses:form }}` renders nothing. |
| `cp.enabled` | `true` | Off, the Course Progress screen and its nav entry are gone. |
| `cp.stuck_after_days` | `14` | Days without activity before a started learner counts as stuck. |
| `entitlements.subject_type` | `null` (`COURSES_SUBJECT_TYPE`) | Must match the type the grants were written with, or every course stays closed. |

## `collections`

```php
'collections' => [
    'courses' => 'courses',
    'lessons' => 'course_lessons',
],
```

The two collections a course is made of. `courses:install` creates them under these handles
and points the blueprints' entries fields at them. **Change them before installing** if a
site already uses the names; the package does not move entries between collections.

## `auto_completion_threshold`

A video lesson counts as completed once this share of it has been watched. 90 is the value
the source site ran with: late enough that a skipped lesson does not count, early enough that
nobody has to sit through the credits.

The share is watched seconds over the lesson's duration, and the duration comes from the
entry's `video_duration` field first. A video without one cannot complete itself by being
watched. See [Lesson types and proof](/courses/lesson-types#video).

## `proof_required_types`

Lesson types a learner cannot tick off by hand, through `setLessonCompletion()` or the POST
route. They complete when the code that checked the proof calls `Courses::completeLesson()`,
for example after grading a quiz. Add a type of your own here if it needs the same treatment.

## `record_events`

Every start, quarter mark and completion is written to `courses_lesson_events`. Turn it off
if nothing reads that table. The lesson states and the two PHP events are unaffected.

## `downloads.container`

```dotenv
COURSES_DOWNLOADS_CONTAINER=assets
```

The asset container the download block picks public files from. It is written into the
lesson blueprint by `courses:install`, so changing it later means running
`courses:install --force` or editing the field by hand. Unset, the install takes the site's
first container other than Private Media's; the public field never defaults to the private
container, because files there are not reachable by URL. A private download has its own field
on Private Media's container, `private-media.source.container`. See
[Lesson content](/courses/lesson-content#downloads).

## `routes.enabled`

```dotenv
COURSES_ROUTES_ENABLED=false
```

Switches off both front-end routes, `/!/courses/progress` and `/!/courses/team`. The switch
is checked where the routes are registered, so a disabled route does not exist, and again in
the controller, so a route cache built while it was on cannot keep it open.
`{{ courses:form }}` and `{{ courses:team_form }}` then render an empty string. A site with
its own endpoints for its player turns it off.

## `cp`

```php
'cp' => [
    'enabled' => true,
    'stuck_after_days' => 14,
],
```

`enabled` removes the nav entry and the route together: a hidden entry with a reachable URL
would not be a disabled screen. `stuck_after_days` is read with a floor of one day.

## `entitlements.subject_type`

```dotenv
COURSES_SUBJECT_TYPE=user
```

The subject type a learner is looked up under in Entitlements when the learner is not an
Eloquent model: a flat-file Statamic user, or a bare id. Unset, it is the auth model's morph
class when Statamic's users live in Eloquent, and `user` when they are flat files. How a
learner becomes a subject is on [Access and entitlements](/courses/access).

## Not in this file: the timezone of a calendar day

The drip by date and by day of the month opens lessons at midnight in Statamic's
`statamic.system.display_timezone`, and in `app.timezone` only when that is unset. Set the
display timezone; leave `app.timezone` on UTC. See [Drip and locks](/courses/locks#by-days-by-date-by-day-of-the-month).
