# From PHP

<AddonHeader />

Blade, Inertia, a console command, an API resource: outside Antlers, one static
method on `Footnotes` gives you the same sources the tag lists. The rendered
HTML needs nothing from you.

```php
use Goldnead\BardFootnotes\Footnotes;

// list of ['number' => 1, 'text' => 'Smith, p. 12', 'url' => 'https://…']
$sources = Footnotes::sources($entry->content);

return Inertia::render('Article', [
    'content' => $entry->content, // rendered HTML: the augment pass numbers and links
    'sources' => $sources,
]);
```

The addon hooks into Bard's augment pass. When the field's value is rendered,
the hook numbers every footnote of the field and the node turns each into its
superscript link. `sources()` is the second half, the list those links point to.

## The methods

**`Footnotes::sources($value): array`** returns the distinct sources of a Bard
field in order of first citation, as
`['number' => int, 'text' => string, 'url' => ?string]`. The numbers are the
same ones the augment pass writes into the text. Text is trimmed, and `url` is
kept only when it starts with `http(s)://`, otherwise it is `null`. It accepts the
raw field value, a Statamic `Value` or a collection; anything that is not a Bard
document comes back as `[]`, never as an error.

**`Footnotes::key(?string $text, ?string $url): string`** is the rule for "same
source": the trimmed URL when there is one, otherwise the text with whitespace
trimmed and collapsed, case-insensitive. An empty key means the footnote has no
source. The editor applies the same rule in JavaScript.

**`Footnotes::isEmpty(?string $text, ?string $url): bool`** is `true` for a
footnote with neither text nor URL, which is never numbered, listed or rendered.

**`Footnotes::number($value): mixed`** is the augment hook itself: it walks one
field's document and writes the derived number into every footnote node. You
rarely call it yourself, except when you render a field in parts, see below. It
is idempotent: a document in which every footnote with a source already carries a
number comes back unchanged.

**`Footnotes::raw($value): mixed`** turns a Bard value into its raw document: a
`Value` into its raw content, a collection into its items, an array into itself.

## Rendering a Bard field in parts

The augment hook numbers whatever document it is given. If your app renders one
Bard field in parts, say one `Augmentor::convertToHtml()` call per stretch of text
between two sets, the hook runs once per part and every part would start again at
1. Number the whole document first, then split it:

```php
use Goldnead\BardFootnotes\Footnotes;
use Statamic\Fieldtypes\Bard\Augmentor;

$numbered = Footnotes::number($entry->content->raw()); // the whole field, once

foreach ($stretchesBetweenSets($numbered) as $part) {
    $html .= (new Augmentor($bardFieldtype))->convertToHtml($part);
}
```

Because `Footnotes::number()` is idempotent, the hook keeps the field-wide numbers
in each part, and `id="fnref-n"` stays on the first occurrence in the whole field.
A partly numbered document is numbered anew.

## In Blade

The single tag's view is an Antlers template, so a Blade layout builds the list
itself from the same sources:

```blade
{!! $content !!}

<section class="footnotes">
    <h2>Sources</h2>
    <ol>
        @foreach ($sources as $source)
            <li id="fn-{{ $source['number'] }}">
                @if ($source['url'])
                    <a href="{{ $source['url'] }}" target="_blank" rel="noopener noreferrer">{{ $source['text'] }}</a>
                @else
                    {{ $source['text'] }}
                @endif
                <a href="#fnref-{{ $source['number'] }}">↩</a>
            </li>
        @endforeach
    </ol>
</section>
```

Blade's `{{ }}` escapes where the shipped view's `| entities` does. The ids match
what the augment pass put into the text.

Full signatures: [Reference](/bard-footnotes/reference).
