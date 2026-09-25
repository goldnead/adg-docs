# Security

<AddonHeader />

An inbox shows mail written by strangers inside the Control Panel, and it holds a password
that can read and send all of a mailbox. This page says what the addon does about both.

## HTML mail

HTML is cleaned **when the mail is stored**, with `symfony/html-sanitizer`:

- Only safe elements survive. Scripts, event handlers, iframes and forms are removed, and so are
  `class` attributes.
- Links keep only `http`, `https`, `mailto` and `tel`; `javascript:` and relative links go.
  Every link gets `rel="noopener noreferrer nofollow"` and opens in a new tab.
- Images keep only `data:` as a source of their own. Relative sources are dropped.
- Input is capped at 2,000,000 characters.

The cleaned HTML is then shown **in a sandboxed iframe** built from a detached document, never
in the Control Panel's own DOM:

```html
<iframe sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerpolicy="no-referrer" srcdoc="…">
```

The sandbox never gets `allow-scripts`, so nothing in a mail runs, whatever might slip past the
sanitiser. `allow-same-origin` without scripts only lets the Control Panel read the frame's
height; `allow-popups` lets a link open in a new tab.

## Remote images

A remote image tells the sender that, when and where the mail was opened. So none loads until
somebody asks:

- a remote `src` on `<img>` or `<source>` is moved into `data-inbox-src` when the mail is stored;
- every `srcset` is dropped outright, remote or not, because a browser picks from it even when
  `src` is harmless;
- a remote `url(…)` in a style marks the message as having remote images;
- inside the frame, a **Content-Security-Policy** (`default-src 'none'`, images only from
  `data:` and the site's own origin) blocks every remote load the rewrite did not catch.

**Load images** ("Bilder laden") puts the sources back and widens the policy to `https:` and
`http:` for that message, for that view. "Block again" undoes it.

![A newsletter in the conversation screen with its remote images held back and the "Bilder laden" button above it](/screenshots/inbox-remote-images-held.png)

Inline images (`cid:`) are mapped to the attachment route below; a `cid:` URL means nothing to
a browser.

## Attachments

Attachments are written to `attachments.disk` (`local` by default) under `inbox/attachments/`,
and served **only** through the Control Panel route `inbox/attachments/{id}`, which checks
`view inbox`. Use a private disk; nothing links to a public URL.

PNG, JPEG, GIF, WebP and PDF open in the browser with their own type. Everything else, HTML
above all, is sent as `application/octet-stream` and downloaded, so a stranger's file never
renders inside the Control Panel's origin. Every response carries `X-Content-Type-Options:
nosniff` and `Content-Security-Policy: default-src 'none'; sandbox`.

## The host guard

IMAP and SMTP hosts are typed in by a Control Panel user and then connected to by the server.
Without a check, the mailbox form would be a way to reach the server's own network. Every
address a host resolves to (IPv4 and IPv6) has to be public. Refused:

```
0.0.0.0/8  10.0.0.0/8  100.64.0.0/10  127.0.0.0/8  169.254.0.0/16  172.16.0.0/12
192.0.0.0/24  192.168.0.0/16  198.18.0.0/15  224.0.0.0/4  240.0.0.0/4
::/128  ::1/128  fc00::/7  fe80::/10  ff00::/8
```

IPv4-mapped IPv6 addresses are checked as the IPv4 address they carry. A host that does not
resolve is refused too.

The check runs **when a mailbox is saved or tested, and again before every connection**, so a
name that resolves to a public address at save time and to `127.0.0.1` later is still refused.

`INBOX_ALLOW_PRIVATE_HOSTS=true` switches the guard off, for a mail server on the same private
network. It is off by default.

## The password

- **Encrypted at rest** with Laravel's `encrypted` cast, so with the site's `APP_KEY`. Rotating
  the key without re-encrypting means entering every mailbox password again.
- **Never sent out.** The model hides it from every serialisation, the form receives only
  `has_password`, and the field stays empty on edit.
- **Masked in errors.** IMAP and SMTP libraries echo the failed command, and a LOGIN carries
  the password in clear. Before any error is stored, logged or shown, the password is replaced
  by `********`, also in its base64, SASL PLAIN and URL-encoded forms.
- **Required again when it would go somewhere else.** Changing a host, a port or the login
  requires the password to be typed again, for saving and for the connection test. Otherwise
  pointing the host at another server and pressing Test would hand the stored password to that
  server.
- **Not on the settings screen.** Settings end up in backups and on screens, which is where a
  password must not.

## Sending

- A reply needs a click. No template, no AI draft and no automation sends on its own.
- A failed send is not retried automatically, so a reply never goes out twice.
- With Suppression, a reply to a hard-bounced, complaining or invalid address is refused, and a
  suppression list that cannot be read refuses every reply ([Replying](/inbox/replying#suppression)).

## Permissions

| Permission | Allows |
| --- | --- |
| `view inbox` | the list, conversations, attachments |
| `reply inbox` | replying, status, snooze, template, AI draft, creating and linking contacts |
| `manage inbox mailboxes` | mailboxes, the connection test, the settings section |

Reading a conversation does not allow answering it, and neither allows seeing or changing a
mailbox's servers.
