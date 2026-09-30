# Setting up a field

<AddonHeader />

Two steps: switch the field on, then describe its sets well enough that somebody who has
never seen the site could tell them apart. The second step is the one that decides the
quality of every suggestion.

## The toggle

Open the blueprint, edit the Bard field, and switch on **Bard Assist**. It sits at the end of
the field's settings.

<Figure
  src="bard-assist-toggle"
  alt="The settings of a Bard field in the blueprint editor, scrolled to the end: a Bard Assist toggle, switched on, with the hint that the sets' display names and instructions steer the suggestions"
  caption="One toggle per Bard field. Off is the default, and a field that is off behaves exactly as it did before." />

In YAML that is one key on the field:

```yaml
content:
  type: bard
  bard_assist: true
  sets:
    blocks:
      sets:
        step:
          display: Step
          instructions: 'One step in a process: a short name and one explaining sentence. Usually follows a heading about a process or another step.'
          fields:
            - { handle: title, field: { type: text, display: Name, instructions: 'Short name of the step' } }
            - { handle: text, field: { type: textarea, display: Explanation, instructions: 'The explaining sentence' } }
```

Only **top-level** Bard fields are supported. A Bard nested inside a Replicator, a Grid or
another set gets no suggestions, even with the toggle on: the server resolves top-level
fields only, so the editor does not offer what it would refuse.

## The model only knows what the blueprint tells it

There is no prompt to write and no training step. For every block, the model is handed the
paragraph, its neighbours, and your sets, each described by its `display` and its
`instructions`. It picks one of them, or plain text. For every line of the chosen set, it
then picks a field, described by the field's `instructions` (or its `display`).

That is the whole of the steering. A set without instructions is a name and nothing else, and
two sets called "Intro" and "Header" are a coin toss.

### Set instructions: what the block is

Write them the way you would explain the set to a new editor:

- **what it contains**: a price, a question and its answer, a name and one sentence
- **what it does not contain**, when a neighbouring set is easy to confuse with it
- **where it usually sits on the page**: at the top of a section, after a heading about a
  process, near the end

Good:

```yaml
section:
  display: Heading
  instructions: 'Starts a new section: an eyebrow word, a heading, at most one or two sentences of introduction. Contains no prices, services or buttons itself.'
offer:
  display: Offer
  instructions: 'A single bookable package with its own price and what is included.'
call_to_action:
  display: Call to action
  instructions: 'Asks the reader to take the next step, usually with a button. Sits further down the page.'
```

The first one earns its last sentence. A heading followed by an introduction and a
package with a price look alike to a reader who only sees the words; "contains no prices"
is what tells them apart.

Weak:

```yaml
section:
  display: Section
  instructions: 'Section block'
offer:
  display: Box
  # no instructions
call_to_action:
  display: CTA
  instructions: 'Use for CTAs'
```

Each of these repeats the name or says nothing a reader can check against a paragraph.
"Box" describes the design, not the content, and "CTA" assumes the model shares your
abbreviations.

### Field instructions: which line goes where

A field's `instructions`, or its `display` when there are none, decide which line of the
block goes into it. Describe the line, not the design:

```yaml
- { handle: eyebrow, field: { type: text, display: Eyebrow, instructions: 'One or two words, stands before the heading, usually the first line' } }
- { handle: title, field: { type: text, display: Heading, instructions: 'The actual heading, often a short sentence or a question' } }
- { handle: intro, field: { type: textarea, display: Introduction, instructions: 'Introductory sentence after the heading' } }
```

"Usually the first line" and "often a question" are the kind of hint that works. "Large
text" or "Shown in gold" do not, because the model never sees your design.

## Which fields get filled

- **Line-like fields only**: `text`, `textarea`, `list` and `markdown`. Every other field of
  the set keeps its default.
- **A `list` field collects every line assigned to it**, so five short lines of services
  become five items.
- **Two lines assigned to the same `text`, `textarea` or `markdown` field are joined** with
  a space.
- **The first two `text` fields of a set keep their blueprint order.** If the model puts the
  second one above the first, they are swapped back. This is what keeps an eyebrow line above
  its heading, so put the eyebrow field first.
- **One `link` field per set** is filled, when the line-like field **directly before it** is
  its label, for example `button_text` followed by `button_link`. The target is taken from a
  URL in the paragraph, or picked from your entries. See
  [Writing with it](/bard-assist/writing#link-targets).

```yaml
fields:
  - { handle: button_text, field: { type: text, display: Button text, instructions: 'Short button label to book' } }
  - { handle: button_link, field: { type: link, display: Button target } }
```

The label has to be the field directly before the link field. Put another field between
them and the link either loses its label, and stays empty, or takes the wrong line as one.

## Plain text is always an option

Next to your sets, the model can always answer "text": running prose in full sentences with
no special form. A block it confidently calls text stays a paragraph and gets a quiet
**Text** pill instead of a suggestion to accept, which is what you want for the body copy
between the sets. The pill still opens the list of sets, for the times it is wrong.

## Link targets need a sentence per page

To pick a target, the model reads each candidate entry's title and one field that says what
the page is about, `description` by default. An entry without it is described by its title
alone, and "Coaching" or "Services" is not much to go on. One plain sentence per page is
enough. The field and the collections are set in
[Configuration](/bard-assist/configuration#targets).

## Corrections teach the next suggestion

When an editor picks a different set than the one suggested, that paragraph and the chosen
set are kept as a **house example** and sent along with the next requests that choose a set
for that field.
The request tells the model that house examples are the editors' decisions and take
precedence when in doubt. They are per browser, not per
site; see [Writing with it](/bard-assist/writing#corrections-become-house-examples) and
[Privacy and security](/bard-assist/privacy).

## Checking a blueprint

Write a page the way an editor would, one block per idea, and look at the pills:

- **A question on a block that should be obvious** (`Heading or Step?`): the two sets'
  instructions overlap. Add what one contains and the other does not.
- **The right set, the wrong fields**: the field instructions describe the design, or two
  fields describe the same line. Say which line it is, and where it usually sits.
- **The eyebrow and the heading swapped**: the eyebrow field is not the first `text` field of
  the set.
- **No link target**: the label field is not directly before the `link` field, or the
  target pages have no description.
