# Templates

<AddonHeader />

Eleven curated templates ship with the addon. Each is **copied** into a user-owned
automation when installed, so updates to the addon never silently change a flow you are
running.

That copy-on-install behaviour is the important part: a template is a starting point,
not a live dependency. Edit the result freely.

## The eleven

| Template | What it does | Needs |
| --- | --- | --- |
| **New Lead Notification** | Email the admin when a LeadHub lead is created | LeadHub |
| **Form Submission to Webhook** | Forward submissions to an external URL | — |
| **Qualified Lead to CRM** | Push qualified leads, add a note, schedule a follow-up | LeadHub |
| **Workshop Inquiry Flow** | Capture, tag, notify, schedule a follow-up | LeadHub |
| **Lead Magnet Delivery** | Send the file, create a tagged lead, log the delivery | LeadHub |
| **Follow-up Reminder** | Email a reminder when a follow-up becomes due | LeadHub |
| **Entry Published Notification** | Webhook on collection publish, Slack-friendly | — |
| **Webhook Failure Alert** | Admin email when a destination keeps failing | Webhook Manager |
| **Scheduled Daily Digest** | Run every morning on the *Schedule* trigger and email a digest | — |
| **Inbound Webhook → Entry** | Receive a webhook, de-duplicate it, create an entry | Webhook Manager |
| **AI Triage of Inquiries** | Summarise an inbound form inquiry with AI and email the summary | — |

Six of the eleven involve LeadHub or Webhook Manager. Those appear, and work, only when
that addon is installed; installing one without it produces an automation whose nodes are
flagged as unavailable rather than one that fails at run time.

*AI Triage of Inquiries* uses the AI action, which is a Pro feature and needs an
`ANTHROPIC_API_KEY`.

## Installing one

**Automations → Automation templates**, then install. You get a new automation,
**disabled**, with the nodes laid out and configured as far as the template can configure
them.

The nav entry is called *Automation templates* rather than *Templates* on purpose:
Statamic's own word for Antlers views is "Templates", and every addon's translation
strings merge into one Control Panel dictionary.

<Figure
  src="automations-templates"
  alt="The template library listing the curated starting flows that ship with the addon"
  caption="The Automation templates screen. Installing one copies it into a user-owned automation, so an addon update never changes a flow you are running." />

Then do the two things the template cannot do for you:

1. **Fill in what is specific to you** — the recipient address, the destination URL, the
   form handle, the tag.
2. **Test**, then enable.

## Which ones to start with

**Form Submission to Webhook** if you are evaluating the addon. It is the shortest
complete flow: one trigger, one action, and the token resolution between them.

**Lead Magnet Delivery** if you want to see a filter and a fan-out in one flow. It
filters on the submitted email, then delivers, creates the lead, tags it and logs the
delivery.

**New Lead Notification** if you run LeadHub. It is the flow most people build first
anyway, and it demonstrates the LeadHub trigger and the token picker.

**Webhook Failure Alert** is worth installing on any site that sends webhooks, because
its failure mode otherwise is silence. Note that Webhook Manager has its own
[alerting and circuit breaker](/webhook-manager/deliveries#alerting-and-the-circuit-breaker),
which is the better mechanism if you use that addon — this template is for sites that do
not.

## Editing a template's copy

It is an ordinary automation. Add nodes, remove nodes, rewire connections, change the
trigger. Nothing about it stays linked to the template.

Two things worth doing to any installed template before enabling it:

**Check the filter.** Templates filter conservatively, and a filter that made sense for
a generic install may be narrower or broader than you want.

**Swap the webhook action.** Templates that send HTTP use *Send Webhook (Simple)*,
because they cannot assume Webhook Manager is installed. If it is, switch to *Send
Webhook (via Webhook Manager)* and inherit retries, signing and the delivery log.

## Registering your own template

The template library is extensible. `Automations::template()` takes the same array shape
as the built-ins — `handle`, `name`, `description`, `requires`, `nodes`, `edges` — and
adds it to the catalogue:

```php
use Goldnead\StatamicAutomations\Facades\Automations;

public function boot(): void
{
    Automations::template([
        'handle' => 'agency_intake',
        'name' => 'Agency Intake',
        'description' => 'Capture an intake form, tag the lead and notify the account manager.',
        'requires' => ['leadhub'],
        'nodes' => [
            ['node_key' => 'trigger', 'type' => 'form_submitted', 'position_x' => 0, 'position_y' => 0, 'config' => ['form_handle' => 'intake']],
            ['node_key' => 'lead', 'type' => 'leadhub.create_or_update_lead', 'position_x' => 280, 'position_y' => 0, 'config' => [
                'email' => '{{ form.email }}',
            ]],
        ],
        'edges' => [
            ['from_node_key' => 'trigger', 'to_node_key' => 'lead'],
        ],
    ]);
}
```

`handle` and `nodes` are required; anything else throws an `InvalidArgumentException`. A
handle that collides with a built-in **replaces** it, which is how you swap a shipped
template for your own version rather than ending up with two.

Templates are not licence-gated. They only materialise nodes the user could also place by
hand, so registering one needs no Pro licence even where registering a custom node would.

`requires` names the sibling addons a template depends on (`leadhub`, `webhook_manager`),
and drives the "unavailable" marking rather than hiding the template.

## Building your own starter kit

Registering templates is the right answer when you ship an addon. For an agency running
several similar sites, exporting is usually simpler:

```bash
# export from the site you built it on
# CP → builder → Export, or:
GET /cp/automations/api/automations/{id}/export
```

Then import the JSON on the next site. Imports always create new automations, never
overwrite, and always start disabled. See
[Export, import & file sync](/automations/export-import).

For a repeatable kit, commit the JSON files to
`resources/automations/{handle}.json` and let file sync pick them up on deploy.

## Turning templates off

```php
'features' => ['templates' => false],
```

Hides the template library. Reasonable on a site where flows are managed as committed
JSON and an editor installing an ad-hoc template would be a surprise in the next diff.
