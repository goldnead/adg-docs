# Installation

<AddonHeader />

<Requirements laravel="12.40+ / 13.x" />

```bash
composer require goldnead/statamic-courses
php artisan migrate
php artisan courses:install
```

The migration creates three tables, all prefixed `courses_`. `courses:install` creates the
two collections and writes their blueprints. It does nothing else; there is no queue and no
scheduled task.

## What `courses:install` does

| | Handle | Route |
| --- | --- | --- |
| Collection | `courses` | `/courses/{slug}` |
| Collection | `course_lessons` | `/courses/{course_slug}/{slug}` |
| Blueprint | `course` | in the courses collection |
| Blueprint | `course_lesson` | in the lessons collection |

The command is safe to run on a live site. A collection or blueprint that already exists is
left alone and reported as `exists, kept`. `--force` overwrites the blueprints, never the
collections.

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

When [Payments](/payments/) is installed, the Course Progress entry sits in the suite's shared
nav section. Otherwise it sits under Content.

## Permissions

One, under the group **Courses** in a role's permissions:

| Permission | Allows |
| --- | --- |
| `view course progress` | the [Course Progress](/courses/control-panel) screen |

The screen writes nothing, so nothing else needs a permission. Editing courses and lessons is
Statamic's own collection permissions.

## Publishable tags

| Tag | What it publishes |
| --- | --- |
| `courses-config` | `config/courses.php` |
| `courses-migrations` | The three migrations, into `database/migrations/` |
| `courses-translations` | The language files, into `lang/vendor/courses/` |

The Control Panel bundle ships compiled under `dist/build/` and Statamic publishes it on
install. A fresh install whose migrations have not run gets a sentence on the Course Progress
screen, not an error.

## Licence

Commercial: `composer.json` says `proprietary`, single edition `pro`. It is not in Schedule A
of the [Suite EULA](/guide/suite-eula) and not sold today. See [Licensing](/guide/licensing).
