# Reference

<AddonHeader />

## Console

| Command | |
| --- | --- |
| `php artisan courses:install` | Creates the two collections and writes their blueprints. Existing ones are kept. |
| `php artisan courses:install --merge` | The update path: adds missing fields and select options to existing blueprints, changes nothing else. See [Upgrading from 0.1](/courses/installation#upgrading-from-0-1). |
| `php artisan courses:install --force` | Overwrites blueprints that already exist, losing fields added by hand. Collections are never overwritten. |
| `--dry-run` | With any of the above: lists what would be created, added or overwritten, saves nothing. |

## Facade

`Goldnead\Courses\Facades\Courses`, alias `Courses`. `$user` is a Statamic user, any
`Authenticatable`, or an id. None of these methods checks access; ask `canAccess()` first.

| Method | |
| --- | --- |
| `course(string $courseSlug): ?array` | the course fields |
| `courses(?int $brandId = null): array` | every course, by title; with a brand, that brand's courses and those without one |
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
| `recordBilling($user, string $courseSlug, int $payments, ?CarbonInterface $trialUntil = null): ?Enrollment` | payments that went through, the first included, for the [drip by payments](/courses/locks#by-payments); never goes down |
| `paymentFailed($user, string $courseSlug, ?string $subscriptionId = null, array $grantRefs = []): ?string` | applies the course's [`on_payment_failure`](/courses/payment-failure), answers the mode |
| `paymentRecovered($user, string $courseSlug, ?string $subscriptionId = null): void` | lifts payment holds and a paused drip |
| `pauseDrip($user, string $courseSlug, string $reason = 'manual')`, `resumeDrip(…)` | stops and restarts the drip clock |
| `suspendAccess($user, string $courseSlug, string $reason = 'manual')`, `restoreAccess(…)` | a hold set by hand, and lifting it |
| `hold($user, string $courseSlug): ?array` | the learner's hold: `since`, `subscription_id`, `blocks` |
| `holds(): array` | every hold and paused drip, as the Control Panel lists them |
| `addTeamMember($owner, string $courseSlug, string $email): ?TeamMember` | a seat on the buyer's [team](/courses/teams) |
| `removeTeamMember($owner, string $courseSlug, string $email): bool` | |
| `team($owner, string $courseSlug): ?array` | `product`, `seats`, `used`, `left`, `members` |

`…` stands for `string $courseSlug, string $lessonSlug`. The write methods return the lesson
as `lesson()` would, or `null` when the write was refused: an unknown course or lesson, a
locked lesson, or a type the method does not accept. `refusalReason()` names which, for
`$write` = `complete`, `incomplete`, `acknowledge`, `progress` or `item`.

## Events

| Event | Payload | When |
| --- | --- | --- |
| `Goldnead\Courses\Events\LessonCompleted` | `$state` (the lesson state), `$source` | once per transition to completed, however it happened |
| `Goldnead\Courses\Events\CourseCompleted` | `$userId`, `$courseId`, `$courseSlug` | once per learner and course, when every lesson the learner can see is completed |
| `Goldnead\Courses\Events\LearnerEnrolled` | `$userId`, `$courseId`, `$courseSlug` | once per learner and course, by the call that created the enrollment |
| `Goldnead\Courses\Events\LessonUnlocked` | `$userId`, `$courseId`, `$courseSlug`, `$lessonSlug`, `$source` | a lesson went from locked to open because of a write |
| `Goldnead\Courses\Events\QuizPassed` | `$userId`, `$courseId`, `$courseSlug`, `$lessonSlug`, `$assessment`, `$score`, `$resultKey`, `$responseId` | a learner passed a lesson's questionnaire, once per lesson; after `LessonCompleted` |
| `Goldnead\Courses\Events\QuizFailed` | the same | a submission that did not pass; the lesson stays open |
| `Goldnead\Courses\Events\DripPaused` | `$userId`, `$courseId`, `$courseSlug`, `$reason` | the drip clock stopped |
| `Goldnead\Courses\Events\DripResumed` | the same plus `$pausedSeconds` | the clock runs again; relative release dates moved by that much |
| `Goldnead\Courses\Events\CourseAccessSuspended` | `$userId`, `$courseId`, `$courseSlug`, `$reason` | a hold closed the course |
| `Goldnead\Courses\Events\CourseAccessRestored` | the same | the hold was lifted |
| `Goldnead\Courses\Events\TeamMemberAdded` | `$ownerId`, `$courseId`, `$courseSlug`, `$email`, `$product` | a buyer put somebody on their team; the member may have no account yet |
| `Goldnead\Courses\Events\TeamMemberRemoved` | the same | a seat is free again |

Every event also carries `$brandId`, the last constructor parameter, optional and `null`
without [Brand Context](/brand-context/). It is the course's brand: its `brand` field, else
the brand `brand-context.sites` maps the course's site to, else the brand current when the
event fired. Events fired from a Payments webhook carry the subscription's brand. A listener
that runs from a webhook, where no brand is current, can therefore switch to the right one
before it reads or writes anything branded.

`$source` is `auto` for a video that completed by being watched, `manual` for a tick or an
acknowledgement, `item` for `updateLessonItem()`, `assessment` for a passed quiz, and whatever
the caller passed to `completeLesson()`. On `LessonUnlocked` it can also be `billing`,
`drip_resumed` or `access_restored`. A lesson the calendar opens (drip by days or date) has no
write behind it and is not announced.

`$reason` on the drip and hold events is `payment_failed`, `payment_recovered`,
`new_purchase`, `released_in_cp` or `manual`. A test-out that completes earlier phases fires `LessonCompleted` for each
lesson it completed. The enrollment remembers that `CourseCompleted` was fired, so reopening a
lesson and completing it again does not fire it twice.

[Certificates](/certificates/) listens to `CourseCompleted` and issues a PDF certificate with a
public verification page, one per learner and course. A lesson skipped by a test-out counts as
completed there too. See [Issuing and the snapshot](/certificates/issuing).

## Routes

| Method | URL | Name | |
| --- | --- | --- | --- |
| POST | `/!/courses/progress` | `statamic.courses.progress` | `web` group, CSRF, `throttle:60,1`; see [the form route](/courses/tags#post-courses-progress) |
| POST | `/!/courses/team` | `statamic.courses.team` | `web` group, CSRF, `throttle:30,1`; see [the team route](/courses/tags#post-courses-team) |
| GET | `{cp}/courses/progress` | `statamic.cp.courses.progress.index` | `can:view course progress` |
| POST | `{cp}/courses/holds/{enrollment}/release` | `statamic.cp.courses.holds.release` | `can:manage course holds` |

Both front-end routes go with [`routes.enabled`](/courses/configuration#routes-enabled), both
Control Panel routes with [`cp.enabled`](/courses/configuration#cp).

## Permissions

| Permission | |
| --- | --- |
| `view course progress` | the Course Progress screen |
| `manage course holds` | lifting a hold there; a child of `view course progress` |

## Tables

| Table | |
| --- | --- |
| `courses_lesson_states` | one row per learner and lesson: `user_id`, `course_entry_id`, `course_slug`, `lesson_entry_id`, `lesson_slug`, section key and title, `status`, `completion_percent`, `resume_seconds`, `watched_seconds`, `video_duration_seconds`, `manual_completion_state`, `item_payload` json, `first_started_at`, `last_activity_at`, `completed_at`; unique on `user_id` + `lesson_entry_id` |
| `courses_lesson_events` | the event log: `event_type`, `progress_percent`, `watched_seconds`, `payload` json, `occurred_at`, and a unique `dedupe_key` |
| `courses_enrollments` | one row per learner and course: `current_week`, `week_states` json, `started_at`, `completed_at`, `payments_count`, `trial_until`, `drip_paused_at`, `drip_paused_seconds`, `access_suspended_at`, `suspended_by_subscription_id`, `suspended_grant_refs` json; unique on `user_id` + `course_entry_id` |
| `courses_team_members` | one row per seat: `owner_id` (the buyer), `product` (the purchase), `email`, `slot`; unique on owner + product + email and on owner + product + slot |

`user_id` is a string without a foreign key, because a Statamic user may be a flat file. A
team member is kept by email address, so a buyer can add somebody without an account.

The event log holds `lesson.started`, `lesson.progress_25`, `lesson.progress_50`,
`lesson.progress_75` and `lesson.completed_auto` once per learner and lesson (the dedupe key
guarantees it), and `lesson.completed_manual` and `lesson.reopened_manual` every time.

## Entry fields

**Course** (blueprint `course`): `title`, `summary`, `product`, `bundles`,
`sequencing_mode` (`none`, `section`, `lesson`), `drip_mode` (`none`, `schedule`, `days`,
`date`, `day_of_month`, `payments`, `after_trial`), `drip_day_of_month` (1 to 31),
`on_payment_failure` (`keep`, `pause_drip`, `revoke`), `team_seats`, `section_audiences`
(grid: `section_key`, `groups`, `entitlements`, `tags`, `segments`).

**Lesson** (blueprint `course_lesson`): `title`, `course`, `item_type`, `is_test_out`,
`assessment`, `assessment_min_score`, `assessment_pass_levels`, `video_duration`,
`est_minutes`, `content`, `blocks`, `section_key`, `section_title`, `section_order`,
`sort_order`, `phase_key`, `phase_title`, `phase_order`, `prerequisite_lessons`, `week`,
`drip_after`, `drip_date`, `audience_entitlements`, `audience_groups`, `audience_tags`,
`audience_segments`.

The `blocks` replicator's sets: `text`, `callout`, `columns`, `faq` (group Content), `video`,
`download`, `button` (group Media). See [Lesson content](/courses/lesson-content).

## Configuration

| Key | Default |
| --- | --- |
| `collections.courses` | `'courses'` |
| `collections.lessons` | `'course_lessons'` |
| `auto_completion_threshold` | `90` |
| `proof_required_types` | `['quiz', 'assignment', 'reflection']` |
| `record_events` | `true` |
| `downloads.container` | `null` (`COURSES_DOWNLOADS_CONTAINER`) |
| `routes.enabled` | `true` (`COURSES_ROUTES_ENABLED`) |
| `cp.enabled` | `true` |
| `cp.stuck_after_days` | `14` |
| `entitlements.subject_type` | `null` (`COURSES_SUBJECT_TYPE`) |
