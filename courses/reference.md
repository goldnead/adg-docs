# Reference

<AddonHeader />

## Console

| Command | |
| --- | --- |
| `php artisan courses:install` | Creates the two collections and writes their blueprints. Existing ones are kept. |
| `php artisan courses:install --force` | Overwrites blueprints that already exist. Collections are never overwritten. |

## Facade

`Goldnead\Courses\Facades\Courses`, alias `Courses`. `$user` is a Statamic user, any
`Authenticatable`, or an id. None of these methods checks access; ask `canAccess()` first.

| Method | |
| --- | --- |
| `course(string $courseSlug): ?array` | the course fields |
| `courses(): array` | every course, by title |
| `canAccess($user, string $courseSlug): bool` | asks [`CourseAccess`](/courses/access) |
| `enroll($user, string $courseSlug): ?Enrollment` | starts the schedule clock; a second call keeps the first date |
| `advanceToWeek($user, string $courseSlug, int $week): ?Enrollment` | moves a learner on, never back |
| `outline($user, string $courseSlug): ?array` | the course with `progress` and `sections`, each with its lessons |
| `summary($user, string $courseSlug): ?array` | the rollup: `status`, `percent`, `continue_lesson`, … |
| `lessons($user, string $courseSlug): ?array` | every lesson, flat, in reading order |
| `lesson($user, string $courseSlug, string $lessonSlug): ?array` | one lesson, with `previous_lesson` and `next_lesson` |
| `isLessonLocked($user, string $courseSlug, string $lessonSlug): bool` | |
| `updateLessonProgress($user, …, array $payload): ?array` | videos only: `watched_seconds`, `resume_seconds`, `video_duration_seconds`, `playback_state` |
| `setLessonCompletion($user, …, bool $completed): ?array` | the learner's tick; refused for proof-required types |
| `acknowledgeLesson($user, …, bool $completed = true): ?array` | `text`, `milestone`, `coaching`, `exercise` |
| `completeLesson($user, …, string $source, ?array $payload = null): ?array` | completion on the word of the code that checked it |
| `updateLessonItem($user, …, array $payload): ?array` | unfinished work: merges `item_payload`, marks the lesson started |
| `refusalReason($user, …, string $write): ?string` | why a write would be refused, or `null` |

`…` stands for `string $courseSlug, string $lessonSlug`. The write methods return the lesson
as `lesson()` would, or `null` when the write was refused: an unknown course or lesson, a
locked lesson, or a type the method does not accept. `refusalReason()` names which, for
`$write` = `complete`, `incomplete`, `acknowledge`, `progress` or `item`.

## Events

| Event | Payload | When |
| --- | --- | --- |
| `Goldnead\Courses\Events\LessonCompleted` | `$state` (the lesson state), `$source` | once per transition to completed, however it happened |
| `Goldnead\Courses\Events\CourseCompleted` | `$userId`, `$courseId`, `$courseSlug` | once per learner and course, when every lesson is completed |

`$source` is `auto` for a video that completed by being watched, `manual` for a tick or an
acknowledgement, `item` for `updateLessonItem()`, and whatever the caller passed to
`completeLesson()`. A test-out that completes earlier phases fires `LessonCompleted` for each
lesson it completed. The enrollment remembers that `CourseCompleted` was fired, so reopening a
lesson and completing it again does not fire it twice.

[Certificates](/certificates/) listens to `CourseCompleted` and issues a PDF certificate with a
public verification page, one per learner and course. A lesson skipped by a test-out counts as
completed there too. See [Issuing and the snapshot](/certificates/issuing).

## Routes

| Method | URL | Name | |
| --- | --- | --- | --- |
| POST | `/!/courses/progress` | `statamic.courses.progress` | `web` group, CSRF, `throttle:60,1`; see [the form route](/courses/tags#post-courses-progress) |
| GET | `{cp}/courses/progress` | `statamic.cp.courses.progress.index` | `can:view course progress` |

## Permission

| Permission | |
| --- | --- |
| `view course progress` | the Course Progress screen |

## Tables

| Table | |
| --- | --- |
| `courses_lesson_states` | one row per learner and lesson: `user_id`, `course_entry_id`, `course_slug`, `lesson_entry_id`, `lesson_slug`, section key and title, `status`, `completion_percent`, `resume_seconds`, `watched_seconds`, `video_duration_seconds`, `manual_completion_state`, `item_payload` json, `first_started_at`, `last_activity_at`, `completed_at`; unique on `user_id` + `lesson_entry_id` |
| `courses_lesson_events` | the event log: `event_type`, `progress_percent`, `watched_seconds`, `payload` json, `occurred_at`, and a unique `dedupe_key` |
| `courses_enrollments` | one row per learner and course: `current_week`, `week_states` json, `started_at`, `completed_at`; unique on `user_id` + `course_entry_id` |

`user_id` is a string without a foreign key, because a Statamic user may be a flat file.

The event log holds `lesson.started`, `lesson.progress_25`, `lesson.progress_50`,
`lesson.progress_75` and `lesson.completed_auto` once per learner and lesson (the dedupe key
guarantees it), and `lesson.completed_manual` and `lesson.reopened_manual` every time.

## Entry fields

**Course** (blueprint `course`): `title`, `summary`, `product`, `sequencing_mode` (`none`,
`section`, `lesson`), `drip_mode` (`none`, `schedule`).

**Lesson** (blueprint `course_lesson`): `title`, `course`, `item_type`, `is_test_out`,
`content`, `video_duration`, `est_minutes`, `section_key`, `section_title`, `section_order`,
`sort_order`, `phase_key`, `phase_title`, `phase_order`, `week`, `prerequisite_lessons`.

## Configuration

| Key | Default |
| --- | --- |
| `collections.courses` | `'courses'` |
| `collections.lessons` | `'course_lessons'` |
| `auto_completion_threshold` | `90` |
| `proof_required_types` | `['quiz', 'assignment', 'reflection']` |
| `record_events` | `true` |
| `routes.enabled` | `true` (`COURSES_ROUTES_ENABLED`) |
| `cp.enabled` | `true` |
| `cp.stuck_after_days` | `14` |
| `entitlements.subject_type` | `null` (`COURSES_SUBJECT_TYPE`) |
