# Merge variables

<AddonHeader />

Templates use `{{ dotted.key }}` placeholders in the **subject** and the **body**.

Substitution is centralised in `Support\MergeVariables::apply()`, which is the important design detail:
the send path and the preview replace tags **identically**, and only the supplied data differs. So what
you see in Live Preview is what the renderer does.

## The documented sample set

These are the defaults Live Preview substitutes, overridable via
`config('email-templates.preview.sample_data')`:

| Variable | Sample value |
| --- | --- |
| `{{ contact.first_name }}` | `Maria` |
| `{{ contact.last_name }}` | `Beispiel` |
| `{{ contact.full_name }}` | `Maria Beispiel` |
| `{{ contact.email }}` | `maria.beispiel@example.com` |
| `{{ contact.salutation }}` | `Hallo Maria` |
| `{{ sender.name }}` | `config('mail.from.name')` |
| `{{ sender.email }}` | `config('mail.from.address')` |
| `{{ unsubscribe_url }}` | `https://example.com/newsletter/abmelden` |
| `{{ date }}` | today, `d.m.Y` |

`sender.*` and `date` come from your application rather than from the sample array, so they are already
real in the preview.

## Unknown tags stay visible

A tag with no data is **left in place**, not replaced with nothing.

```
{{ contact.frist_name }}
```

renders as `{{ contact.frist_name }}` rather than as an empty gap. That is deliberate: a typo you can see
in the preview is a typo you fix, and a silently empty greeting is one that ships.

::: warning The corollary
A tag your **consumer** does not supply also stays visible — in the real send, to a real recipient.

So a template that uses `{{ contact.company }}` will show that literal text to everybody if the sending
code never provides it. Only use variables the consumer documents, and check a real test send rather than
only the preview, where the sample data is generous.
:::

## What arrives escaped

**Every value is HTML-escaped when it is substituted into the body**, so a first name containing
`<script>` reaches the inbox as text rather than as markup. A merge value is recipient data, and the
mail carrying it usually goes to an address nobody has verified.

Two exceptions, both named rather than implicit:

| Exception | What it covers |
| --- | --- |
| `MergeVariables::RAW_VARIABLES` | Keys inserted raw. Today: `unsubscribe_url` — an address the package builds, used as an `href`. |
| `apply($text, $data, escape: false)` | Turns escaping off for the whole call. For output that is **not** HTML: the subject line and a plain-text part, where an escaped `&` would show the reader `&amp;`. |

Handing a template ready-made markup — an order table, a list of lines — therefore means escaping its
parts yourself and having the key added to `RAW_VARIABLES`. Until it is named there, the markup arrives
as text.

`{{ countdown_image }}` emits an `<img>` of its own. It is resolved **after** the escaping pass and
escapes its own attributes, so its markup is never double-escaped.

::: warning Before 2.3.0
Values were inserted verbatim. If your sending code escaped them before passing them in, remove that —
otherwise `&` becomes `&amp;amp;` in the body.
:::

## `{{ contact.salutation }}`

Worth using instead of building a greeting by hand.

```
{{ contact.salutation }},
```

`Hallo {{ contact.first_name }},` becomes `Hallo ,` for a contact with no first name — and there are
always contacts with no first name, because the subscribe form makes it optional. The salutation variable
is where that problem is solved once.

## `{{ unsubscribe_url }}`

::: danger Put it in the layout, not in each template
Required legally in most jurisdictions and practically for deliverability, and a template without it will
still send.

