# Antlers tags

<AddonHeader />

Both tags work for the **signed-in user** and list only that user's certificates, in the
current brand. A guest gets nothing.

## `{{ certificates }}`

Every certificate of the signed-in user, newest first.

```antlers
{{ certificates }}
    <a href="{{ download_url }}">{{ course_title }}</a> ({{ issued_at format="d.m.Y" }})
    <a href="{{ verify_url }}">{{ code_formatted }}</a>
{{ /certificates }}
```

### `no_results`

With no certificates the pair renders nothing, rather than its body once with blank values.
When the template asks for `no_results`, it gets that flag, as with core's tags:

```antlers
{{ certificates }}
    {{ if no_results }}
        <p>Finish a course and your certificate appears here.</p>
    {{ else }}
        <a href="{{ download_url }}">{{ course_title }}</a>
    {{ /if }}
{{ /certificates }}
```

A guest gets the same: nothing, or the `no_results` branch.

## `{{ certificates:for }}`

The certificate for one course, or nothing.

```antlers
{{ certificates:for course="{id}" }}
    <a href="{{ download_url }}">Download your certificate</a>
{{ /certificates:for }}
```

| Parameter | |
| --- | --- |
| `course` | the course **entry id**, as Courses puts it on `CourseCompleted` |

It renders nothing for a guest, without a `course`, and when the user has no certificate for
that course. It has no `no_results` branch.

## Fields

| Field | |
| --- | --- |
| `code` | the stored code, 20 characters |
| `code_formatted` | the same in groups of four, `ABCD-EFGH-…` |
| `course_id` | the course entry id |
| `course_title` | frozen at issue time |
| `learner_name` | frozen at issue time |
| `issued_at` | a date; use `format` |
| `is_revoked` | `true` once revoked |
| `download_url` | the owner's download, or `null` when revoked or when the routes are off |
| `verify_url` | the public verification page, or `null` when the routes are off |

**Revoked certificates are listed**, with `is_revoked` true and no `download_url`. A template
that links every row to its download has to test for it:

```antlers
{{ certificates }}
    {{ if is_revoked }}
        {{ course_title }}: revoked
    {{ else }}
        <a href="{{ download_url }}">{{ course_title }}</a>
    {{ /if }}
{{ /certificates }}
```

With [`CERTIFICATES_ROUTES_ENABLED=false`](/certificates/configuration#routes) both URLs are
`null`: the tags still list certificates, but there is nothing to link to.
