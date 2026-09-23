# Lesson types and proof

<AddonHeader />

A lesson's `item_type` decides how it completes. The type is kept as authored: the shipped
blueprint offers eight, a site may add its own, and only an empty type reads as `video`.

| Type | Completes by |
| --- | --- |
| `video` (default) | being watched past [`auto_completion_threshold`](/courses/configuration#auto-completion-threshold) (90 %), or the learner's own tick |
| `text`, `milestone`, `coaching`, `exercise` | `acknowledgeLesson()`; a milestone also by itself once its phase is done |
| `quiz`, `assignment`, `reflection` | only `completeLesson()`, called by the code that checked the proof |
| anything else | the learner's tick or `completeLesson()` |

The third row is [`proof_required_types`](/courses/configuration#proof-required-types).

## Video

```php
Courses::updateLessonProgress($user, 'cvt-101', 'intro', [
    'watched_seconds' => 540,
    'resume_seconds' => 540,
]);
```

For videos only; any other type is refused (`not_video` on the route). Watched time only
grows, so seeking back does not undo what was seen. The resume position is stored as sent.

**The entry's duration wins over the player's.** A client that claims a ten-minute video is
ten seconds long must not complete it in ten seconds, so `video_duration_seconds` from the
payload counts only when the lesson entry has no `video_duration`. That field takes `mm:ss`,
`hh:mm:ss` or plain seconds. A video with no known duration cannot complete itself by being
watched; the learner can still tick it.

A tick overrides what watching decided, in both directions:

```php
Courses::setLessonCompletion($user, 'cvt-101', 'intro', true);   // done
Courses::setLessonCompletion($user, 'cvt-101', 'intro', false);  // not done yet
```

## Text, milestone, coaching, exercise

```php
Courses::acknowledgeLesson($user, 'cvt-101', 'reading');
```

"Done" for a lesson without a player or a grade. Any other type is refused
(`not_acknowledgeable`).

**A milestone completes itself** once its prerequisites are completed, or, with none named,
once every other lesson of its phase is. That is derived on every read and never written, so
locking, the rollup and the lesson list always agree.

## Quiz, assignment, reflection

A learner cannot tick these off, neither through `setLessonCompletion()` nor the POST route
(`proof_required`). They complete when your code has checked the proof:

```php
Courses::completeLesson($user, 'cvt-101', 'quiz-1', 'quiz', ['best_score' => 90]);
```

The fourth argument names the code that decided; it travels on the `LessonCompleted` event
as its source. The payload is merged into the lesson's `item_payload`.

Work that is not finished yet goes through `updateLessonItem()`:

```php
Courses::updateLessonItem($user, 'cvt-101', 'quiz-1', ['attempts' => 1, 'best_score' => 40]);
```

It merges the payload and marks the lesson started. More work on a completed lesson, a
retake say, does not reopen it.

This package grades nothing. Scoring a quiz or reviewing an assignment is the site's own code,
which then calls one of the two methods above.

**A quiz can take its questions from [Assessments](/assessments/)**: name a questionnaire on
the lesson, and a submission that passes completes the lesson with the source `assessment`,
while one that does not records the attempt. See [Quizzes](/courses/quizzes).

What a lesson shows, text, video, downloads, is independent of its type: any lesson can carry
[blocks](/courses/lesson-content).

## Test-out lessons

A lesson with `is_test_out` stays open while its phase is locked. Completing it with
`completeLesson()` also completes every unfinished lesson of the earlier phases, marked as
skipped, so the learner lands behind them. See [Drip and locks](/courses/locks#phases-and-test-out).

## What every completion fires

`LessonCompleted` on every transition to completed, once per transition and not on every
save. `LessonUnlocked` for every lesson that completion opened. `CourseCompleted` once per
learner and course, when the last lesson the learner can see is done. All are in the
[Reference](/courses/reference#events).
