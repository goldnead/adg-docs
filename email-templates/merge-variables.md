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
