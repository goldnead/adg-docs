# Troubleshooting

<AddonHeader />

## I cannot find the Control Panel screen

There is not one. This package registers no Control Panel page, no widget, no fieldtype, no
permission and no Antlers tag. It serves four public URLs and nothing else. See
[The page](/preference-center/the-page).

## `route:list` shows five routes, not seven

`preference-center.token` and `preference-center.token.update` are registered only when the
marketing source is available. Three things to check, in order:

1. Is `goldnead/statamic-marketing` installed?
2. Is `preference-center.sources.marketing` anything other than `false`?
3. Is the route cache stale? `php artisan route:cache` freezes the answer to question 1 into
   a file. Run `php artisan route:clear` and look again.

## `urlForToken()` returns `null` and I do not know why

It is `null` in exactly three cases, and they are not all visible from the route table:

| Cause | How to confirm |
| --- | --- |
| The routes are not mounted | `Route::has('preference-center.token')` is `false` |
| Marketing is switched off in config | `app(MarketingSource::class)->available()` is `false` while the class exists |
| The token is empty or whitespace | Check the caller |

The second is why a caller must not replace the method with its own `Route::has()`. The route
table was built at boot and cannot see a config switch flipped afterwards.

## `method_exists()` says the method is missing

You are probing the facade. Facade methods are forwarded through `__callStatic`, so they do
not exist on the facade class. Probe
`class_exists(\Goldnead\PreferenceCenter\PreferenceCenter::class)`, or at least
`\Goldnead\PreferenceCenter\Facades\PreferenceCenter::getFacadeRoot()`.

## Preference links in old mail return 404

They point at `/!/marketing/preferences/{token}`, which Marketing no longer serves. Neither
package ships a redirect. See
[Migrating from Marketing](/preference-center/migrating-from-marketing#links-already-in-peoples-inboxes)
for the one-route redirect that maps them onto this package, and note that the unsubscribe
links in the same mail are unaffected.

## The magic link in the mail returns 403

The provider rewrote it. A click counter forwards the reader with its own query parameters
appended, Laravel signs the whole query string, and `ValidateSignature` refuses.

Confirm it by comparing the plain-text link in the same message, which most providers leave
alone. If that one works and the button does not, this is the cause.

Two fixes, and you want both. Switch click tracking off for this message with the header your
provider documents in `delivery.mail_headers`, and add the parameter it appends to
`delivery.ignored_query_parameters`. Brevo has no such header, so on Brevo the ignore list is
the only thing that works. Both lists are in
[Configuration](/preference-center/configuration#delivery).

## The magic link returns 404

The blob did not decode. Either the link was mangled in transit, or `APP_KEY` changed since
it was issued — the payload is encrypted, not merely signed, so a rotated key invalidates
every outstanding link.

An **expired** link does not 404 here. It fails the signature check and returns 403.

## The request form says a link was sent and none arrives

The sentence is the same for all five outcomes on purpose. Look at the log channel named in
`audit.log_channel` for `preference-center.magic_link.throttled` and
`preference-center.magic_link.withheld`, then work through:

| Outcome | Cause |
| --- | --- |
| `unknown` | No Marketing subscription and no LeadHub contact for that normalised address |
| `blocked` | Suppressed in every brand that knows the address |
| `throttled` | Three requests per address per hour, or ten per origin |
| `disabled` | `magic_link.enabled` is `false` — but then the route would 404 |

If none of those fit, check that the address is stored the way the lookup expects it. Both
sources are queried on `email_normalized`, not on the raw column.

## The page opens but everything is empty

`data-block="none"` means neither Marketing nor Notifications is available. That is the
correct page for a host with none of the sources installed.

If a source *is* installed and its block is still missing, the marker class is the thing to
check. Note that the suppression marker is an interface: a custom availability check using
`class_exists()` alone will report it absent.

## Nothing is ever reported as blocked

Suppression is not installed. Without it the page has nothing to ask, and it will offer a
list back to an address that has been bouncing for a month. Install
`goldnead/statamic-suppression` before you trust the page.

## Saving a notification setting does nothing and says "unidentified"

There is no user and no contact for this address, so there is no key to store the preference
under. `notification_preferences` is keyed on `user_id` and `contact_uuid`, both NULL for an
unplaced visitor, and a row keyed on two NULLs would be shared by every other unplaced
visitor on the installation.

Install LeadHub, or sign the person in. Mailing-list changes still work in this state, because
they are keyed on the subscription.

## The cadence shows "mixed" and no option is selected

The stored state is genuinely none of the four: some types are mailed as they happen, others
collected. Defaults alone can produce this. Picking one of the four options makes it uniform.

## Saving without changing anything reports refusals

It should not. A no-op submission answers "Nothing was changed" with no refusals; a wall of
explanations for an untouched form was a defect fixed in 1.1.0. If you see it, check the
installed version.

## A magic-link session survived a login

It should not. `EndTheNoteOnLogin` clears the three session keys on
`Illuminate\Auth\Events\Login`. If the note persists, check that your login path fires that
event — a hand-rolled `Auth::setUser()` does not.

## An `AmbiguousBrandRecord` on the token route

Two Marketing subscriptions answer to the same token value. Marketing's token column carries
a unique index across all brands precisely so this cannot happen; if it does, the index is
missing or the data predates it. See
[Public routes](/brand-context/public-routes#the-column-must-be-globally-unique).

## A `POST` to the page returns 419

CSRF. Both `POST` routes are inside the `web` group and expect the token the form emits. If
you built your own form against these endpoints, include `@csrf`.

Note that Laravel's CSRF middleware skips itself in tests, so a suite is blind to this and
the live endpoint fails anyway. Test against a running server.
