# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=inbox-config
```

Publishing is optional; the defaults below are the packaged ones. Mailboxes themselves (servers,
login, folders, sender name) are not configuration: they are rows, created on the
[mailbox screens](/inbox/mailboxes). Secrets are never in the config or the settings screen:
the mailbox password sits encrypted on its row, the AI key in the environment.

## Environment variables

| Variable | Key | Default |
| --- | --- | --- |
| `INBOX_IMPORT_DAYS` | `fetch.import_days` | `90` |
| `INBOX_ATTACHMENTS_DISK` | `attachments.disk` | `local` |
| `INBOX_ALLOW_PRIVATE_HOSTS` | `allow_private_hosts` | `false` |
| `ANTHROPIC_API_KEY` | `ai.api_key` | none; without it there is no AI draft |
| `ANTHROPIC_BASE_URL` | `ai.base_url` | `https://api.anthropic.com` |
| `INBOX_AI_MODEL` | `ai.model` | `claude-sonnet-5` |
| `INBOX_QUEUE` | `queue` | `default` |

`ANTHROPIC_API_KEY` is the same variable [Automations](/automations/) reads, so a site that
already has AI actions needs nothing new.

## Fetching

| Key | Default | |
| --- | --- | --- |
| `fetch.import_days` | `90` | How far back a mailbox's first fetch goes. The date is stored on the mailbox (`import_since`) when it is created and can be changed in its form. After the first run only UIDs above the last one seen are fetched. |
| `fetch.subject_match_days` | `30` | The window of the third threading rule: same other side, same normalised subject, last message within this many days. |
| `fetch.lock_seconds` | `900` | How long one mailbox's lock may be held before a crashed run is taken as dead and the mailbox is fetched again. |

## Attachments

| Key | Default | |
| --- | --- | --- |
| `attachments.disk` | `local` | The Laravel disk attachments are written to. Use a private one: attachments are served only through a Control Panel route that checks `view inbox`, never from a public URL. |
| `attachments.path` | `inbox/attachments` | The folder on that disk; each message gets a subfolder named after its id. |

## Hosts

| Key | Default | |
| --- | --- | --- |
| `allow_private_hosts` | `false` | IMAP and SMTP hosts that resolve to a private, loopback or link-local address are refused. Switch this on only for a mail server on the same private network. See [Security](/inbox/security#the-host-guard). |

## AI draft

| Key | Default | |
| --- | --- | --- |
| `ai.api_key` | `ANTHROPIC_API_KEY` | Without a key, the AI draft tab says so and nothing is sent anywhere. |
| `ai.base_url` | `https://api.anthropic.com` | The Claude Messages API, or a compatible proxy. |
| `ai.model` | `claude-sonnet-5` | |
| `ai.max_tokens` | `1024` | |
| `ai.timeout` | `60` | Seconds. |
| `ai.style_prompt` | `null` | How a draft should sound. Also on the settings screen, per brand. |

What a draft request sends is listed under [Replying → AI draft](/inbox/replying#ai-draft).

## Queue

| Key | Default | |
| --- | --- | --- |
| `queue` | `default` | The queue `SendReply` is dispatched on. |

## Provider presets

`presets` is what the mailbox form fills in when a provider is picked. `help` is the link shown
under the password field, to the provider's own instructions for an app password. Add your own
entry to offer another provider in the form.

| Preset | IMAP | SMTP |
| --- | --- | --- |
| `google` (Google Workspace / Gmail) | `imap.gmail.com:993`, SSL | `smtp.gmail.com:587`, TLS |
| `migadu` | `imap.migadu.com:993`, SSL | `smtp.migadu.com:465`, SSL |
| `manitu` | `imap.manitu.de:993`, SSL | `smtp.manitu.de:587`, TLS |
| `all-inkl` | your server, port 993, SSL | your server, port 465, SSL |

All-Inkl names a server per customer, so its preset leaves both hosts empty; see
[Mailboxes → All-Inkl](/inbox/mailboxes#all-inkl).

## Per-brand settings

With [Brand Context](/brand-context/settings) the settings screen gets a section for the inbox
("Postfach-Einstellungen" in German), open to users with `manage inbox mailboxes`. It has one
field:

| Key | |
| --- | --- |
| `ai.style_prompt` | **Style for AI drafts**: tone, length, how you greet and sign off. |

Only an override is stored there; unset, it follows `config/inbox.php`.
