# Installation

<AddonHeader />

<Requirements laravel="12.40+ / 13.x" />

```bash
composer require goldnead/statamic-courses
php artisan migrate
php artisan courses:install
```

The migrations create four tables, all prefixed `courses_`. `courses:install` creates the
two collections and writes their blueprints. It does nothing else. There is no queue and no
scheduled task: what Payments and Assessments report is handled in the same request.

## Upgrading from 0.1

Update straight to the current version (0.3.0), never to 0.2.0: 0.2.0 crashes at boot on a
site without [Private Media](/private-media/).

```bash
php artisan migrate
php artisan courses:install --merge --dry-run   # see what it would add
php artisan courses:install --merge
```

The three new migrations add columns to `courses_enrollments` (payment count, trial end,
paused drip, holds and where a hold came from) and the table `courses_team_members`. Rows
written by 0.1 stay valid and mean what they meant.

`--merge` is the update path for a site whose blueprints already exist: it adds the fields a
newer version ships and the blueprint lacks, and the options a select of the same handle
lacks, and **changes nothing else**. A missing field goes next to the field it follows in the
shipped blueprint, or into a section of the same name, or into a new section at the end of
the first tab. Nothing is removed, reordered or reconfigured, and fields a fieldset import
brings in count as present. **Existing collections are never touched**: `--merge` writes
blueprints only, so collection settings you wrote out in the YAML stay exactly as they are.

If the site caches routes (`php artisan optimize`), rebuild that cache after the update:
`POST /!/courses/team` and the Control Panel route for lifting a payment hold are new. Give
the new permission `manage course holds` to the roles that should lift holds.

From 0.2 on, `--merge` also adds the course field `brand`: on a multi-brand site the handle
of the brand the course belongs to, empty for the brand of its site. It decides which
`brandId` the course's [events](/courses/reference#events) carry. A single-brand site can
leave it empty.

`--dry-run` lists every field and option it would add, `+ drip_after` or
`+ option drip_mode.days`, names every file a real run would write, and saves nothing, on a
fresh site as well ("would create").

Do not use `--force` for an update: it rewrites both blueprints from the shipped ones and
loses every field added by hand.

## What `courses:install` does

| | Handle | Route |
| --- | --- | --- |
| Collection | `courses` | `/courses/{slug}` |
| Collection | `course_lessons` | `/courses/{course_slug}/{slug}` |
| Blueprint | `course` | in the courses collection |
| Blueprint | `course_lesson` | in the lessons collection |

The command is safe to run on a live site. A collection or blueprint that already exists is
left alone and reported as `exists, kept`. `--merge` adds what is missing to existing
blueprints; `--force` overwrites them, never the collections. `--dry-run` saves nothing with
any of them.

The download block's file field needs an asset container, or the whole publish form fails to
load. The command writes one in: [`downloads.container`](/courses/configuration#downloads-container),
or the site's first container other than Private Media's. A site without any container gets a
warning; create one, then run `courses:install --force`. With [Private Media](/private-media/)
installed, the private download's own field is pointed at its container; without it, the
private toggle and field are left out.

**Pick the handles before you install.** They come from
[`collections`](/courses/configuration#collections) in `config/courses.php`, and the command
also points the blueprints' entries fields (`course`, `prerequisite_lessons`) at them.

Blueprint labels are written in the site's language, from `app.locale`, when a translation
file for it ships with the package (German does). Otherwise they are English.

`course_slug` in the lesson route is a computed value the service provider registers on the
lessons collection. Change or clear either route as you like: a lesson or course without a
route has a `url` of `null`, and nothing in the package breaks.

## What comes with it

No other package is required. One is suggested:

| Package | Constraint | Without it |
| --- | --- | --- |
| `goldnead/statamic-entitlements` | `^1.3` (older versions conflict) | Every course is closed, unless you bind your own `CourseAccess`. See [Access and entitlements](/courses/access). |

Five more are picked up when they are installed, with no constraint in `composer.json` and
nothing to configure:

| Package | What it adds | Without it |
| --- | --- | --- |
| [Payments](/payments/) | Subscriptions enroll their buyer, count payments for the drip and apply [`on_payment_failure`](/courses/payment-failure). The Course Progress entry sits in the suite's shared nav section. | The drip by payments and the payment rule wait for your own calls. The nav entry sits under Content. |
| [Assessments](/assessments/) | A questionnaire as a lesson's [quiz](/courses/quizzes). | A quiz completes only through `completeLesson()`. |
| [Private Media](/private-media/) | [Private downloads](/courses/lesson-content#private-downloads), signed for the course. | The private toggle is left out of the blueprint. |
| [LeadHub](/leadhub/) | Tags and segments in [visibility rules](/courses/visibility). | A rule naming only tags or segments matches nobody. |
| [Consent](/consent/) | YouTube and Vimeo players wait behind its two-click gate. | The player loads at once. |

## Permissions

Two, under the group **Courses** in a role's permissions:

| Permission | Allows |
| --- | --- |
| `view course progress` | the [Course Progress](/courses/control-panel) screen |
| `manage course holds` | lifting a learner's [hold](/courses/payment-failure) on that screen; a child of the first |

Lifting a hold is the one write the screen offers. Editing courses and lessons is Statamic's
own collection permissions.

## Publishable tags

| Tag | What it publishes |
| --- | --- |
| `courses-config` | `config/courses.php` |
| `courses-migrations` | The six migrations, into `database/migrations/` |
| `courses-translations` | The language files, into `lang/vendor/courses/` |

The Control Panel bundle ships compiled under `dist/build/` and Statamic publishes it on
install. A fresh install whose migrations have not run gets a sentence on the Course Progress
screen, not an error.

## Licence

Commercial: `composer.json` says `proprietary`, single edition `pro`. It is sold only as part of
the Suite (Schedule A of the [Suite EULA](/guide/suite-eula)), at
[suite.adriangoldner.dev](https://suite.adriangoldner.dev). See [Licensing](/guide/licensing).
