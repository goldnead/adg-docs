# LeadHub and the suite

<AddonHeader />

Every integration below is optional. Each is detected at runtime by class name and registered
once; without the package, its part of the screen or the hook simply is not there.

## LeadHub

Requires [LeadHub](/leadhub/) 2.13 or later.

**Contacts are looked up, never created by the fetch.** When a conversation opens, and again
with each new message while it has none, the other side's address is looked up in LeadHub.
Found, the conversation is linked to that contact. Not found, it stays on its address. A
contact is created only by a click on **Create contact** ("Kontakt anlegen") in the
conversation: address, first and last name split from the sender's name, source `inbox`.
Otherwise every newsletter and every spam mail would become a CRM contact.

**In the conversation**, the contact card shows the name, address, organisation and tags, with
a link to the contact. "Unlink contact" in the header menu removes the link; linking only
accepts a contact LeadHub knows in the current brand. The list shows the LeadHub name in place
of the sender's.

**On the contact**, an **E-Mails** panel lists the five latest conversations with that address,
each linking into the inbox.

**On the timeline**, every received and every sent message becomes an entry, types
`inbox_email_received` and `inbox_email_sent`, with the subject as the summary. Only for a
contact that already exists: the timeline never creates one either. The dedupe key
`inbox:{message_id}` makes a retried job or a second event a no-op. A LeadHub that is down
does not undo the stored mail; the failure is logged.

**For the AI draft**, the contact's name and its five newest notes go into the request; see
[Replying → AI draft](/inbox/replying#ai-draft).

## Activity

With [Activity](/activity/), two producers:

| Type | When |
| --- | --- |
| `inbox.email_received` | an incoming message was stored |
| `inbox.email_sent` | a reply went out over SMTP |

The actor is the other side as a contact (`Identity::TYPE_CONTACT`, with the sender's name on
incoming mail). Properties: `conversation_id`, `mailbox_id`, `subject`. Deduplicated per type
and Message-ID.

## Automations

With [Automations](/automations/), a trigger **Email received** (`inbox_email_received`) in the
group **Postfach**. It fires for every stored incoming message, not for mail found in Sent and
not for replies. Payload:

```
message.id, message.subject, message.from_email, message.from_name,
message.text                 the text without the quoted history
conversation.id, conversation.contact_id
email                        the sender's address
```

There is no action that sends a reply in this release.

## Suppression

With [Suppression](/suppression/) 1.3 or later, a reply to a hard-bounced, complaining or
invalid address is refused, fail-closed. See [Replying → Suppression](/inbox/replying#suppression).

## Email Templates

With [Email Templates](/email-templates/), the reply form can be filled from a managed
template of the current brand. See [Replying → From template](/inbox/replying#from-template).

## Brand Context

Required. Every mailbox, conversation and message belongs to a brand. `inbox:fetch` runs each
mailbox inside its own brand, and the sending job runs inside the message's, so everything a
fetch or a reply writes lands in the right brand. The [settings section](/inbox/configuration#per-brand-settings)
comes from Brand Context as well.
