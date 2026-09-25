# Choosing an addon

Several of these addons overlap at the edges on purpose: the same event can be
handled in more than one of them, and picking the wrong one usually still
works, just badly. This page starts from the problem.

## By problem

| You want to… | Use | Not |
| --- | --- | --- |
| POST a form submission to an external URL, reliably, with retries and a log | [Webhook Manager](/webhook-manager/) | Automations, which would add a workflow you do not need |
| Run several steps when something happens: tag, wait three days, mail, escalate | [Automations](/automations/) | Webhook Manager, which has no notion of steps or delays |
| Receive a webhook from another system and act on it | [Webhook Manager](/webhook-manager/inbound) | a hand-rolled route without signature verification |
| Keep track of the people who filled in your forms | [LeadHub](/leadhub/) | |
| Send a newsletter | [Marketing](/marketing/) | Automations' send-email action, which is for one-off transactional mail |
| Send one email in response to one event | [Automations](/automations/nodes) | Marketing, which is built around lists and consent |
| Let editors write the email HTML | [Email Templates](/email-templates/) | |
| Read and answer the mail of an existing mailbox next to the contact it came from | [Inbox](/inbox/) | copying addresses between the mail client and the CRM, which forgets half the conversations |
| Take money for something | [Payments](/payments/) | a posted price, which is how a €19 thing sells for a cent |
| Sell the same product twice at different prices | [Offers](/offers/) | two products, which makes the catalogue lie |
| Give a German buyer a proper invoice | [Invoices](/invoices/) | a receipt email, which is not one |
| Walk a visitor through pages, a form and an offer | [Funnels](/funnels/) | Automations, which has no notion of a page or of where somebody is standing |
| Pay partners a commission on the sales they send, and share revenue with a co-author | [Affiliates](/affiliates/) | a coupon per partner counted by hand, which misses renewals and refunds |
| Put lessons behind a purchase and track who is where in them | [Courses](/courses/) | a members-only collection, which knows who may see a page but not what they have done |
| Hand a learner who finished a course a certificate a third party can check | [Certificates](/certificates/) | a PDF made by hand, which nobody can verify and nobody can revoke |
| Stream a video or hand out a file only to the user who may open it | [Private Media](/private-media/) | an asset container with a public URL, which hands the file to anyone who guesses the path |
| Let customers confirm their address, change it, download their data and delete their account | [Accounts](/accounts/) | a contact form and a manual deletion in every addon, which forgets one of them |
| Let people work together in a workspace, with roles, invitations and a shared plan | [Teams](/teams/) | a shared login, which nobody can leave and nobody can be removed from |
| Give a React or Vue app sign-in, account, teams, access and checkout as JSON | [App API](/app-api/) | hand-written controllers around Statamic's auth, which drift from what its own pages do |
| Record appointments people booked | [Booking](/booking/) | building a calendar, which is a solved problem elsewhere |
| Ask before setting cookies or loading an embed | [Consent](/consent/) | |
| Answer "what happened to this person, across every part of the site" | [Activity](/activity/) | LeadHub's timeline, which only knows about the CRM |
| Answer "what happened to this contact, in the CRM" | [LeadHub timelines](/leadhub/timelines) | Activity, which is not a per-contact view |
| Tell a user something and have it still be there tomorrow | [Notifications](/notifications/) | Laravel's mail-only notifications |
| Build metrics, funnels or a dashboard | read from [Activity](/activity/querying) | Activity itself, which deliberately computes nothing |
| Isolate two client brands in one install | [Brand Context](/brand-context/) | two installs, if the content is genuinely shared |
| Record who did something without coupling to your User model | [Identity Contracts](/identity-contracts/) | |
| Stop sending to a mailbox that bounced, from every addon at once | [Suppression](/suppression/) | a per-addon block list, which only one of them keeps |
| Let a subscriber change what they receive, without an account | [Preference Center](/preference-center/) | Marketing's unsubscribe page, which only ends one list |
| Put a table of contents on an article | [Table of Contents](/toc/) | |
| Give each song one link that sends listeners to their platform, and see which platform they pick | [Smart Links](/smartlinks/) | a list of streaming links with hand-typed labels, which drift away from the URLs they describe |

## Transport or orchestration

This is the decision people get wrong most often, because both addons can be
triggered by `EntrySaved`.

Ask how many things should happen.

**One thing, over HTTP** → Webhook Manager. It owns the request: the URL, the
method, the payload template, the auth scheme, the retry policy, the delivery
record and the replay button. That is a complete answer to "when an entry is
published, tell Slack", and adding a workflow engine on top of it buys nothing.

**More than one thing, or one thing later** → Automations. Conditions,
branches, delays and a sequence of actions, with a run log that shows which node
did what. If one of those actions is an HTTP call, Automations can hand it to
Webhook Manager and inherit the transport guarantees, which is the intended
combination.

**Never both for the same event and destination.** Both addons attach their own
listener to the Statamic event. Configure the hook in one place, and if you move
it, remove the old one.

## CRM timeline or activity ledger

`leadhub_events` and `activities` record overlapping facts, and that is
deliberate rather than a duplication to be resolved.

- **LeadHub's timeline** is a contact's story, shown on the contact page, in the
  order a salesperson wants to read it. It exists to answer "what is going on
  with this person".
- **Activity** is the site's ledger, brand-scoped and append-only, in one shape
  every consumer can read. It exists to answer cross-domain questions that no
  single addon's own log can, and to be the thing a future analytics layer reads
  from.

Installing Activity does not replace the timeline and does not migrate it. The
bundled producers mirror LeadHub and Marketing events into the ledger, and both
records stay.

## Notifications or Laravel notifications

Use Laravel's own notifications when the notification is a mail, the recipient
does not need to see it again, and nobody will ask "did they get it".

Use this addon when any of those stop being true. It persists the notification,
gives the recipient per-type-and-channel preferences, deduplicates the same fact
arriving from two producers, and can summarise into a digest that knows which
window it covers and records that it sent. It also does not build on Laravel's
`notifications` table, so you can enable Laravel's database channel alongside
it. Existing `$user->notify()` call sites can route in through a channel; see
[Laravel interop](/notifications/laravel-interop).

## Do I need the foundation packages

You do not choose these. They arrive as dependencies, and on a single-brand
install with no CRM they do nothing you have to think about.

Install them deliberately only when you are writing your own addon or
application code that wants the same guarantees: `HasBrand` on your own models,
or `IdentityContext::resolve()` in your own audit log.
