# Troubleshooting

<AddonHeader />

## The form URL 404s

In order:

1. **Is it published?** A draft answers 404 to visitors. Sign in to the Control Panel with
   `view assessments` and open the same URL: you get a preview with submitting disabled.
2. **Is the handle right?** It is the one in the listing's *Handle* column, not the title.
3. **Multi-brand?** The brand is derived from the handle; that only works because handles
   are unique across brands. If the row was inserted by hand with a duplicate handle, the
   lookup refuses rather than guesses.

## Saving is refused because of the levels

The message says which rule: a gap, an overlap, a level ending before it starts, or —
when publishing — levels that do not cover the range the questions can produce. The range
is shown above the levels; the levels have to run from its lowest to its highest value
without a hole. See [Questions and levels](/assessments/scoring#the-rules).

## The submit answers 422 for a question the visitor answered

The question was edited between page load and submit, or the template posts the wrong
shape. Single choice and scale post one value under `answers[{id}]`; multiple choice posts
a list under `answers[{id}][]`. An option index past the end of the options is refused
rather than counted as zero.

## The submit answers 419

The form has no CSRF token. In a template of your own, print `{{ csrf_field }}` inside the
form; a JavaScript client sends `X-CSRF-TOKEN`.

## Nothing arrives in LeadHub

1. Is LeadHub installed on this site? The bridge probes for its facade and stays quiet
   without it.
2. Is `integrations.leadhub` on?
3. Look in the log for `statamic-assessments: handing the response to LeadHub failed`.
   The response is stored regardless; the handover is never allowed to fail a submit.

The contact is created **without consent** by design. If you expected a subscription, that
is an automation on the trigger, not this bridge.

## The trigger is missing from the automation editor

The trigger is registered when the application has booted and Automations' facade
exists. Check `integrations.automations`, then the log for
`statamic-assessments: the automations trigger could not be registered`.

## The Control Panel page is blank

The compiled assets were not published. Run
`php artisan vendor:publish --tag=statamic-assessments --force`.

## The public page has no styling

Either `styles` is off, or the site's layout overrides the class names. The stylesheet is
inline and uses custom properties on `.assessment`; set those rather than fighting the
rules.
