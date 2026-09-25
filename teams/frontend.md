# Tags and forms

<AddonHeader />

All tags work on the current team unless `team="id or uuid"` is given.

```antlers
{{ teams }}{{ name }} ({{ role_label }}){{ if is_current }} ✓{{ /if }}{{ /teams }}
{{ teams:current }}{{ name }}, {{ member_count }} members{{ /teams:current }}
{{ teams:members }}{{ name }} {{ email }} {{ role_label }} {{ meta:voice_part }}{{ /teams:members }}
{{ teams:invitations }}{{ email }} {{ status }}{{ /teams:invitations }}     {{# only for who may invite #}}
{{ teams:my_invitations }}{{ team_name }}{{ /teams:my_invitations }}
{{ teams:roles }}{{ handle }} {{ label }}{{ /teams:roles }}
{{ teams:can do="invite members" }} … {{ /teams:can }}
```

Inside `{{ teams:members }}`, `remove_url` and `role_url` are set only when the signed-in user
may use them. Post `role` to `role_url`.

## Forms

```antlers
{{ teams:switch_form redirect="/account" }}
    <select name="team">{{ teams }}<option value="{{ id }}">{{ name }}</option>{{ /teams }}</select>
    <button>Switch</button>
{{ /teams:switch_form }}

{{ teams:create_form }}<input name="name"><button>Create</button>{{ /teams:create_form }}

{{ teams:join_form }}<input name="code"><button>Join</button>{{ /teams:join_form }}

{{ teams:invite_form }}
    <input name="email">
    <select name="role">{{ roles }}<option value="{{ handle }}">{{ label }}</option>{{ /roles }}</select>
    <button>Invite</button>
{{ /teams:invite_form }}

{{ teams:leave_form }}<button>Leave</button>{{ /teams:leave_form }}

{{ teams:form_session }}{{ success }}{{ errors }}{{ value }}{{ /errors }}{{ /teams:form_session }}
```

The forms post to `/!/statamic-teams/…` (route names `statamic.teams.forms.*`). A request that
wants JSON gets JSON, with `reason` on a refusal. `redirect="…"` is followed only for a path on
this site.

## The invitation page

The link in the invitation mail opens `/teams/invitations/{token}`, rendered from the view
`teams::invitation` (publish with `--tag=teams-views` to change it). A guest is sent to
`invitations.login_url` first and comes back. Accepting is a POST from the page, never the GET
of the link.

For a single-page app, the same operations are JSON endpoints in [App API](/app-api/endpoints).
