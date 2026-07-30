# Importing & consuming

<AddonHeader />

## Importing file-based templates

```bash
php artisan email-templates:import
```

Pulls file-based templates from sibling addons — soft-dependency sources, Marketing included — into
entries, **preserving the slug 1:1**.

That slug preservation is the whole point: a consumer resolving `welcome` finds the imported entry with no
change on its side, so the migration is invisible to the sending code.

### Fidelity

Legacy HTML is converted to Bard nodes by `HtmlToBard`.

::: warning Structure survives, styling may not
tiptap's default schema keeps headings, lists, links, images and tables, and **drops inline styles and
unknown attributes**.

Import into a non-production environment first, open each template in Live Preview, and compare against the
original. Simple transactional templates round-trip cleanly; a heavily styled marketing template may not.

Where you need pixel fidelity, `save_html: true` on the Bard field or a dedicated raw-HTML fallback field
are the escape hatches. Both trade editability for fidelity — decide per template rather than globally.
:::

## Consuming from a sibling addon

```php
use Goldnead\EmailTemplates\Facades\EmailTemplates;

$template = EmailTemplates::resolve($slug, function (string $slug) {
    // return your addon's inline body as an array, or null
    return ['title' => '…', 'body' => '<p>…</p>'];
});

$template?->subject;   // string
$template?->body;      // email-ready HTML string
```

**A managed entry wins.** The caller-supplied file fallback keeps un-migrated slugs working.

That contract is what makes the addon safe to adopt and safe to remove:

| Situation | What happens |
| --- | --- |
| Addon installed, entry exists | the entry is used |
| Addon installed, no entry for that slug | the fallback is used |
| Addon not installed | the fallback is used |
| Addon disabled via `'enabled' => false` | the fallback is used |

So adding Email Templates does not break existing sends, and removing it does not either. Neither
direction needs a migration.

## Rendering with your own data

`resolve()` gives you a subject and an HTML body with merge tags still in them. Substitution is a separate,
centralised step:

```php
use Goldnead\EmailTemplates\Support\MergeVariables;

$subject = MergeVariables::apply($template->subject, $data);
$body = MergeVariables::apply($template->body, $data);
```

Use `MergeVariables::apply()` rather than your own `str_replace`. It is the same call Live Preview makes,
which is what guarantees the preview and the send agree — and a second implementation would be a second
place for them to diverge.

```php
$data = [
    'contact' => [
        'first_name' => $contact->first_name,
        'salutation' => $contact->salutation,
        'email' => $contact->email,
    ],
    'unsubscribe_url' => $subscription->unsubscribeUrl(),
];
```

Any namespace you supply becomes available to the template author. Two things to do when you add one:

1. Add it to `preview.sample_data`, so Live Preview renders it.
2. Write it in the template's **Description** field — that is where the next editor learns which variables
   this template may use.

::: warning A tag you do not supply is shown to the recipient
Unknown tags are left **visible**, deliberately, so typos are obvious in the preview. The same rule applies
in a real send: a template using `{{ order.number }}` that your code never supplies shows that literal text
to a real person.

Check a real test send, not only the preview, where the sample data is generous.
:::

## Contributing an import source

Implement `Goldnead\EmailTemplates\Contracts\EmailTemplateSource` and tag it:

```php
$this->app->tag([MySource::class], 'email-templates.sources');
```

The import command then picks it up alongside the bundled sources. Preserve your slugs: they are the
reference a consumer already uses, and changing them during an import is how you silently fall back to the
file body forever.

## Who consumes it today

| Addon | Uses it for |
| --- | --- |
| [Marketing](/marketing/campaigns#templates) | Campaign wrapper templates |
| [Automations](/automations/nodes) | The Send Email Notification action's body |

Both optional, both with a file fallback, neither depending on this addon.

## Re-running the import

The command preserves slugs, so re-running it against a template that has already been imported and then
**edited in the CP** is the case to be careful about — the file is still the file, and the entry is the one
somebody improved.

Import once, per environment, as a migration step. After that, the entries are the source of truth and the
files are history.
