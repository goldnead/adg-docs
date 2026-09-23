# Quizzes

<AddonHeader />

A quiz lesson can take its questions from [Assessments](/assessments/). The lesson names a
questionnaire, the learner fills it in on the questionnaire's own page, and the result
completes the lesson or records the attempt. Nothing is graded here: Assessments scores, this
package reads the score.

<Figure
  src="courses-quiz"
  alt="A German quiz lesson in the playground: the lesson title, a line of lesson text, and a box headed with the questionnaire's handle saying one attempt, 9 points, passed from 13 points, with a link to the questionnaire"
  caption="After one attempt below the minimum. The lesson stays open for another try." />

## Setting it up

On a lesson with type **Quiz**, three fields appear:

| Field | |
| --- | --- |
| `assessment` | the handle of an Assessments questionnaire |
| `assessment_min_score` | the lowest score that passes |
| `assessment_pass_levels` | result levels that pass, by their key |

With a minimum and levels both set, both must hold. **With neither, any submission passes.**

The fields are named `assessment_*` so that they cannot collide with a `pass_score` a site
already keeps on its lessons; in PHP and in the tag they are read as `pass_score` and
`pass_levels`.

## What a submission does

When Assessments fires `AssessmentCompleted`, every open lesson that embeds that
questionnaire, in every course the learner may open, is updated:

- **Passed:** the lesson completes through `completeLesson()` with the source `assessment`,
  which opens whatever waited on it. `QuizPassed` fires once per lesson: a retake of a passed
  quiz is not a new pass.
- **Not passed:** the attempt is recorded in the lesson's `item_payload` (score, result key,
  response id, `attempts` counted up) and the lesson stays open. `QuizFailed` fires.

A locked lesson is not updated. A quiz, like an assignment, stays in
[`proof_required_types`](/courses/configuration#proof-required-types), so the learner cannot
tick it off by hand.

::: warning Only the signed-in learner counts
The learner is the user who is signed in when the questionnaire is submitted, never the user
behind the email address typed into it. The questionnaire is a public form: anybody could
type somebody else's address and pass a lesson in their name. A submission without a session
counts for no lesson.
:::

The result is applied brand-neutrally. The questionnaire's page runs in the questionnaire's
brand, and the course grant may sit in another; which brand a grant was sold under does not
decide whether its holder passed a quiz.

Without Assessments installed nothing listens, and a quiz lesson completes only when your own
code calls `completeLesson()`, as before.

## In a template

```antlers
{{# on a quiz lesson's page #}}
{{ courses:quiz }}
    {{ if passed }}
        Passed with {{ score }} points.
    {{ else }}
        {{ if attempts }}{{ attempts }} attempts, last score {{ score }}.{{ /if }}
        <a href="{{ url }}">Take the quiz</a>
    {{ /if }}
{{ /courses:quiz }}
```

| Variable | |
| --- | --- |
| `assessment` | the questionnaire's handle |
| `url` | the questionnaire's page; empty without Assessments |
| `passed` | the lesson is completed, by a pass; a failed retake afterwards does not undo it |
| `attempts` | submissions so far |
| `score`, `result_key` | of the latest submission |
| `pass_score`, `pass_levels` | what passes |

`score` is the latest submission's, not the best. The tag renders nothing for a lesson without
a quiz or one the learner cannot open. A super user previewing a lesson its
[visibility rule](/courses/visibility) hides from them sees the quiz as configured, without a
result.
