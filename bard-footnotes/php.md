# From PHP

<AddonHeader />

Blade, Inertia, a console command, an API resource: outside Antlers the static
methods on `Footnotes` do everything the modifier and the tag do.

```php
use Goldnead\BardFootnotes\Footnotes;

$sources = Footnotes::sources($entry->sources); // list of ['number', 'text', 'url']

// Whatever the article field is: a plain Bard field comes back as rendered HTML,
// a field with sets comes back as the same set list with every text set rendered.
$content = Footnotes::renderValue($entry->article, count($sources));

// For Inertia:
return Inertia::render('Article', ['content' => $content, 'sources' => $sources]);

// For Blade, a plain Bard field:
{!! $content !!}
```

The two calls mirror the two halves of the Antlers pairing: `renderValue` is
the modifier, `sources` is the tag.

## The methods

**`Footnotes::sources($rows): array`** — normalizes the grid to numbered rows:
`['number' => int, 'text' => string, 'url' => ?string]`, numbers sequential,
empty rows dropped, urls kept only when they start with `http(s)://`. Accepts
the raw grid value, a Statamic `Value` or a collection; anything that is not a
row list comes back as `[]`, never as an error.

**`Footnotes::renderValue($value, $count): mixed`** — takes whatever the field
hands over, without a cast. The HTML string of a plain Bard field comes back
linked; its set list comes back as the same list with every text set rendered;
`null` comes back as `''`, an int as its string, an unknown object as `''`.

**`Footnotes::renderSets($sets, $count): array`** — the set list on its own,
for when the value is already an array: text sets rendered and linked, other
sets returned identically, one jump target shared across the whole list.

**`Footnotes::render($html, $count): string`** — the bare HTML string, for
markup that never lived in a Bard field. Markers past the count, inside links,
headings, `pre` or `code` stay as typed.

**`Footnotes::html($value, $count): string`** — the joined HTML of the text
sets, whatever the field's shape. This is what the tag uses to decide `cited`.

**`Footnotes::cited($renderedHtml, $number): bool`** — whether the rendered
output contains the jump target `fnref-$number`. It reads rendered HTML: the
typed marker `[1]` alone does not make a source cited.

## In Blade

The single tag's view is an Antlers template, so a Blade layout builds the list
itself from the same rows:

```blade
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
                @if (Goldnead\BardFootnotes\Footnotes::cited($content, $source['number']))
                    <a href="#fnref-{{ $source['number'] }}">↩</a>
                @endif
            </li>
        @endforeach
    </ol>
</section>
```

Blade's `{{ }}` escapes where the shipped view's `| entities` does; the ids
match what `renderValue` put into the text.

Full signatures: [Reference](/bard-footnotes/reference).
