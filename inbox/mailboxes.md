# Mailboxes and app passwords

<AddonHeader />

A mailbox is one IMAP/SMTP account the inbox fetches from and replies through. There can be
several, each inside its brand. They are managed under **Postfach → Mailboxes** by users with
`manage inbox mailboxes`.

![Creating a mailbox with the Google Workspace preset: servers filled in, a link to Google's app-password instructions under the password field](/screenshots/inbox-mailbox-preset.png)

## The form

Three tabs:

| Tab | Fields |
| --- | --- |
| Account | Label (`name`, only for the list), address, sender name, login, password |
| Servers | IMAP host, port, encryption; SMTP host, port, encryption (`ssl`, `tls`, `starttls` or `none`) |
| Folders | Inbox folder (`INBOX`), Sent folder, "put a copy of each reply into the Sent folder", import since, active |

Picking a **provider** fills the Servers tab from the [presets](/inbox/configuration#provider-presets)
and shows a link to that provider's instructions for an app password. "Custom" leaves every
field to you.

**Sender name** is the display name replies go out under. Empty, the brand's sender name from
Brand Context is used, and without one the bare address. The label is never used as the sender
name.

**Import since** decides how far back the first fetch goes. It defaults to 90 days before today
(`INBOX_IMPORT_DAYS`).

**Active** off stops fetching the mailbox. There is no delete in this release.

## App passwords

Use an app password, not the password you sign in with. Most providers require one for a mail
program, and the inbox is one. The password is stored encrypted and never shown again; see
[Security](/inbox/security#the-password).

### Google Workspace and Gmail

Preset `google`: `imap.gmail.com:993` (SSL), `smtp.gmail.com:587` (TLS).

1. Switch on 2-step verification for the account. Google offers app passwords only after
   that.
2. Create an app password in the Google account (the preset links Google's instructions).
3. Login is the full address, password is the app password.

In Google Workspace an admin can switch app passwords off for the organisation; then the admin
has to allow them first.

Gmail files mail sent through its SMTP into Sent by itself. For a Google mailbox the switch
"put a copy into the Sent folder" is therefore **off**, detected from the host, so a reply does
not show up there twice.

### Migadu

Preset `migadu`: `imap.migadu.com:993` (SSL), `smtp.migadu.com:465` (SSL). Login is the full
address. The preset links Migadu's IMAP guide for the password to use.

### manitu

Preset `manitu`: `imap.manitu.de:993` (SSL), `smtp.manitu.de:587` (TLS). The preset links
manitu's FAQ.

### All-Inkl

Preset `all-inkl`: port 993 (SSL) and 465 (SSL), **hosts empty**. All-Inkl names a server per
customer, so enter the server name All-Inkl gave your account for both IMAP and SMTP. Switching
between presets keeps a host you typed when the new preset has none. The preset links All-Inkl's
instructions.

### Anything else

Any server that accepts a password over IMAP and SMTP works with "Custom". Microsoft 365 and
Outlook.com do not: Microsoft has switched basic authentication off, and this release has no
OAuth.

## Test connection

**Test connection** checks IMAP and SMTP separately, so the result says which half is wrong. It
works before the first save (with the values in the form, storing nothing) and on a saved
mailbox (with the stored settings, or the ones you just changed in the form). A refused login,
an unknown host or a wrong port is explained in words, with the server's own message one click
away.

## Changing a mailbox

The password field is write-only. It stays empty on edit, and leaving it empty keeps the stored
password.

**Changing the IMAP or SMTP host, a port or the login requires the password again**, for saving
and for the test. Otherwise pointing the host at another server and pressing Test would hand
the stored password to that server.

Changing a host also starts that mailbox over: the UID cursors reset, the Sent folder is found
again and the Gmail detection for the Sent copy is repeated, unless the form sets those fields
itself. Mail already stored is not stored twice; the Message-ID keeps it out.

## Folders

The inbox folder is `INBOX` unless you set another. The Sent folder is found on save: first the
folder the server marks as `\Sent`, then by name (`Sent`, `INBOX.Sent`, `Sent Items`,
`Sent Messages`, `Gesendet`, `Gesendete Objekte`, `Gesendete Elemente`, `INBOX.Gesendet`,
`[Gmail]/Sent Mail`, `[Gmail]/Gesendet`). If none is found, set it by hand; without one only
INBOX is fetched and no copy of a reply is filed.

## When fetching goes wrong

Problems are contained at the smallest level they happen on, and shown above the conversation
list:

- **The whole mailbox** (login refused, server unreachable, no folder readable): a red notice
  naming the mailbox, with a button into its form. Nothing arrives from it until it is fixed.
- **One folder** (Sent missing, for example): recorded per folder; the other folder still runs.
- **One message** that cannot be stored: recorded in `inbox_fetch_failures`, the fetch moves on
  and tries it again on the next runs. After **three attempts** it is given up, and the list
  says how many messages of which folder were skipped, so they can be opened in a mail program.

A folder whose UIDVALIDITY changed is fetched again from the import date; nothing is stored
twice.
