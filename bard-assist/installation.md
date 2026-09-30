# Installation

<AddonHeader />

<Requirements statamic="6.34+ (Bard)" database="Not used" />

```bash
composer require goldnead/statamic-bard-assist
```

Statamic publishes the editor script to `public/vendor/statamic-bard-assist` during the
install. If you ever need to do it by hand, and after every update, run:

```bash
php artisan vendor:publish --tag=bard-assist --force
```

There is no migration, no queue, no scheduled task and no screen in the Control Panel
navigation. The addon adds a toggle to the Bard field's settings, one tag for the live
preview, and four Control Panel routes the editor calls.

## A key

Without one, an opted-in Bard field shows a short notice above the text and makes no
requests. Add it to `.env`:

```dotenv
BARD_ASSIST_API_KEY=your-key
```

The key stays on the server. The editor never sees it: every request goes through the
Control Panel, which calls the provider. See [Privacy and security](/bard-assist/privacy).

## Two providers

The model is the same either way, TypeSafe's Jev. What differs is who you pay and where the
request goes.

### TypeSafe directly

The default. Create a key at [typesafe.ai](https://typesafe.ai) and set it as above.

`TYPESAFE_API_KEY` is read as a fallback when `BARD_ASSIST_API_KEY` is not set, so a site
that already has a TypeSafe key in `.env` needs nothing new.

| | |
| --- | --- |
| Endpoint | `https://api.typesafe.ai/v1/systemone` |
| Model | `jev-latest` |

### Vercel AI Gateway

Create an AI Gateway key in your Vercel dashboard, and switch the provider:

```dotenv
BARD_ASSIST_PROVIDER=vercel
BARD_ASSIST_API_KEY=your-vercel-ai-gateway-key
```

The gateway calls the model `typesafe-ai/jev`, and **your Vercel plan must allow it.** The
gateway names the yes/no answer type differently from TypeSafe; the addon translates on the
way in and on the way out, so nothing else changes.

| | |
| --- | --- |
| Endpoint | `https://ai-gateway.vercel.sh/v1/evaluate` |
| Model | `typesafe-ai/jev` |

Any other value for the provider is reported as an error in the editor, not ignored.

### Your own proxy

`BARD_ASSIST_ENDPOINT` and `BARD_ASSIST_MODEL` override the provider's defaults, for example
to send the requests through a proxy of your own. See
[Configuration](/bard-assist/configuration#endpoint-and-model).

## Quick start

Switch on **Bard Assist** in a Bard field's settings (details in
[Setting up a field](/bard-assist/setup)), open an entry with that field and type a few
paragraphs separated by empty lines.

<Figure
  src="bard-assist-bar"
  alt="An entry form: the Bard field starts with a bar reading Bard Assist, 9 suggestions, 4 need your choice, and an Accept all 9 button; the first block carries a pill named Überschrift"
  caption="The bar above the text counts what is open. Each block gets its pill after a short typing pause." />

## Multi-site

Nothing is stored per site. Suggestions work on whichever localization is being edited.
Link targets come from the site selected in the Control Panel's site switcher, with their
URLs as Statamic returns them.

## Uninstalling

Switch the toggle off (or remove `bard_assist: true`), remove
`{{ bard_assist:live_preview }}` from your layout, then:

```bash
composer remove goldnead/statamic-bard-assist
```

Sets created with Bard Assist are ordinary Bard sets and stay as they are.

## Licence

MIT, and free. It is not part of the Suite and not covered by the Suite EULA. See
[Licensing](/guide/licensing).
