# Templates

<AddonHeader />

Eight curated templates ship with the addon. Each is **copied** into a user-owned
automation when installed, so updates to the addon never silently change a flow you are
running.

That copy-on-install behaviour is the important part: a template is a starting point,
not a live dependency. Edit the result freely.

## The eight

| Template | What it does |
| --- | --- |
| **New Lead Notification** | Email the admin when a LeadHub lead is created |
| **Form Submission to Webhook** | Forward submissions to an external URL |
| **Qualified Lead to CRM** | Push qualified leads, add a note, schedule a follow-up |
| **Workshop Inquiry Flow** | Capture, tag, notify, schedule a follow-up |
| **Lead Magnet Delivery** | Send the file, create a tagged lead, log the delivery |
| **Follow-up Reminder** | Daily reminders for due follow-ups |
| **Entry Published Notification** | Webhook on collection publish, Slack-friendly |
| **Webhook Failure Alert** | Admin email when a destination keeps failing |

Five of the eight involve LeadHub. Those appear, and work, only when LeadHub is
installed; installing them without it produces an automation whose LeadHub nodes are
flagged as unavailable rather than one that fails at run time.

## Installing one

**Automations → Templates**, then install. You get a new automation, **disabled**, with
the nodes laid out and configured as far as the template can configure them.

<Figure
  src="automations-templates"
  alt="The template library listing the curated starting flows that ship with the addon"
  caption="Installing a template copies it into a user-owned automation, so an addon update never changes a flow you are running." />

Then do the two things the template cannot do for you:

1. **Fill in what is specific to you** — the recipient address, the destination URL, the
   form handle, the tag.
2. **Test**, then enable.

## Which ones to start with

**Form Submission to Webhook** if you are evaluating the addon. It is the shortest
complete flow and it exercises the trigger, a filter and an action.

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

## Building your own starter kit

Templates are not extensible in v1 — you cannot register your own into the template
library. What you can do instead, and what works well for an agency running several
similar sites:

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
