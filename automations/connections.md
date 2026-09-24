# Connections

<AddonHeader />

A **connection** is an external service set up once in the Control Panel: a base URL,
its credentials and a test button. Each **operation** you add to it becomes its own action
in the builder, with its own form. Slack, a CRM, your own API: no code, no custom action
class, and the credential never shows up in a run log.

Use a connection when you call the same service from more than one place, or when the
call needs a key. For a one-off POST to a webhook URL, *Send Webhook (Simple)* is enough.

Connections live under **Automations → Connections** and need the permission
`manage automation connections` (*Manage connections and their credentials*). It is
separate from the automation permissions on purpose: whoever has it can see which
services the site talks to and replace their credentials. Connections belong to the
current brand, like automations.

## Set up a connection

<Figure
  src="automations-connections-connection"
  alt="The connection form, in a German Control Panel, with name Slack, handle slack, base URL https://slack.com/api, a test path, a timeout of 15 seconds and an empty list of default headers"
  caption="The Connection tab. The handle is filled in from the name." />

**Connection tab.**

| Field | What it does |
| --- | --- |
| Name, Handle | The handle (`snake_case`, unique per brand) becomes part of every action handle: `connection.<connection>.<operation>` |
| Base URL | What every request starts with, e.g. `https://slack.com/api`. Only `http` and `https`, and it has to resolve to a public address (see [Security](#security)) |
| Test path | Where *Test connection* sends a GET, e.g. `/auth.test`. Empty means the base URL itself |
| Timeout | Seconds, 1 to 120. Default 15 |
| Default headers | Sent with every request, e.g. `Accept` → `application/json`. Not secret: keys go on the Access tab |

**Access tab.** Pick the authentication:

| Type | Fields | Sent as |
| --- | --- | --- |
| No authentication | none | nothing |
| Bearer token | Token | `Authorization: Bearer <token>` |
| Basic auth | Username, Password | `Authorization: Basic <base64>` |
| Header | Header name, Header value | `<name>: <value>`, e.g. `X-Api-Key` |

Credentials are stored encrypted (Laravel's `encrypted:array` cast, so they depend on your
`APP_KEY`) and never sent back to the browser. Once saved, the field shows only a
placeholder: leave it empty to keep the stored value, type to replace it. Switching to
another auth type discards the stored credentials on save.

<Figure
  src="automations-connections-test"
  alt="The Access tab, in a German Control Panel, with Bearer token selected and the token field showing a stored placeholder, above it a green result: Connection works, HTTP 200, 172 ms"
  caption="Test connection answers with the status code and the duration, never with the response body." />

**Test connection** sends one GET to base URL + test path, with the connection's auth,
and reports *Connection works* (any 2xx), *The service answered with an error* or
*Could not connect*. It tests what the form holds right now, unsaved changes included,
and saves nothing. If you point the form at a different host, the stored credentials are
not sent along: only what you typed.

## Add an operation

Save the connection first, then open the **Operations** tab and click **Add operation**.

<Figure
  src="automations-connections-operations"
  alt="The Operations tab, in a German Control Panel, listing one operation, Nachricht senden, with its node handle connection.slack.nachricht_senden, method POST, path /chat.postMessage and 2 inputs"
  caption="Each operation is an action in the automation builder. Shown in a German Control Panel." />

**Name** is what the action is called in the builder. The handle is filled in from it.

**Inputs** are the fields someone fills in when they add the action to an automation.
Each has a label, a handle, a type (`text`, `textarea`, `number`, `toggle`, `select`), an
optional default and a *Required* switch. An input with the handle `channel` is available
in the request as `{{ input.channel }}`. In the builder every input accepts tokens, so
`{{ form.email }}` works there.

**Request.**

- **Method:** `GET`, `POST`, `PUT`, `PATCH` or `DELETE`.
- **Path:** appended to the base URL, e.g. `/chat.postMessage` or
  `/users/{{ input.user_id }}`. Values in the path are URL-encoded, and a value of `.` or
  `..` is refused.
- **URL parameters:** one per row, added after the `?`, e.g. `limit` → `10`. A parameter
  whose value comes out empty is left out rather than sent as `?limit=`.
- **Request content (JSON):** one field per row, e.g. `text` → `{{ input.text }}`. The
  addon builds the JSON itself, so a quote in a value cannot break the body. A row that is
  exactly one placeholder keeps the input's type, so a `number` or `toggle` input arrives
  as a number or a boolean. No content is sent on a `GET` or when the list is empty.

**Response.**

- **Output fields:** name a value from the JSON answer by its dot path, e.g.
  `message_id` → `ts` or `user_email` → `data.user.email`.
- **Fail on an error status:** on by default. Any status outside 2xx then marks the step
  as failed. Switch it off to handle errors yourself with a filter on `status`.

Every operation outputs `status`, your output fields and `body` (the decoded JSON, or the
raw text if the answer is not JSON).

## Use it in the builder

Operations appear in the node library as actions, grouped under the connection's name.
Their form is the inputs you defined. Later steps read the output through the token
picker, e.g. `{{ nodes.<node key>.message_id }}` or `{{ nodes.<node key>.status }}`.

A test run sends nothing. The step's output shows a preview instead: method, full URL,
the **names** of the headers (never their values) and the body. A required input that is
still empty in a test run is listed under `missing_inputs` rather than failing the run.
In a real run it fails the step, naming the field.

If an operation or its connection is deleted, steps that use it fail with a clear message
on the next run. Deleting a connection lists the automations that still use it first.

## Example: post to Slack when a form is submitted

1. At [api.slack.com](https://api.slack.com/apps), create an app, add the `chat:write`
   bot scope, install it and copy the **Bot User OAuth Token** (`xoxb-…`). Invite the bot
   to the channel.
2. **Automations → Connections → Create connection.** Name `Slack`, base URL
   `https://slack.com/api`, test path `/auth.test`. On Access: *Bearer token*, paste the
   token. Save, then *Test connection*.
3. **Operations → Add operation.**

   | Field | Value |
   | --- | --- |
   | Name | `Post message` (handle `post_message`) |
   | Inputs | `channel` (text, required), `text` (textarea, required) |
   | Method, path | `POST`, `/chat.postMessage` |
   | Request content | `channel` → `{{ input.channel }}`, `text` → `{{ input.text }}` |
   | Output fields | `ok` → `ok`, `message_id` → `ts` |

4. In an automation, add the **Form Submitted** trigger, then the **Post message** action
   from the *Slack* group. Channel `#website`, text
   `New inquiry from {{ form.name }} ({{ form.email }})`.
5. Run a test to check the preview, then enable the automation.

Slack answers most errors with HTTP 200 and `"ok": false`, so *Fail on an error status*
does not catch them. Add a filter on `{{ nodes.<node key>.ok }}` after the step if you
need to react to them.

## Security

- **Private hosts are blocked.** The base URL must resolve to a public address. Loopback,
  private, link-local (including the cloud metadata address `169.254.169.254`), CGNAT,
  multicast and reserved ranges are refused, for IPv4 and IPv6. The check runs on save
  and again before every call and every test, and the call is pinned to the address just
  checked, so a DNS change in between cannot redirect it.
- **Calling a local service.** To reach, say, an n8n on the same machine, set
  `STATAMIC_AUTOMATIONS_CONNECTIONS_ALLOW_PRIVATE_HOSTS=true`
  (`connections.allow_private_hosts`). Only do so if everyone with
  `manage automation connections` may also reach your internal network. `http` and
  `https` stay the only schemes either way.
- **No redirects.** Calls do not follow redirects, so a credential header cannot be
  carried to another host. A `3xx` counts as a non-2xx status.
- **Secrets never reach the run log.** Credentials are added to the request at the moment
  of the call and are never part of the node's input or the context. If a service echoes
  a credential back, it is replaced by `••••` in the output. Header names like
  `X-Api-Key` are also covered by the default `security.redact_keys`.
