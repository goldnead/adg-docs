# Webhooks

<AddonHeader />

With [Webhook Manager](/webhook-manager/) installed, every course event is a trigger an
outbound webhook can listen to (source type `courses`). From Webhook Manager 2.10 they sit
under the heading **Courses** in the trigger picker, labelled in German and English. The
handles are the ones [Automations](/automations/suite-triggers) uses. New in Courses **0.3**.

Offering a trigger sends nothing. Data leaves only through an outbound webhook somebody creates
for it. Webhook Manager 2.10 or later sends the payload's `event_id` as the delivery's
idempotency key (`X-Webhook-Id`, and `Idempotency-Key` where the hook asks for it).

## Switching it off

| Key | Default | |
| --- | --- | --- |
| `webhook_manager.enabled` | `true`, env `COURSES_WEBHOOK_MANAGER` | Off, the twelve triggers are not offered. |

Without Webhook Manager nothing of it is loaded.

## The triggers

| Handle | Blocks after the frame |
| --- | --- |
| `courses.learner_enrolled` | `learner`, `course` |
| `courses.lesson_completed` | `learner`, `course`, `lesson {id, slug}`, `source`, `completed_at` |
| `courses.lesson_unlocked` | `learner`, `course`, `lesson {slug}`, `source` |
| `courses.quiz_passed` | `learner`, `course`, `lesson {slug}`, `assessment`, `score`, `passed: true`, `result_key`, `response_id` |
| `courses.quiz_failed` | as `quiz_passed`, with `passed: false` |
| `courses.course_completed` | `learner`, `course` |
| `courses.drip_paused` | `learner`, `course`, `reason` (`payment_failed`, `manual`) |
| `courses.drip_resumed` | `learner`, `course`, `reason`, `paused_seconds` |
| `courses.access_suspended` | `learner`, `course`, `reason` (`payment_failed`, `manual`) |
| `courses.access_restored` | `learner`, `course`, `reason` (`payment_recovered`, `manual`) |
| `courses.team_member_added` | `member`, `owner`, `course`, `product` |
| `courses.team_member_removed` | as `team_member_added` |

`source` and `reason` mean what they mean on the [events](/courses/reference#events).

## The payload

Every body starts with the frame all suite addons share:

| Key | Value |
| --- | --- |
| `event` | the trigger handle |
| `event_id` | `sha1(handle\|<type>:<id>\|<the row's time>)`; the same for the same moment however often it is sent |
| `occurred_at` | when the moment happened, ISO 8601 with offset, not when it was sent |
| `brand` | `{id, handle}`, or `null` without [Brand Context](/brand-context/) |
| `subject_type`, `subject_id` | `course` and the course entry id |

```json
{
  "event": "courses.quiz_passed",
  "event_id": "9b1f…",
  "occurred_at": "2026-09-24T09:41:17+02:00",
  "brand": { "id": 1, "handle": "chorwerkstatt" },
  "subject_type": "course",
  "subject_id": "5f2c…",
  "learner": { "id": "a81…", "email": "lena@example.com", "name": "Lena Alt" },
  "course": { "id": "5f2c…", "slug": "stimmbildung", "title": "Stimmbildung im Chor" },
  "lesson": { "slug": "atem-1" },
  "assessment": "atem-quiz",
  "score": 80,
  "passed": true,
  "result_key": "gut",
  "response_id": 412
}
```

**People** are looked up as Statamic users: `{id, email, name}`. A user that is not found
(deleted, or an id from another system) is sent as `{id}` alone, never with invented or empty
fields. A **team member** without an account yet is `{email}`: that address is who to invite.

**`course`** is `{id, slug, title}`.

## What never goes along

Nothing a lesson state row carries beyond the fields above: no watch positions, no quiz
answers, no item payloads, no internal row ids.

## Brand

A hook fires in the course's brand: its `brand` field, else the brand `brand-context.sites`
maps its site to, else the brand current when the event fired (see
[Events](/courses/reference#events)). So a Payments webhook or a console run with no brand
current still reaches the hooks of the right brand. A course whose brand no longer exists sends
nothing (logged), rather than reaching the hooks of whichever brand is current.

## Duplicates and order

- **Deduplicate on `event_id`.** A retry or a second dispatch of the same moment carries the
  same id.
- **Order is not guaranteed** (retries, queues). Sort by `occurred_at`.
- A moment is sent after its database transaction commits, and not at all if it is rolled back.
- **Three moments have no time of their own:** `lesson_unlocked`, `team_member_removed`, and a
  quiz result without a `response_id`. Their `event_id` is built from the course, learner and
  lesson (or member) alone, and `occurred_at` is the time of sending. If the same lesson is
  unlocked for the same learner a second time, or the same person is removed from the same team
  twice, the second one has the **same `event_id`**, and a receiver that deduplicates drops it.

A failure in Webhook Manager is logged and never breaks the course.
