# The Course Progress screen

<AddonHeader />

One screen: one row per course and who is where in it, and below it the learners on hold. The
only write it offers is lifting a hold.

<Figure
  src="courses-progress"
  alt="The Course Progress listing in the Control Panel: two courses with columns for learners, in progress, completed, completion rate, stuck and last activity; one stuck learner shown as a badge"
  caption="A course nobody has started shows zeros and a dash. The badge is a learner who started and then stopped." />

## Who sees it

Users with the permission `view course progress`, under the group **Courses** in the role
editor. Without it the nav entry is missing and the URL is refused. Super users hold it.

The entry sits in the suite's shared nav section when [Payments](/payments/) provides one,
and under **Content** otherwise. [`cp.enabled`](/courses/configuration#cp) removes the entry
and the route together.

## The columns

| Column | |
| --- | --- |
| Course | the title, linked to the entry |
| Learners | everyone who enrolled or touched a lesson of the course |
| In progress | learners whose rollup is `in_progress` |
| Completed | learners whose rollup is `completed` |
| Completion rate | completed over learners, rounded down |
| Stuck | in progress, and no activity for [`cp.stuck_after_days`](/courses/configuration#cp) days (14 by default) |
| Last activity | the latest activity of any learner, in the Control Panel user's language |

**A learner is somebody who started, not somebody who bought.** Entitlements has no query
for "everybody holding product X" that an addon could rely on, so the completion rate is
"of those who started". A buyer who never opened the course is not in the table at all.

The listing is Statamic's own: search, sort and column choice happen in the browser, because a
site has a handful of courses, not thousands.

## Holds

Below the courses, a second table lists every learner whose course is closed or whose drip is
paused, after a failed subscription payment or set by hand. It appears only when there is at
least one.

<Figure
  src="courses-holds"
  alt="The Holds table in a German Control Panel, headed Sperren: two learners, one marked Gesperrt and set by hand, one marked Offen über anderen Kauf with a Stripe subscription number"
  caption="The playground in German. The second learner's subscription failed, but another purchase keeps the course open." />

| Column | |
| --- | --- |
| Learner | the email address, or the user id when there is none |
| Course | |
| Hold | **Closed**, **Open through another purchase** or **Drip paused** |
| Since | when the hold began |
| Subscription | the provider's subscription number, or **Set by hand** |

Users with `manage course holds`, a child permission of `view course progress`, get **Lift
hold** in each row's menu. After a confirmation it opens the course again and restarts a
paused drip, as a paid renewal would, and it is the only way besides `restoreAccess()` to lift
a hold set by hand. What each hold means is on [When a payment fails](/courses/payment-failure).

## Empty and unfinished installs

- **Migrations not run:** a sentence saying so, and a warning in the log,
  `statamic-courses: the course tables are missing; run php artisan migrate.` Not a 500.
- **No courses collection:** a hint to run `courses:install`.
- **Courses, but no learners yet:** the table, with zeros.
