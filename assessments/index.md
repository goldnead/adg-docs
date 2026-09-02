# Assessments

<AddonHeader />

A questionnaire with points per answer and result levels by score. The visitor answers,
leaves an email address and sees a result right away. The result becomes a contact event
in [LeadHub](/leadhub/) and a trigger in [Automations](/automations/), so it can set a tag,
start a sequence or unlock an offer — which is what a quiz on a marketing site is for.

<Figure
  src="assessments-form"
  alt="The shipped questionnaire: six numbered questions with radio buttons, checkboxes and a five-step scale, then name and email"
  caption="The shipped template, inside the site's own layout. Every question is required." />

## What it is

- **Three question types.** Single choice (the chosen option's points), multiple choice
  (the sum of the chosen options), scale (value × points per step).
- **Result levels.** Ordered ranges of points, each with a key, a name, a text and
  optionally a redirect. No gaps, no overlaps, and a published assessment has to cover
  every score its questions can produce.
- **Two public pages**, the form and the result, under `/a/{handle}`. Or the
  [tags](/assessments/templates), for a page that draws the form itself.
- **One event**, and two optional bridges. Without LeadHub and Automations the addon still
  stores every response and shows the result; with them, the result does something.

## What it is not

- **Not an exam.** There is no pass mark, no certificate, no attempt limit. A level is a
  segment, not a grade.
- **Not a course tool.** Nothing here knows about lessons or progress. If a result should
  unlock content, that is an automation acting on the trigger.
- **Not a form builder.** The three question types and the contact fields are the whole
  vocabulary. Free text and file uploads are deliberately absent: neither can be scored,
  and both turn a two-minute questionnaire into a support queue.

## How it fits

```
visitor → /a/stimm-check → POST submit → response stored → AssessmentCompleted
                                                              ├─ LeadHub: contact + event `assessment.completed`
                                                              └─ Automations: trigger `assessments.completed`
```

The address becomes a contact **without consent**. Answering a questionnaire is not agreeing
to mail; what a site may send afterwards is decided by the tags and sequences it attaches,
and by the consent it collects elsewhere.

## Next

- [Installation](/assessments/installation)
- [Configuration](/assessments/configuration)
- [Questions and levels](/assessments/scoring) — how points add up and where the level rules bite
- [The public pages and tags](/assessments/templates)
- [Contact event and trigger](/assessments/integrations)
- [Reference](/assessments/reference) — routes, permissions, events, tables, facade
- [Troubleshooting](/assessments/troubleshooting)
