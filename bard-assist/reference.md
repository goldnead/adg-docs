# Reference

<AddonHeader />

## The blueprint key

```yaml
type: bard
bard_assist: true
```

A toggle appended to every Bard field's settings, labelled **Bard Assist**, default `false`.
Only top-level Bard fields honour it.

## What the model reads from the blueprint

| Where | Read as |
| --- | --- |
| set `display` | The option's name, in the model's choice and in the editor's pills. |
| set `instructions` | What the option means. The first clause is also shown under the name in the menu. |
| field `instructions`, else `display` | Which line of the block belongs in that field. |
| field `type` | Only `text`, `textarea`, `list` and `markdown` are filled from lines; one `link` field whose previous field is line-like gets a target. |
| entry `title` and `description` | What a possible link target is about. The field is [`targets.description_field`](/bard-assist/configuration#targets). |

## The tag

```antlers
{{ bard_assist:live_preview }}
```

Place it at the end of the layout's `<body>`. It renders a small script inside a live
preview request and nothing otherwise. No parameters. See
[Live preview](/bard-assist/live-preview).

## Publish tags

| Tag | When |
| --- | --- |
| `bard-assist` | The editor script, to `public/vendor/statamic-bard-assist`. Statamic does it on install; run it with `--force` after every update. |
| `bard-assist-config` | Only to change a default. See [Configuration](/bard-assist/configuration). |

## Environment variables

| Variable | Default | |
| --- | --- | --- |
| `BARD_ASSIST_API_KEY` | falls back to `TYPESAFE_API_KEY` | The provider key. Without one, nothing is sent. |
| `TYPESAFE_API_KEY` | — | Read only when `BARD_ASSIST_API_KEY` is not set. |
| `BARD_ASSIST_PROVIDER` | `typesafe` | `typesafe` or `vercel`. |
| `BARD_ASSIST_ENDPOINT` | provider default | Override the URL. |
| `BARD_ASSIST_MODEL` | provider default | Override the model. |

## Control Panel routes

All four sit inside Statamic's Control Panel route group: signed in, CSRF-checked. They are
called by the editor script, not meant for your own code.

| Method | Path | Guards | Returns |
| --- | --- | --- | --- |
| `POST` | `/cp/bard-assist/evaluate` | blueprint token, opted-in field, size limits, `throttle:bard-assist` | The model's answers. |
| `GET` | `/cp/bard-assist/targets` | only collections the user may view | Link target candidates: id, title, URL, description. |
| `POST` | `/cp/bard-assist/set` | blueprint token, opted-in field | A set's values and meta, pre-processed as the publish form expects them. |
| `POST` | `/cp/bard-assist/render` | blueprint token, opted-in field | The set as HTML through its partial, or `204` when there is no partial. |

`/cp` is your Control Panel route, whatever it is set to.

### Limits on `evaluate`

| | |
| --- | --- |
| Questions per request | 100 |
| Text (`state`) per request | 64 KB |
| Questions per request, as JSON | 256 KB |
| Requests per user and minute | [`rate_limit`](/bard-assist/configuration#rate-limit), default 240 |

### Status codes

| Status | Message in the editor | Cause |
| --- | --- | --- |
| `403` | Laravel's own | Missing or foreign blueprint token. |
| `404` | Laravel's own | The field is not a top-level Bard field with Bard Assist on, or the set does not exist. |
| `422` | This block is too long to classify. Split it with an empty line. | Over the 64 KB or 256 KB limit. More than 100 questions gets Laravel's generic validation message. |
| `429` | Too many suggestions requested at once. Wait a minute, then keep writing. | Over `rate_limit`. |
| `502` | The classification service answered with an error (status). | The provider answered with an error. The response is reported to your application's log. |
| `503` | Bard Assist has no API key. Set BARD_ASSIST_API_KEY in .env. | No key. Also for an unknown provider, with that message. |
| `504` | The classification service could not be reached. | Timeout or connection failure. |

## What is stored in the browser

| Key | Value |
| --- | --- |
| `localStorage["bard-assist.examples.{field handle}"]` | The twelve most recent corrections for that field: paragraph (up to 300 characters) and chosen set. |

Nothing is stored on the server.

## Translations

The interface ships in English and German, following the Control Panel's language. The
strings are in the package's `lang/{locale}/messages.php`, under the
`bard-assist::messages` namespace.

## Requirements

| | |
| --- | --- |
| PHP | 8.2+ |
| Statamic | 6.34+ |
| Other packages | none |
| Database | not used |
