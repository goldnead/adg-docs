# Tags and the form route

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
course fields: `id`, `slug`, `title`, `summary`, `product`, `sequencing_mode`, `drip_mode`,
`url`.

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
| `is_locked`, `lock_reason` | `schedule`, `prerequisite`, `phase` or `sequence`; see [Drip and locks](/courses/locks) |
| `available_at` | when a lesson locked by the schedule opens, ISO 8601 |
| `is_completed`, `is_skipped` | |
| `progress` | the lesson state; `progress:status` stays `completed` for a skipped lesson |

The lesson's own fields travel along too: section and phase keys and titles, `week`,
`is_test_out`, `est_minutes`.

## `{{ courses:continue }}`

The next lesson that is open and not finished. Empty when there is none.

```antlers
{{ courses:continue course="cvt-101" }}
    <a href="{{ url }}">Continue with {{ title }}</a>
{{ /courses:continue }}
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
