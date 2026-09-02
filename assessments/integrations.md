# Contact event and trigger

<AddonHeader />

The reason this addon exists is what happens *after* the result. Two bridges, each used
only when its sibling is installed, each switchable in
[configuration](/assessments/configuration#integrations).

## The event

`Goldnead\Assessments\Events\AssessmentCompleted`, with the stored `Response` on it. Fired
once per submit, after the row exists, with the score and the level key already on it. A
site can listen to it directly; both bridges below are listeners on it.

## LeadHub

When [LeadHub](/leadhub/) is installed, every completed assessment is ingested:

| | |
| --- | --- |
| Contact | resolved or created by email, `full_name` from the name field if given |
| `source` | `assessment:{handle}` |
| Event type | `assessment.completed` |
| Summary | `Assessment "Stimm-Check": Aufbau (13 Punkte)` — in the site's language |
| Payload | `assessment`, `assessment_title`, `score`, `result_key`, `result_label`, `answers` |
| Dedupe key | `assessment:response:{id}` |

**No consent is set and no tag is attached.** Answering a questionnaire is not agreeing to
mail. Which tag a level earns, and whether a sequence starts, is the automation's decision,
one screen over — that is the whole point of keeping the two apart.

The contact id LeadHub reports is written back onto the response (`contact_id`), so a
response can be found from the CRM and the other way round.

A failure in the handover is logged and never fails the submit. The visitor is looking at
their result; the response is stored either way.

## Automations

When [Automations](/automations/) is installed, the addon registers one trigger:

| | |
| --- | --- |
| Handle | `assessments.completed` |
| Group | Assessments |
| Fields | `assessment` (handle; empty for every assessment), `result_key` (level key; empty for every level) |

Output, under `response`:

| Key | |
| --- | --- |
| `id` | the response id |
| `email`, `name` | |
| `score` | the total |
| `result_key`, `result_label` | the level |
| `assessment`, `assessment_title` | |
| `answers` | a list of `question`, `type`, `answer`, `points` |
| `completed_at` | ISO 8601 |

So one automation can say *"anyone who finished the Stimm-Check with `vertiefung`: tag
them `fortgeschritten` and send the workshop mail"*, and another *"anyone who finished
anything: add a note"*.

The event is handed to the sibling's own dispatcher, so matching, enrollment policy and the
sync/async choice are its rules rather than a copy of them.

## Without either

The addon stores every response, shows the result page and lists responses in the Control
Panel with a CSV export. The bridges add the follow-through; they are not what makes it
work.
