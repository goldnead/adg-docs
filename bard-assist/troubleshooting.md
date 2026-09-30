# Troubleshooting

<AddonHeader />

## No pills at all

Work down the list.

1. **Is the toggle on for this field?** Blueprint, the Bard field's settings, **Bard Assist**
   at the end. In YAML, `bard_assist: true` on the field.
2. **Is it a top-level Bard field?** A Bard inside a Replicator, a Grid or another set gets
   no suggestions, even with the toggle on.
3. **Is the editor script published?** `public/vendor/statamic-bard-assist/js/bard-assist.js`
   must exist and match the installed version. After an update:
   `php artisan vendor:publish --tag=bard-assist --force`.
4. **Are there blocks?** A block is a run of non-empty paragraphs. Headings made with the
   Bard toolbar, lists and existing sets are not blocks; type plain paragraphs.
5. **Did you pause?** Requests go out after a short typing pause, not on every key.

## "Bard Assist has no API key"

The bar shows this instead of suggestions, and nothing is sent. Set `BARD_ASSIST_API_KEY` in
`.env` (or `TYPESAFE_API_KEY`), and clear the config cache if the site caches it
(`php artisan config:clear`). See [Installation](/bard-assist/installation#a-key).

## "Unavailable · Try again" on every block

Hover the pill, or read the bar: the reason is the message.

| Message | What to check |
| --- | --- |
| The classification service could not be reached. | Outbound HTTPS from the server to the provider, a firewall, or a `timeout` that is too short. |
| The classification service answered with an error (401 or 403). | The key is wrong, or belongs to the other provider. A Vercel key needs `BARD_ASSIST_PROVIDER=vercel`. |
| The classification service answered with an error (other status). | The provider's response is in your application's log. On Vercel, check that your plan allows `typesafe-ai/jev`. |
| Unknown Bard Assist provider [...]. | `BARD_ASSIST_PROVIDER` is neither `typesafe` nor `vercel`. |
| Too many suggestions requested at once. | Over [`rate_limit`](/bard-assist/configuration#rate-limit). Wait a minute, or raise it. |
| This block is too long to classify. | Split the block with an empty line. |

## The suggestions are wrong

Almost always the blueprint, not the model. The model only knows your sets by their
`display` and `instructions`.

- **The same two sets keep being confused**, or a block that should be obvious comes back as
  a question: their instructions overlap. Say what one contains and the other does not, and
  where each usually sits on the page.
- **The right set, the lines in the wrong fields**: describe each field by the line that goes
  into it, not by how it looks. "Usually the first line" helps; "large text" does not.
- **The eyebrow lands in the heading field**: put the eyebrow field first. The first two
  `text` fields keep their blueprint order.
- **Correct it and keep writing.** A correction becomes a house example for that field and is
  sent with the next requests that choose a set for it.

See [Setting up a field](/bard-assist/setup).

## The same paragraph gets a different suggestion

Expected. The suggestions come from a model and are not deterministic; another run can give
another answer, especially for a block that sits between two sets. That is why nothing is
applied without a click, and why a block below the
[threshold](/bard-assist/configuration#threshold) is asked about instead of guessed.

## Suggestions follow corrections nobody here made

House examples are per browser, not per user. If someone else corrected suggestions in this
browser profile, their examples steer yours, and theirs are sent with your requests. Clear
the site data for the Control Panel to start over.

## No link target, or always the wrong one

- **The label field is not directly before the link field.** Only then is the link filled.
- **The pages have no description.** The model sees the title and the field named in
  [`targets.description_field`](/bard-assist/configuration#targets), `description` by
  default. "Services" alone is not enough to link a button to.
- **The target is in a collection without a route** (when `targets.collections` is `null`),
  or not in the configured list, has no URL, is in a collection the user may not view, or on
  another site than the one selected in the Control Panel, or not published.
- **More candidates than `targets.limit`.** Only the first 100 entries by title are offered;
  narrow `targets.collections`.

## Nothing in the live preview

See [Live preview → When the preview shows nothing](/bard-assist/live-preview#when-the-preview-shows-nothing):
the tag, a partial per set, `refresh: false`, and paragraphs the addon can find.

## `&amp;` in the preview

A partial that escapes its values itself escapes them a second time in the preview, because
the addon already did. The accepted set shows correctly. See
[Live preview → Escaping](/bard-assist/live-preview#escaping).

## Limits

These are not faults, but they are the questions that come up:

- **It suggests, it does not decide**, and it does not write text: no rephrasing, completing
  or translating.
- **Top-level Bard fields only.**
- **Only line-like fields and one `link` field per set are filled.** Other fields keep their
  defaults.
- **Each request costs a call to the provider**, sent after a typing pause for blocks that
  changed, and again for the blocks after one whose set changed.
- **Only the latest release is supported, on Statamic 6.** Bugs go to the
  [addon's issues](https://github.com/goldnead/statamic-bard-assist/issues); bugs in Statamic
  itself belong to [statamic/cms](https://github.com/statamic/cms).