Putting it in the shared [layout](/email-templates/configuration#layouts-and-default-layout) is what
stops the fifth template being the one that shipped without a footer.
:::

Note that Marketing campaign **bodies** are Antlers and use `{{ unsubscribe_url }}` as an Antlers tag,
while this addon's templates use it as a merge variable. Same name, two mechanisms, and both resolve to
the recipient's tokenised link. See [Marketing → Campaigns](/marketing/campaigns#composing).

## `{{ countdown }}` — how long is left

Launch mails want to say how long until the course opens or registration closes. One tag,
substituted by the same pass as every other variable, so Live Preview and the real send agree:

```
{{ countdown until="2026-10-01 18:00" }}
```

renders, at the moment the mail is rendered, as

```
noch 3 Tage, 4 Stunden (01.10.2026, 18:00 Uhr)
```

| Parameter | Effect |
| --- | --- |
| `until` | Required. A date Carbon can parse, read in `app.timezone` (a value with its own offset is converted). Or a variable: `until="{{ event.starts_at }}"` and `until="event.starts_at"` both resolve against the same data as every other tag |
| `format` | `both` (default), `relative` — "noch 3 Tage, 4 Stunden" — or `absolute` — "01.10.2026, 18:00 Uhr" |
| `expired` | The relative text once the moment has passed. Default "vorbei" (de) / "over" (en) |

The relative text names the two largest non-zero units — days and hours, hours and minutes, or
minutes alone — and says "noch weniger als eine Minute" below that. Singular and plural follow the
count; the language follows the app locale (German and English ship).

An email is rendered once and then it is paper. The number is right when the mail is sent and the
absolute date next to it stays right forever; a recipient reading it three days later sees "sent
when there were 3 days left", which is what happened. That is the honest version of a countdown,
it works in every client, and it is the one to use unless someone insists on a moving picture.

A tag whose `until` cannot be resolved — an unknown variable, an unparseable date — is left
standing, for the same reason unknown tags are: the author should see it in the preview, not the
recipient in the inbox.

::: tip Put the event date in `preview.sample_data`
If your templates use `until="{{ event.starts_at }}"`, add an `event.starts_at` to
[`preview.sample_data`](/email-templates/configuration#preview-sample-data) so Live Preview has
something to count down to. Without it the tag stays visible in the preview — correct, but not what
you opened the preview to check.
:::

## `{{ countdown_image }}` — the moving picture

```
{{ countdown_image until="2026-10-01 18:00" width="480" label="Bis zum Kursstart" }}
```

renders an `<img>` whose `src` is a **signed URL** on the addon's action route,
`GET /!/statamic-email-templates/countdown.png?until=…&signature=…`. Each time a mail client fetches
it, GD draws "dd : hh : mm" as a seven-segment display for that moment, with the label underneath.
After the moment has passed the picture reads `00 : 00 : 00` with the expired text. The response is
cacheable for 60 seconds, which is the resolution the picture has.

| Parameter | Effect |
| --- | --- |
| `until` | As above, including variables |
| `width` | Pixels, 200–1200, default 600. Height is 30 % of the width |
| `bg`, `fg` | Background and digit colour as hex (`#000`, `ffcc00`). Defaults white on near-black |
| `label` | Caption under the digits. Default "Tage : Stunden : Minuten" / "days : hours : minutes" |
| `expired` | Caption once the moment has passed. Default "vorbei" / "over" |
| `alt` | The image's alt text. Default "Countdown bis 01.10.2026, 18:00 Uhr" |

The signature has no expiry: a mail is opened whenever it is opened. An unsigned or altered URL is a
403. The route runs under `throttle:60,1`. Rendering needs `ext-gd`; without it, or with
`email-templates.countdown.image` set to `false`, the route answers 404 and writes a warning to the
log — better the operator reads it there than hears it from recipients with broken image icons.

::: warning What mail clients actually do with it
- **Gmail** fetches every image through its proxy on every open, so the picture is current each
  time. Each open is also a request to your server; the 60 s cache and the rate limit are what keeps
  a large send from becoming a load test.
- **Apple Mail Privacy Protection** fetches every image **once, in advance**, from Apple's servers,
  at a moment of Apple's choosing — often within minutes of delivery. The recipient then sees that
  cached frame for good: a countdown that is wrong by however long ago Apple looked.
- **Outlook desktop** blocks remote images until the reader allows them; until then the alt text
  is all there is.

None of this touches the text tag. That is why it comes first, and why the image is for the customer
who has read this box and still wants it.
:::

## Adding your own

The variable set is whatever the **consumer** supplies at send time. This addon substitutes; it does not
define.

So if your own code sends through `EmailTemplates::resolve()`, you decide the data:

```php
$template = EmailTemplates::resolve('order-shipped', fn () => null);

MergeVariables::apply($template->body, [
    'contact' => ['first_name' => $order->first_name],
    'order' => ['number' => $order->number, 'tracking_url' => $order->tracking_url],
]);
```

and `{{ order.tracking_url }}` becomes available to the template author.

Two things worth doing when you add a namespace:

1. **Add it to `preview.sample_data`**, so Live Preview renders it and the author can see it working.
2. **Write it in the template's Description field.** That field exists so the next editor knows which
   variables this template may use, and it is the only place that information can live.

## Testing sample data

Realistic values catch problems that `foo bar` hides. Consider putting a deliberately awkward case in
your permanent sample data:

```php
'preview' => [
    'sample_data' => [
        'contact' => [
            'first_name' => 'Maximilian-Alexander',
            'last_name' => 'von Hohenzollern-Sigmaringen',
            'full_name' => 'Maximilian-Alexander von Hohenzollern-Sigmaringen',
            'email' => 'maximilian.alexander.von.hohenzollern@sehr-lange-domain.example.com',
            'salutation' => 'Hallo Maximilian-Alexander',
        ],
    ],
],
```

A long name and a long address are what break a fixed-width table in Outlook, and it is better to find
that in the preview than in a complaint.
