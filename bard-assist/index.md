# Bard Assist

<AddonHeader />

Write plain text in Bard. Bard Assist suggests which of your sets each paragraph should
become, and fills in the set's fields.

<Figure
  src="bard-assist-live-preview"
  alt="The live preview: a Bard field with plain paragraphs and a pill at each block on the left, the page on the right with each suggestion drawn as a dashed block in the site's own design"
  caption="Left, the text as the editor typed it, with a suggestion above each block. Right, the live preview drawing those suggestions with the site's own partials, before anything is accepted." />

## The hole this fills

Editors write the way they think: a heading, a sentence, a price, a button label, one
paragraph after another. Turning that into the right Bard sets usually means knowing the
blueprint by heart: which set holds a package with a price, which one is a step in a
process, which field the eyebrow line goes into.

Bard Assist reads each block of paragraphs and proposes a set from the field's own
configuration, which line goes into which field, and where a link should point. **Nothing
changes until the editor accepts, and every acceptance can be undone.**

## Where the suggestions come from

From [Jev](https://typesafe.ai), a classification model by TypeSafe. It chooses between
options you define and returns probabilities. **It does not write text.** Bard Assist sorts
the editor's own lines into sets and fields; it never rephrases, completes or translates
them.

The options it chooses between are your sets, described by their `display` and
`instructions` in the blueprint. That makes the blueprint the only steering there is, and
[Setting up a field](/bard-assist/setup) is the page that decides how good the suggestions
get.

## What you get

- **A toggle per Bard field.** Switched off, the field behaves exactly as before
- **A pill in the first line of each block** after a short typing pause: a suggestion to click, or a
  question when the model is not sure
- **The lines mapped to fields**, each one with a small field name you can click to move it
- **A link target** picked from your entries, or taken from a URL in the paragraph
- **Accept all** for every confident suggestion at once, and ⌥↩ (Alt+↩) for the block the
  cursor is in
- **Back to text** on every set it created, which turns it into the original paragraphs again
- **Suggestions in the live preview**, drawn with your own set partials, without reloading
  the preview
- **Corrections as house examples**: when an editor picks a different set, that decision is
  sent along with the next requests
- **Two providers**: TypeSafe directly, or through the Vercel AI Gateway
- An English and a German interface, and keyboard-operable menus

## The shortest useful path

1. Install it and add a key:

```bash
composer require goldnead/statamic-bard-assist
```

```dotenv
BARD_ASSIST_API_KEY=your-key
```

2. Open the blueprint, edit the Bard field and switch on **Bard Assist**.

3. Open an entry with that field, type a few paragraphs separated by empty lines, and wait
   for the pills.

The quality of step 3 depends on the `instructions` of your sets. With none, the model has
only the set names to go on. See [Setting up a field](/bard-assist/setup).

## What it deliberately does not do

- **Decide.** The same text can get a different suggestion on another run, so nothing is
  applied without a click, and an uncertain block is asked about instead of guessed.
- **Write.** No rephrasing, no completing, no translating. The words in the set are the
  words the editor typed.
- **Work in nested Bard fields.** Only top-level Bard fields are supported; a Bard inside a
  Replicator, a Grid or another set is not, yet.
- **Store anything on the server.** No table, no telemetry, no licence check. Corrections
  live in the editor's browser. See [Privacy and security](/bard-assist/privacy).

## It costs requests

Each classification is a call to the provider, on your key. Requests are sent after a short
typing pause for blocks that changed (and for the blocks after one whose set changed), and a
per-user limit caps them. What a call
costs is between you and the provider; this addon adds no price of its own. It is MIT and
free.

## Next

- [Installation](/bard-assist/installation) — the package, the key, and the two providers
- [Configuration](/bard-assist/configuration) — every key in `config/bard-assist.php`
- [Setting up a field](/bard-assist/setup) — the toggle, and `instructions` that steer
- [Writing with it](/bard-assist/writing) — pills, accepting, correcting, undoing
- [Live preview](/bard-assist/live-preview) — the tag, the preview target, the partials
- [Privacy and security](/bard-assist/privacy) — what leaves the site, and what guards the key
- [Reference](/bard-assist/reference) · [Troubleshooting](/bard-assist/troubleshooting)
