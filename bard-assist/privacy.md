# Privacy and security

<AddonHeader />

Bard Assist sends text to an outside service. That is the whole feature, so this page says
exactly what is sent, where to, and what keeps someone from spending your key.

## What leaves the site

When an opted-in field is edited, these go to **TypeSafe** (`api.typesafe.ai`, a US
provider), or with `provider: vercel` to **Vercel** (`ai-gateway.vercel.sh`), which forwards
them to TypeSafe:

- **the text of the paragraphs being classified**, and of the neighbouring ones for context
  (the first two lines of the block before and the block after)
- **the names and instructions of the field's sets and fields**
- **the titles and descriptions of possible link targets** (with their entry ids as
  option keys), when a set has a link field. Their URLs stay in the Control Panel; a URL the
  editor typed into the paragraph is part of the paragraph and goes with it
- **the house examples** of that field, described below

Nothing is sent for fields that did not opt in, and nothing is sent without a key.

### House examples travel too

When an editor picks a different set than suggested, that paragraph (up to 300 characters)
and the chosen set are stored in the browser's `localStorage`, the twelve most recent per
field handle. These house examples are sent along with **every** request that chooses a set
for a block of that field, **in any entry** (the requests that map lines to fields and pick
link targets do not carry them). So text from other entries and other pages can reach the
provider as well, not only the text of the page being edited.

The storage belongs to the browser, not to the Statamic user: someone else signing in on the
same browser profile uses, and sends, the same examples. Clearing the site data for the
Control Panel removes them.

### What stays

Bard Assist stores **nothing on the server**: no table and no copy of the text. There is no
telemetry and no licence check. The one exception is an error: when the provider answers
with a failure, its status and the first 300 characters of its response are reported to your
application's log. Apart from that, the only thing it keeps anywhere is the house examples,
in the editor's browser.

## If your content contains personal data

Then you are responsible for a data processing agreement with the provider, and for
informing your editors. The addon cannot tell a price list from a client's name; it sends
what the editor typed.

In practice: switch the toggle on for the fields that hold page copy, and leave it off for
fields where people write about people.

## The key and who can spend it

The key never reaches the browser. The editor calls four Control Panel routes, and only the
server talks to the provider.

**All endpoints are Control Panel routes**: only signed-in users reach them, with Statamic's
CSRF check. On top of that:

- **Classifying, building a set and rendering a set for the preview require the publish
  form's own blueprint token**, as Statamic's core does for Replicator sets, issued for the
  signed-in user. A token from another user is refused.
- **The field named in the request has to be a top-level Bard field with Bard Assist
  switched on**, in the blueprint the token belongs to. So the key can only be spent from an
  entry form with an opted-in field.
- **Requests are size-limited**: at most 100 questions, 64 KB of text, 256 KB of questions.
  Over the byte limits, the request is refused with "This block is too long to classify.
  Split it with an empty line." More than 100 questions (a block of more than 100 lines, when
  its lines are mapped to fields) gets Laravel's generic validation message instead.
- **`rate_limit` caps requests per user and minute** through the proxy, 240 by default.

What that does not stop: **anyone who can open such an entry
form can still send their own requests through the proxy on your key.** The rate limit is
what bounds that. Lower it if the people with Control Panel access are many, or not all
yours.

## Link targets respect permissions

Link targets come only from collections the user may view, and only from the site selected
in the Control Panel. Only published entries with a URL are offered.

## The live preview

The preview is a page on your own site, inside the Control Panel, and the addon writes HTML
into it. Two guards:

- **The editor's text is escaped before a suggestion is drawn.** Lines from line-like fields
  and the link are HTML-escaped before your partial renders them, so typed markup shows as
  text and never runs. See [Live preview](/bard-assist/live-preview#escaping).
- **The preview script only takes orders from its own Control Panel.** It reacts only to
  messages from the window that embeds it, on the same origin, and only fetches same-origin
  URLs.

## Reporting a vulnerability

Not in a public issue. Email [info@adriangoldner.com](mailto:info@adriangoldner.com); you will
get an answer within a few days. Only the latest release receives security fixes.
