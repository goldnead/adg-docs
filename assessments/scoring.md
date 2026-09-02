# Questions and levels

<AddonHeader />

An assessment is a list of questions with points, and a list of levels over the sum. This
page is the arithmetic and the rules the editor enforces.

<Figure
  src="assessments-questions"
  alt="The questions editor: a multiple-choice question with five options and their points, and a scale question from 1 to 5"
  caption="Points sit next to the option they belong to. Questions move with the arrows; there is no drag." />

## The three question types

| Type | The visitor | Points |
| --- | --- | --- |
| Single choice | picks one option | the points of that option |
| Multiple choice | ticks any number | the sum of the ticked options, each counted once |
| Scale | picks a number from `min` to `max` | that number × points per step |

Points may be negative. On a multiple-choice question a negative option lowers the sum,
which is how "I do none of these" can cost a point rather than merely earn none.

**Every question is required.** A skipped question does not count as zero; the submit is
refused with a validation message naming the question. A zero the visitor did not choose
would put them into a level they did not earn.

### The achievable range

The editor shows, under the levels, the lowest and highest score the current questions can
produce. It is computed the same way on the server:

| Type | Minimum | Maximum |
| --- | --- | --- |
| Single choice | the smallest option | the largest option |
| Multiple choice | the sum of the negative options | the sum of the positive options |
| Scale | `min × step` | `max × step` (swapped when the step is negative) |

## Levels

<Figure
  src="assessments-levels"
  alt="The levels editor: two levels with name, key, minimum, maximum, an optional redirect and the result text"
  caption="Levels are ranges of the total. The key is what an automation filters on; the name is what the visitor reads." />

A level is a range `min`–`max` of the total, **inclusive on both ends**, with:

| Field | |
| --- | --- |
| Key | lowercase, digits, `-` and `_`. Stored on the response, filtered on by the trigger, stable once published. |
| Name | what the result page shows as its heading |
| Text | shown under the heading. Markdown. |
| Redirect | optional. A URL the visitor is sent to instead of the result page. |

### The rules

The server refuses to save levels that:

- have no key or no name;
- end before they start (`min` above `max`);
- share a key;
- **overlap** — a score may belong to exactly one level;
- leave a **gap** — the next level has to start one point above the previous one.

These hold for drafts too. One more rule holds only when **Published** is on: the levels
have to cover the whole achievable range. A draft may cover part of it while it is being
built; a live assessment may not, because a visitor with a score outside every level would
see nothing.

::: tip Edit the questions after publishing and the range can move
The check runs on save. If a published assessment's options are changed later so that the
range grows past the levels, the save is refused — the editor says which range the levels
now have to cover. Should a stored rule and the questions ever disagree at submit time
anyway, a score below every level gets the lowest and a score above every level the
highest.
:::

### Redirects

A level with a redirect never shows the result page. The response is stored, the event
fires, and the visitor lands on the URL — a course page, a booking link, a sales page for
that segment. A JSON client gets the URL in the response body instead of being redirected.

## What is stored

Per response: the answers keyed by question id (an option index, a list of indexes, or the
scale value), the total, and the level key **as they were at the time**. Editing a level's
text later changes what a returning visitor reads on their result page; editing points or
ranges does not re-sort anyone. A result somebody was told is a result.
