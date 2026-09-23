# Who sees a lesson

<AddonHeader />

A lesson, or a whole section, can be limited to some of the course's learners: a bonus module
for the premium tier, a lesson only for the choir's section leaders. **For everybody else the
lesson is not part of the course.** It is not listed, not counted in the progress, and does
not lock the path behind it. A learner never sees a lesson they cannot reach, and never waits
for one.

That is different from a [lock](/courses/locks). A locked lesson is shown and opens later; a
hidden lesson is not there.

## A rule

A rule lists up to four kinds of thing. **One match, across all four, is enough.** A rule with
nothing in it matches everybody.

| Kind | Matches a learner who |
| --- | --- |
| Entitlements | holds that product, asked through the bound [`CourseAccess`](/courses/access) |
| User groups | is in that Statamic user group |
| LeadHub tags | whose [LeadHub](/leadhub/) contact, found by email address, carries that tag (case and slug spelling both match) |
| LeadHub segments | whose LeadHub contact is in that segment, by handle |

Tags and segments need LeadHub. Without it, or for a learner without a contact, a rule that
names only tags and segments matches nobody: a lesson meant for a segment stays hidden rather
than opening to everybody. Tags and segments are asked fresh on every read, so a tag added a
minute ago counts on the next page load.

## On a lesson

The lesson blueprint's **Visible to** section: `audience_entitlements`, `audience_groups`,
`audience_tags`, `audience_segments`. Empty, the lesson is there for everybody in the course.

## On a section

A whole section is limited on the course entry, under **Visible to**: `section_audiences`, one
row per section, with the section's `section_key` and the same four kinds. A lesson in a
limited section is visible only when the section's rule **and** its own rule both match.

## What it changes

- `outline()`, `lessons()`, `summary()` and the tags leave hidden lessons out; the rollup's
  total counts only visible ones, so a learner can reach 100 %.
- Sequencing, phases and "completed" are computed over the visible lessons. `CourseCompleted`
  fires when every lesson the learner can see is done.
- `{{ courses:blocks }}` and `{{ courses:quiz }}` render nothing for a hidden lesson. A super
  user sees it anyway, so the Control Panel's live preview works.

A hidden lesson is not a secret. Its entry is published and has a URL like any other; the
visibility rule decides what this package shows and counts, not whether the page renders.
Keep a template's own lesson page behind the same tags.
