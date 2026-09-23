# Lesson content

<AddonHeader />

A lesson is built from blocks. The lesson blueprint's **Lesson content** section has two
fields: the markdown `content` lessons had before blocks, which stays and renders first, and
`blocks`, a replicator with seven sets.

<Figure
  src="courses-lesson-blocks"
  alt="A German lesson page in the playground: the lesson title, the older content text, a paragraph, a tip with a heading, two columns headed Körper and Klang, a download link with the file type and size, two collapsed questions, and a link to the next lesson"
  caption="One lesson in the playground, unstyled: the older content text, then a text, a callout, columns, a download, an FAQ and a button block." />

| Group | Set | Fields | What a template gets |
| --- | --- | --- | --- |
| Content | Text | `text` (markdown) | `html` |
| Content | Callout | `tone` (`info`, `tip`, `warning`), `heading`, `text` | `tone`, `heading`, `html` |
| Content | Columns | two to four columns, each `text` | `columns` (each `html`), `count` |
| Content | FAQ | questions, each `question` and `answer` | `items` (each `question`, `answer_html`) |
| Media | Video | `url`, `caption` | `url`, `embed_url`, `caption` |
| Media | Download | `private`, `file` or `private_file`, `label` | `url`, `label`, `filename`, `extension`, `size`, `private` |
| Media | Button | `label`, `link`, `style` (`primary`, `secondary`) | `label`, `url`, `style` |

Every block also carries `type`. **A block with nothing to show is dropped**: a download
without a file, a private download without Private Media, a button without a link or a label,
an FAQ without a question. A template never prints an empty shell. A block switched off in
the replicator is dropped as well.

A set a site adds to the replicator itself is handed over as stored, with its `type`, for a
partial of the site's own.

## Rendering

```antlers
{{# on a lesson page #}}
{{ courses:blocks }}
```

As a single tag it renders one shipped partial per block, wrapped in
`<div class="courses-blocks">`. The partials carry class names and only the inline styles a
video frame needs; everything else is the site's to style. To change
one, place your own at `resources/views/vendor/courses/blocks/{type}.antlers.html`.

As a pair it hands the blocks over and draws nothing:

```antlers
{{ courses:blocks }}
    {{ if type == "callout" }}<aside class="{{ tone }}">{{ html }}</aside>{{ /if }}
{{ /courses:blocks }}
```

The tag reads the lesson in context, or the entry id in `lesson="…"`. It renders nothing for
a guest, for a learner without access to the course, and for a lesson that is
[locked](/courses/locks) or [hidden](/courses/visibility) for them. Super users see every
lesson, so the Control Panel's live preview works.

## Video

YouTube and Vimeo links become players: `embed_url` is the `youtube-nocookie.com` or
`player.vimeo.com` address. Any other link, a video file for example, has no `embed_url`, and
the shipped partial plays it in a `<video>` element.

With [Consent](/consent/) installed, the player waits behind `{{ consent:gate }}` for the
`youtube` or `vimeo` service: the shipped partial switches to `video-consent` by itself.
Without Consent the player loads as before.

## Downloads

A download picks its file from an asset container. `courses:install` writes one into the
field: [`downloads.container`](/courses/configuration#downloads-container), or the site's first
container other than Private Media's. An assets field without a container would take the
whole publish form down, so a site without any container is warned and has to create one,
then run `courses:install --force`.

### Private downloads

**Only for learners of this course** turns a download private. The file then comes from its
own field, **Private file**, which picks only from [Private Media](/private-media/)'s
container (`private-media.source.container`), so a public and a private download can sit side
by side and a private file cannot be picked from a public container.

The link is signed by Private Media for the resource `course:<slug>`, and courses answers
Private Media for that resource with `Courses::canAccess()`. So whoever may open the course
gets the file: a buyer, a bundle holder, a [team member](/courses/teams). Whoever a
[hold](/courses/payment-failure) shuts out does not. Every other resource goes to the site's
own media access unchanged. On a multi-brand site the download is checked in the brand of the
request that fetches it.

Without Private Media the toggle and the private field are left out of the blueprint. A
private download that points at a file outside Private Media's container is left out and
logged, because Private Media would refuse the link anyway.

## Blocks from PHP

```php
use Goldnead\Courses\Support\LessonBlocks;

$blocks = app(LessonBlocks::class)->for($lessonEntry, $user, 'course:cvt-101');
```

The same list the tag uses, read from the entry's raw values, so the shape is the same in a
tag, an API response or a test. Without a user and a resource, private downloads are dropped.
