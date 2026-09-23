# Tags and the form routes

<AddonHeader />

All tags work for the signed-in learner. **Without access to the course they render
nothing**, so a template cannot leak a paid outline to a guest or to a learner who has not
bought it.

## `{{ courses }}`

Every course, each with `has_access` and, when that is true, its `progress`.

```antlers
{{ courses only="accessible" }}
    <a href="{{ url }}">{{ title }}</a> {{ progress:percent }} %
{{ /courses }}
```

| Parameter | |
| --- | --- |
| `only="accessible"` | only the courses the learner may open |

A guest sees every course with `has_access: false` and no progress. Each row carries the
course fields: `id`, `slug`, `title`, `summary`, `product`, `bundles`, `sequencing_mode`,
`drip_mode`, `drip_day_of_month`, `on_payment_failure`, `team_seats`, `url`.

## `{{ courses:progress }}`

The rollup for one course.

```antlers
{{ courses:progress course="cvt-101" }}
    {{ completed_lessons }}/{{ total_lessons }}
{{ /courses:progress }}
```

| Variable | |
| --- | --- |
| `status` | `not_started`, `in_progress` or `completed` |
| `percent` | completed lessons over all lessons, rounded down |
| `completed_lessons`, `total_lessons` | |
| `continue_lesson` | `slug`, `title`, `url` of the first lesson that is neither locked nor completed |
| `last_activity_at` | |
| `sequencing_mode`, `drip_mode` | the course's own |

## `{{ courses:lessons }}`

Every lesson of a course, flat, in reading order: section, then position in the section.

```antlers
{{ courses:lessons course="cvt-101" }}
    {{ title }}:
    {{ if is_completed }}done{{ elseif is_locked }}{{ lock_reason }}{{ else }}open{{ /if }}
{{ /courses:lessons }}
```

| Variable | |
| --- | --- |
| `slug`, `title`, `url`, `item_type` | |
| `status` | `not_started`, `in_progress`, `completed`, or `skipped` for a lesson a test-out completed |
| `completion_percent` | |
| `is_locked`, `lock_reason` | `schedule`, `payment`, `paused`, `prerequisite`, `phase` or `sequence`; see [Drip and locks](/courses/locks#lock-reasons) |
| `available_at` | when a lesson held by the drip opens, ISO 8601; empty when no date can be promised |
| `is_completed`, `is_skipped` | |
| `progress` | the lesson state; `progress:status` stays `completed` for a skipped lesson |

The lesson's own fields travel along too: section and phase keys and titles, `week`,
`drip_after`, `drip_date`, `is_test_out`, `est_minutes`, `assessment`. A lesson
[hidden](/courses/visibility) from the learner is not in the list.

## `{{ courses:continue }}`

The next lesson that is open and not finished. Empty when there is none.

```antlers
{{ courses:continue course="cvt-101" }}
    <a href="{{ url }}">Continue with {{ title }}</a>
{{ /courses:continue }}
```

## `{{ courses:blocks }}`

The content blocks of the lesson in context, or of the entry id in `lesson="…"`. As a single
tag it renders the shipped partials; as a pair it hands the blocks to the template. Nothing
for a lesson that is locked or hidden for the learner; super users see every lesson. Fields
per block and how to override a partial: [Lesson content](/courses/lesson-content).

```antlers
{{ courses:blocks }}
```

## `{{ courses:quiz }}`

The quiz of the lesson in context and the learner's result: `assessment`, `url`, `passed`,
`attempts`, `score`, `result_key`, `pass_score`, `pass_levels`. Nothing for a lesson without
a quiz. See [Quizzes](/courses/quizzes#in-a-template).

```antlers
{{ courses:quiz }}{{ if passed }}Passed{{ else }}<a href="{{ url }}">Take the quiz</a>{{ /if }}{{ /courses:quiz }}
```

## `{{ courses:team }}` and `{{ courses:team_form }}`

The signed-in buyer's team for a course, and a form that adds (`do="add"`, the default) or
removes (`do="remove"`) a member by `email`. Both render nothing for somebody who is not the
buyer of a purchase with seats; the form also renders nothing with the routes off. See
[Bundles and teams](/courses/teams#in-a-template).

```antlers
{{ courses:team course="cvt-101" }}{{ left }} of {{ seats }} seats free{{ /courses:team }}
{{ courses:team_form course="cvt-101" }}<input type="email" name="email"> <button>Add</button>{{ /courses:team_form }}
```

## `{{ courses:form }}`

A form that posts to the route below, with the hidden fields filled in.

```antlers
{{ courses:form course="cvt-101" lesson="reading" do="acknowledge" redirect="/courses/cvt-101" }}
    <button>Mark as read</button>
{{ /courses:form }}
```

| Parameter | |
| --- | --- |
| `course`, `lesson` | slugs |
| `do` | `complete` (default), `incomplete`, `acknowledge` or `progress`; anything else falls back to `complete` |
| `redirect` | where to go afterwards; only a path on this site is followed |

With [`routes.enabled`](/courses/configuration#routes-enabled) off the tag renders an empty
string, so a template cannot point learners at a 404.

## `POST /!/courses/progress`

The route behind the form, usable from a script as well. Mounted under Statamic's action
prefix, inside the `web` group, so it carries sessions and CSRF. Throttled to 60 requests a
minute.

| Field | |
| --- | --- |
| `course`, `lesson` | required |
| `action` | required: `complete`, `incomplete`, `acknowledge` or `progress` |
| `watched_seconds`, `resume_seconds` | for `progress`; integers from 0 |
| `video_duration_seconds` | for `progress`; counts only when the lesson entry has no duration |
| `_redirect` | a local path; anything else redirects back |

Four gates, in this order: the route switch, a signed-in user, access to the course, and the
lesson's own lock and type rules. A request that asks for JSON gets
`{"lesson": …}` or `{"error": "…"}`; a form post is redirected, with the error flashed.

| Code | Status | Why |
| --- | --- | --- |
| `unauthenticated` | 401 | nobody is signed in |
| `unknown_course` | 404 | no course with that slug |
| `no_access` | 403 | [`CourseAccess`](/courses/access) said no |
| `unknown_lesson` | 422 | the lesson is not in this course |
| `locked` | 422 | see [Drip and locks](/courses/locks) |
| `proof_required` | 422 | `complete`, `incomplete` or `progress` on a type in `proof_required_types` |
| `not_video` | 422 | `progress` on a lesson that is not a video |
| `not_acknowledgeable` | 422 | `acknowledge` on a type that cannot be acknowledged |
| `refused` | 422 | the checks passed, but the write was refused anyway: something changed in between |

In a template, read the code with `{{ get_error:courses }}` or `{{ session:courses.error }}`.
`Courses::refusalReason()` gives the same answer in PHP.

## `POST /!/courses/team`

The route behind `{{ courses:team_form }}`. Same prefix and group as the progress route,
throttled to 30 requests a minute.

| Field | |
| --- | --- |
| `course` | required |
| `action` | required: `add` or `remove` |
| `email` | required, an email address |
| `_redirect` | a local path; anything else redirects back |

A request that asks for JSON gets `{"team": …}`, the same shape as `{{ courses:team }}`; a
form post is redirected with `courses.status` set to `saved`, or with the error flashed.

| Code | Status | Why |
| --- | --- | --- |
| `unauthenticated` | 401 | nobody is signed in |
| `unknown_course` | 404 | no course with that slug |
| `not_owner` | 403 | the user is not the buyer of a purchase with seats for this course |
| `no_seat` | 422 | every seat is taken, or the address is the buyer's own |

Removing an address that is not on the team is not an error.
