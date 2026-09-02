# Reference

<AddonHeader />

## Front-end routes

`{prefix}` is [`routes.prefix`](/assessments/configuration#routes-prefix), `a` by default.

| Method | URL | Name | |
| --- | --- | --- | --- |
| GET | `{prefix}/{handle}` | `assessments.show` | The form. 404 unless published — or the viewer holds `view assessments`, who sees a preview with submitting disabled. |
| POST | `{prefix}/{handle}/submit` | `assessments.submit` | Keeps CSRF. Throttled to [`routes.throttle`](/assessments/configuration). Honeypot field `website`. |
| GET | `{prefix}/{handle}/r/{token}` | `assessments.result` | The result of one submission. 404 for a token that belongs to another assessment. |

Under multi-brand every route derives the brand from the handle, which is unique across
brands.

### What the submit route accepts

| Field | Rule |
| --- | --- |
| `email` | required, `email:rfc,strict`, a dot in the domain, max 191 |
| `name` | required or optional per the assessment; max 191 |
| `answers[{id}]` | one per question, all required |
| — single choice | an integer option index that exists |
| — multiple choice | a non-empty list of distinct existing indexes |
| — scale | an integer between `min` and `max` |

Answers are validated against the questions **as they are now**. An index past the end or
a value off the scale is a 422, not a zero.

The result token is minted on the server; nothing the client sends becomes part of it. The
same address may submit as often as it likes — each submit is its own response, result URL
and event.

## Control Panel routes

Under Statamic's CP prefix, all named `assessments.*`.

| Method | Route | Permission |
| --- | --- | --- |
| GET | `assessments.index` | `view assessments` |
| GET | `assessments.create` | `edit assessments` |
| POST | `assessments.store` | `edit assessments` |
| GET | `assessments.edit` | `edit assessments` |
| PATCH | `assessments.update` | `edit assessments` |
| DELETE | `assessments.destroy` | `edit assessments` |
| GET | `assessments.responses.index` | `view assessment responses` |
| GET | `assessments.responses.export` | `view assessment responses` |

Every write route carries `can:` middleware and the controller checks again.

<Figure
  src="assessments-responses"
  alt="The responses listing: email, name, date, points and a level badge per row, with an Export CSV button"
  caption="The latest 500 on screen; the export streams all of them." />

The export is `;`-separated, UTF-8 with a byte-order mark, one column per question with
the answer labels: `email; name; date; score; level key; level; question 1; …`. A cell
starting with `=`, `+`, `-`, `@`, a tab or a carriage return is prefixed with `'`, so a
name typed as `=HYPERLINK(...)` opens as text rather than as a formula.

## Permissions

| Permission | |
| --- | --- |
| `view assessments` | listing; front-end preview of drafts |
| `edit assessments` | create, edit, delete |
| `view assessment responses` | responses page, CSV |

## Events

| Event | Payload | When |
| --- | --- | --- |
| `Goldnead\Assessments\Events\AssessmentCompleted` | `$response` | once per stored response |

## Tags

| Tag | |
| --- | --- |
| `{{ assessments:url handle="…" }}` | the form URL; empty unless published |
| `{{ assessments:form handle="…" }} … {{ /assessments:form }}` | the form's variables |
| `{{ assessments:result token="…" }} … {{ /assessments:result }}` | the result's variables; token also read from `?r=` |

See [The public pages and tags](/assessments/templates).

## Facade

`Goldnead\Assessments\Facades\Assessments`:

| Method | |
| --- | --- |
| `find(string $handle): ?Assessment` | with questions loaded |
| `create(array $attributes): Assessment` | `handle`, `title`, `intro`, `outro`, `published`, `collect`, `scoring`, `questions` |
| `update(Assessment, array $attributes): Assessment` | same keys; a question with its `id` is updated, one without is created, unlisted ones are deleted; `handle` is ignored |
| `levelProblems(Assessment): list<string>` | the message keys the editor would show |
| `score(Assessment, array $answers): array` | `['score' => int, 'breakdown' => [question id => points]]` |
| `submit(Assessment, string $email, ?string $name, array $answers): Response` | stores with a snapshot of the readable answers, mints the token, fires the event |
| `readableAnswers(Response): list` | `question`, `type`, `answer`, `points` per question, from the snapshot |

`create()` and `update()` throw `InvalidArgumentException` for levels that break a rule and
for a scale that does not end above where it starts.

## Tables

| Table | |
| --- | --- |
| `assessments` | `brand_id`, `handle` (unique), `title`, `intro`, `outro`, `published`, `collect` json, `scoring` json, `meta` json |
| `assessment_questions` | `assessment_id`, `position`, `text`, `help`, `type`, `options` json, `min`, `max`, `points_per_step` |
| `assessment_responses` | `assessment_id`, `brand_id`, `email`, `name`, `answers` json, `answers_readable` json, `score`, `result_key`, `contact_id`, `visit_token` (unique), `created_at` |

Deleting an assessment deletes its questions and responses.

## Configuration

| Key | Default |
| --- | --- |
| `routes.prefix` | `'a'` |
| `routes.throttle` | `'20,1'` |
| `layout` | `'layout'` |
| `styles` | `true` |
| `integrations.leadhub` | `true` |
| `integrations.automations` | `true` |
