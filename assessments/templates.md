# The public pages and tags

<AddonHeader />

Two pages, both Antlers, both rendered through Statamic's own view inside the site's
layout: the form at `/a/{handle}` and the result at `/a/{handle}/r/{token}`.

## The shipped templates

```bash
php artisan vendor:publish --tag=assessments-views
```

| File | Renders |
| --- | --- |
| `assessment.antlers.html` | intro, the questions, name and email, the submit button |
| `result.antlers.html` | the level's name and text, the score, the closing text, the answers |
| `layout.antlers.html` | the fallback shell, used only when the site has no [`layout`](/assessments/configuration#layout) |
| `styles.antlers.html` | the inline stylesheet, included by the first two unless `styles` is off |

Both templates get their variables under `assessment:` — `assessment:questions`,
`assessment:action`, `assessment:result_label`. Only `title` is also in the cascade, for
the layout's `<title>`; nothing else goes in flat, so the site's own `url` or `name` inside
the layout stays untouched. (The [tags](#tags) hand their variables over flat, since they
run inside a template of your own.)

<Figure
  src="assessments-result"
  alt="The result page: the assessment title, the level name Aufbau as heading, 13 Punkte, the level text and a collapsed list of the answers"
  caption="The result page, reload-safe under its own token, so the address can be sent on." />

## The form's variables

| Variable | |
| --- | --- |
| `title`, `intro`, `outro` | the assessment's texts; `intro` is Markdown |
| `questions` | the list below |
| `ask_name`, `name_required` | how the name field is asked for |
| `action` | where the form posts |
| `preview` | true when an editor is looking at an unpublished assessment |
| `styles` | whether to include the stylesheet |

Each question:

| Variable | |
| --- | --- |
| `id`, `text`, `help`, `type` | |
| `field` | the input name, `answers[{id}]` — add `[]` for multiple choice |
| `is_single`, `is_multi`, `is_scale` | one of them true |
| `options` | `index`, `label`, `checked` — for single and multiple choice |
| `steps` | `value`, `checked` — for a scale, one per step from `min` to `max` |
| `min`, `max` | the scale's ends |

`checked` is set when a validation error sent the visitor back to the form; the template
does not compare anything itself.

## The result's variables

`title`, `outro`, `name`, `score`, `result_key`, `result_label`, `result_text`, `token`,
`url` (the form), and `answers` — a list of `question`, `type`, `answer` (the chosen labels,
comma-separated for multiple choice) and `points`, as they were at submit time.

Not the email address. The result URL is permanent — its token is 40 random characters
minted on the server — and gets passed around; whoever opens it sees a result, not whose
it is.

## Tags

For a page that draws the form itself, or shows the result somewhere other than the
shipped page.

### `{{ assessments:url }}`

```antlers
<a href="{{ assessments:url handle="stimm-check" }}">Zum Stimm-Check</a>
```

Empty for an unpublished or unknown handle, so a link to a draft never goes out.

### `{{ assessments:form }}`

A tag pair with the form's variables above:

```antlers
{{ assessments:form handle="stimm-check" }}
    <form method="POST" action="{{ action }}">
        {{ csrf_field }}

        {{ questions }}
            <fieldset>
                <legend>{{ text }}</legend>
                {{ if is_single }}
                    {{ options }}
                        <label><input type="radio" name="{{ field }}" value="{{ index }}" required> {{ label }}</label>
                    {{ /options }}
                {{ elseif is_multi }}
                    {{ options }}
                        <label><input type="checkbox" name="{{ field }}[]" value="{{ index }}"> {{ label }}</label>
                    {{ /options }}
                {{ elseif is_scale }}
                    {{ steps }}
                        <label><input type="radio" name="{{ field }}" value="{{ value }}" required> {{ value }}</label>
                    {{ /steps }}
                {{ /if }}
            </fieldset>
        {{ /questions }}

        {{ if ask_name }}<input type="text" name="name"{{ if name_required }} required{{ /if }}>{{ /if }}
        <input type="email" name="email" required>
        <button type="submit">Ergebnis anzeigen</button>
    </form>
{{ /assessments:form }}
```

The honeypot field `website` is optional in a template of your own; the shipped one has it.

### `{{ assessments:result }}`

Reads the token from the `token` parameter, or from the URL's `r` query string:

```antlers
{{ assessments:result }}
    <h1>{{ result_label }}</h1>
    <p>{{ score }} Punkte</p>
    {{ result_text | markdown }}
{{ /assessments:result }}
```

Renders nothing without a valid token. The shipped result template has the token as
`token`; a published copy of it can link on to a page of the site's own with
`?r={{ token }}`, and that page shows the same result through this tag. Most sites simply
publish the shipped template and change it.

## Submitting from JavaScript

`POST /a/{handle}/submit` with `Accept: application/json` and the same fields returns:

```json
{
  "ok": true,
  "data": {
    "score": 13,
    "result_key": "aufbau",
    "result_label": "Aufbau",
    "result_url": "https://example.com/a/stimm-check/r/…",
    "redirect": null
  }
}
```

Validation errors come back as Laravel's usual 422 with `errors` keyed by field
(`answers.14` for a question). The CSRF token is still required — send `X-CSRF-TOKEN` or
`_token`.
