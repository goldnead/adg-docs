# Courses

<AddonHeader />

Courses for Statamic 6: modules and lessons as entries, a state per learner and lesson,
sequencing, drip by schedule or by progress, and a progress rollup. Who may open a course at
all is asked of [Entitlements](/entitlements/). This package decides what a learner may open
*next*.

<Figure
  src="courses-lessons"
  alt="A course page for a signed-in learner: progress, a continue button, six lessons with their type and status, the last two greyed out and marked as locked by phase"
  caption="A template of the playground's own, built on the tags. The last two lessons wait for the first phase; the test-out lesson above them stays open." />

## What it is

- **Two collections.** A course is an entry in `courses`, a lesson an entry in
  `course_lessons` that points at its course. `php artisan courses:install` creates both with
  their blueprints and routes. The handles are [configurable](/courses/configuration#collections).
- **A state per learner and lesson**, in `courses_lesson_states`: status, percent, resume
  position, seconds watched, and a free `item_payload` for work that is not finished yet.
- **Locks.** Sequencing by section or by lesson, prerequisites, phases with a test-out, and a
  drip: by week, by days, on a date, on a day of the month, after a number of payments or
  after the trial. A locked lesson carries a `lock_reason`. See [Drip and locks](/courses/locks).
- **Lessons built from blocks**: text, callout, columns, FAQ, video, download and button, with
  downloads that only the course's learners can fetch. See [Lesson content](/courses/lesson-content).
- **Lessons for some learners only**, by product, user group, LeadHub tag or segment. For
  everybody else they are not part of the course. See [Who sees a lesson](/courses/visibility).
- **Lesson types that complete differently.** A video by being watched, a text by being
  acknowledged, a quiz by a questionnaire from [Assessments](/assessments/) or by the code
  that graded it. See [Lesson types and proof](/courses/lesson-types) and
  [Quizzes](/courses/quizzes).
- **A rule for failed payments** per course: keep access, pause the drip, or close the
  course until the money arrives. See [When a payment fails](/courses/payment-failure).
- **Bundles and team seats**: one product that opens several courses, and a buyer who adds
  colleagues by email. See [Bundles and teams](/courses/teams).
- **A rollup** per learner and course: status, percent, completed and total, and the lesson
  to continue with.
- **Antlers tags and two form routes** for the front end, and one screen in the Control
  Panel, **Course Progress**, with the learners on hold beneath it.

## What it is not

- **Not a player.** It ships no lesson template and no video player of its own. The tags hand
  a template the data, and the block partials are plain markup; how a lesson looks is the
  site's.
- **Not a shop.** A course is opened by a product in Entitlements. Selling that product is
  [Payments](/payments/) and [Products](/products/), or whatever else writes the grant.
- **Not a quiz engine.** A quiz takes its questions and its score from Assessments; without
  it, a quiz, an assignment or a reflection completes only when the code that checked it
  calls `Courses::completeLesson()`. Grading is somebody else's.

## How it fits

```
learner → {{ courses:lessons }}     reads lesson states + lock map (visible lessons only)
        → POST /!/courses/progress
             ├─ CourseAccess ─▶ Entitlements::allows(subject, product or bundle)
             │                  or a seat on the buyer's team, unless a hold closes it
             └─ lock and type rules ─▶ state written
                                       ├─ LessonCompleted
                                       └─ CourseCompleted (once)

Payments ── SubscriptionStarted / Renewed / CycleFailed ─▶ enrollment, payment count, holds
Assessments ── AssessmentCompleted ─▶ quiz lesson passed or attempt recorded
```

Payments, Assessments, Private Media, LeadHub and Consent are all optional. Each is detected
at runtime, and without it the part that needs it stays quiet.

**Without Entitlements every course is closed.** That is deliberate: a site that forgot to
install it should find its courses shut, not handed out. A site with its own access rules
binds its own `CourseAccess`; see [Access and entitlements](/courses/access).

## Where it came from

The package is extracted from adriangoldner.com, where the same progress logic runs the
member courses. What was taken, what was built new (the schedule drip, the access seam, the
lock reasons, the events, the tags, the route and the screen) and what stayed behind is
recorded in `docs/EXTRACTION.md` in the package.

## Next

- [Installation](/courses/installation)
- [Configuration](/courses/configuration)
- [Tags and the form route](/courses/tags)
- [The Course Progress screen](/courses/control-panel)
- [Access and entitlements](/courses/access)
- [Lesson content](/courses/lesson-content)
- [Lesson types and proof](/courses/lesson-types)
- [Quizzes](/courses/quizzes)
- [Drip and locks](/courses/locks)
- [Who sees a lesson](/courses/visibility)
- [When a payment fails](/courses/payment-failure)
- [Bundles and teams](/courses/teams)
- [Reference](/courses/reference): facade, events, tables, routes, permissions
- [Troubleshooting](/courses/troubleshooting)
