# Configuration

<AddonHeader />

Optional. With a key in `.env` the addon runs on its defaults. Publish the file only to
change one:

```bash
php artisan vendor:publish --tag=bard-assist-config
```

```php
// config/bard-assist.php
return [
    'provider' => env('BARD_ASSIST_PROVIDER', 'typesafe'),
    'api_key' => env('BARD_ASSIST_API_KEY', env('TYPESAFE_API_KEY')),

    'endpoint' => env('BARD_ASSIST_ENDPOINT'),
    'model' => env('BARD_ASSIST_MODEL'),

    'timeout' => 6,
    'rate_limit' => 240,
    'threshold' => 0.6,

    'targets' => [
        'collections' => null,
        'description_field' => 'description',
        'limit' => 100,
    ],

    'preview' => [
        'partial' => 'partials/sets/{handle}',
    ],
];
```

| Key | Default | What it does |
| --- | --- | --- |
| `provider` | `typesafe` (`BARD_ASSIST_PROVIDER`) | `typesafe` or `vercel`. Anything else is reported as an error in the editor. |
| `api_key` | `BARD_ASSIST_API_KEY`, then `TYPESAFE_API_KEY` | Stays on the server; the editor calls the provider through the Control Panel. |
| `endpoint` | provider default | Override the URL, e.g. for your own proxy. |
| `model` | provider default | `jev-latest` (TypeSafe) or `typesafe-ai/jev` (Vercel). |
| `timeout` | `6` | Seconds per request. |
| `rate_limit` | `240` | Requests per user and minute through the proxy. |
| `threshold` | `0.6` | Confidence from which a suggestion is offered as the answer. |
| `targets.collections` | `null` | Collections link targets come from. `null` means every collection with a route. |
| `targets.description_field` | `description` | Field that tells the model what an entry is about. |
| `targets.limit` | `100` | Most entries offered per request. |
| `preview.partial` | `partials/sets/{handle}` | Partial a suggested set is drawn with in the live preview. |

## provider and api_key

Where the model is called, and with what. Both are covered with their `.env` lines in
[Installation](/bard-assist/installation#two-providers).

Without a key, an opted-in field shows a notice above the text and sends nothing. That is
the whole of the "off" state; there is no separate switch.

## endpoint and model

Leave both `null` and the provider's defaults apply:

| Provider | Endpoint | Model |
| --- | --- | --- |
| `typesafe` | `https://api.typesafe.ai/v1/systemone` | `jev-latest` |
| `vercel` | `https://ai-gateway.vercel.sh/v1/evaluate` | `typesafe-ai/jev` |

Set `endpoint` to route the requests through a proxy of your own. The request body stays in
the chosen provider's format, so a proxy has to forward it unchanged.

## timeout

Seconds before a request to the provider is given up. The block then shows
**Unavailable · Try again**, and the bar above the text shows the message, here "The
classification service could not be reached."

## rate_limit

Requests per user and minute through the Control Panel proxy. Typing a page sends a few
requests per block (the set, then the fields, then a link target), so the default leaves
room for bursts. Above the limit the editor shows "Too many suggestions requested at once.
Wait a minute, then keep writing."

It is the cap on how much of your key one signed-in user can spend. See
[Privacy and security](/bard-assist/privacy#the-key-and-who-can-spend-it).

## threshold

Confidence, from 0 to 1, from which a suggestion is offered as the answer. Below it the
editor is asked which of the two likeliest sets it is, instead of being handed a guess.

Confidence here is not the raw probability of the top set. It is that probability rescaled
by the number of options, so an even split between all of them counts as zero confidence
rather than as, say, 0.5 for two sets or 0.1 for ten.

Raise it if editors accept wrong suggestions without looking; lower it if they are asked too
often about blocks that were obvious. The same value decides when a link target is filled in
rather than left open, and which suggestions **Accept all** takes.

## targets

Which entries a link field in a suggested set may point to.

- **`collections`**: a list of collection handles, or `null` for every collection that has a
  route. An explicit list is taken as it is; entries without a URL are dropped either way. Either way, a user only gets entries from collections they may view.
- **`description_field`**: the field that tells the model what an entry is about. An entry
  without it, or where it is not plain text (a Bard or an array), is described by its title
  alone. A one-sentence description per page is what makes link targets land.
- **`limit`**: the most entries offered to the model per request. Only published entries
  with a URL, on the site selected in the Control Panel, sorted by title.

## preview.partial

The partial a suggested set is drawn with in the live preview. `{handle}` is replaced by the
set handle, and a leading underscore on the file name is found too (`_step.antlers.html`).
When the partial does not exist, that suggestion is simply not shown in the preview. See
[Live preview](/bard-assist/live-preview).

## What it deliberately has no key for

- **Which Bard fields take part.** That is the toggle on each field, in the blueprint. See
  [Setting up a field](/bard-assist/setup).
- **How the model should behave.** There is no prompt to edit. The sets' `display` and
  `instructions` are the steering, and they live where the sets live.
- **Telemetry or a licence check.** There is neither.
