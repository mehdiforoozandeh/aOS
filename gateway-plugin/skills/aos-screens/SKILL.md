---
name: aos-screens
description: "Answer on the aOS surface: build a screen with aos_show instead of writing a message."
version: 1.0.0
author: aOS
license: MIT
metadata:
  hermes:
    tags: [aOS, UI, generative-ui, markdoc, platform]
    platforms: [aos]
---

# Answering on the aOS surface

On the `aos` platform the person is looking at a **screen**, not a chat. They
cannot read a message from you. Anything you write in words is a failure that
gets shown inside an apology box.

Build the answer as a Markdoc document and pass it to **`aos_show`**.

There is exactly **one screen**, and every call replaces it. So send the whole
screen every time, never a fragment, and never assume anything from the last
one survived. If a fact still matters, it goes in again.

## When to Use

- Every single turn on the `aos` platform. There is no other way out.

## When NOT to Use

- Any other platform. On Telegram, IRC or the CLI, answer normally.

## Think in blocks before you think in sentences

Do not write the answer and then look for tags to put it in. That order always
produces paragraphs wearing a border.

Go the other way. Before writing anything, take the answer apart into facts,
and give each fact a shape:

| The fact is… | It is a |
| --- | --- |
| a single number or value that matters | `{% stat %}` |
| several things measured the same way | `{% table %}` |
| several things worth looking at side by side | `{% card %}` in a `{% grid %}` |
| something that happens at a time | `{% timeline %}` |
| a caveat, a risk, a state | `{% callout %}` |
| a quantity across categories | `{% chart %}` |
| a short label on something else | `{% badge %}` |
| how far through something is | `{% progress %}` |
| still coming | `{% loading %}` |

Only what is left over after that becomes text. Usually that is a heading and
nothing else.

**Loose text is capped hard** — 25 words on the whole screen, counting only
text with no block around it. Text inside a card or a callout is not counted,
because there it has a role. If you are over, the fix is never to shorten the
sentence. It is to move the fact into the block it belonged in.

## Cut the fluff

Do not add what was not asked for. No closing advice, no "tips", no "book
early for best fares", no summary of what you just showed. A screen is read at
a glance; every block that is not the answer makes the answer harder to find.

If you catch yourself writing a sentence that would be true on any similar
screen, delete it.

## Two mistakes that will be rejected

**Markdown tables do not exist here.** The prose renderer covers headings and
lists only. A pipe table prints as literal `|` characters on the person's
screen. Every table is `{% table headers=[…] rows=[[…]] /%}`.

**Blocks close with a slash.** Markdoc uses `{% /card %}`. There is no
`{% endcard %}`, `{% endgrid %}`, `{% endtable %}` or `{% endcallout %}` —
those are Liquid, and they will be dropped, taking the block's contents with
them.

## The one habit to break

The most common mistake is to write the whole answer as paragraphs and send
that. It gets refused: a screen may hold at most **60 words** of prose. That
limit is not a nuisance, it is the point — prose is a message, and a message
is what this surface exists to replace.

**Ask of every sentence: is this a thing, or a description of a thing?**
Things become tags. Descriptions get cut.

### Wrong

```
# Vancouver to London

{% callout title="Cheapest Options" %}
- **One-way from $239** (Skyscanner)
- **Round-trip from $458** (Skyscanner)
{% /callout %}

## Airlines & Prices

| Airline | Price (CAD) | Type |
|---------|-------------|------|
| British Airways | From $769 | Nonstop |
| Air Canada | From $754 | Nonstop |

{% callout type="warning" title="Tip" %}
Book early for best fares. January is cheapest month on average.
{% /callout %}
```

Four faults. The table is markdown, so it prints as pipes. Two prices that
matter are buried in a bullet list instead of being `{% stat %}`. The tip is
fluff nobody asked for. And it reads as a document with widgets in it, not as
a screen.

### Right

```
{% say %}Cheapest is two thirty-nine one-way. Air Canada is the best nonstop.{% /say %}

# Vancouver to London

{% grid cols=2 %}
{% stat label="One-way from" value="$239" /%}
{% stat label="Round-trip from" value="$458" /%}
{% /grid %}

{% table headers=["Airline", "Price", "Type"] rows=[["Air Canada", "$754", "Nonstop"], ["British Airways", "$769", "Nonstop"], ["WestJet", "$727", "Connecting"]] /%}
```

Same information. Nothing loose, nothing invented, nothing to read.

### Right

```
{% say %}Your flight is delayed forty minutes. Still plenty of time.{% /say %}

# AA118 to London

{% callout type="warning" title="Delayed 40 minutes" %}
New departure 18:40. Gate B24, unchanged.
{% /callout %}

{% grid cols=2 %}
{% stat label="Departs" value="18:40" change="was 18:00" trend="down" /%}
{% stat label="Gate" value="B24" /%}
{% /grid %}
```

Same four facts. Three words of prose. Readable at a glance.

## Picking the tag

| What you have | What to use |
| --- | --- |
| One number that matters | `{% stat %}` |
| Several things to compare | `{% card %}` inside `{% grid %}` |
| Rows and columns | `{% table %}` |
| Things in time order | `{% timeline %}` |
| A warning, an error, a caveat | `{% callout %}` |
| A quantity over categories | `{% chart %}` |
| A short status word | `{% badge %}` |
| How far through something is | `{% progress %}` |
| Something you are still fetching | `{% loading %}` |

Headings and short bullet lists are fine. Paragraphs are not.

## When the work continues

You often draw a screen and then keep going — checking a price, reading a
second source. Say so, or the person sits at a screen that will never change
and cannot tell whether you are still there.

Put `{% loading %}` where the missing part will go:

```
{% say %}Found three flights. Still pricing the last one.{% /say %}

# Flights to London

{% table headers=["Airline", "Leaves", "Price"] rows=[["BA", "18:40", "£310"], ["AA", "19:05", "£286"]] /%}

{% loading label="Pricing Virgin Atlantic" /%}
```

The screen stays visibly busy while any `{% loading %}` is on it. When the
answer arrives, send the whole screen again without it — including everything
that was already there, because the new document replaces the old one entirely.

## If aos_show refuses

It returns the exact problems. Fix those and call it again in the same turn.
The person never sees a refused screen, so a repair costs nothing but a moment.

The four you will meet:

- **too many words of prose** — you wrote a message. Turn the facts into tags.
- **unknown component** — that tag does not exist. Only the listed tags do.
- **missing required attribute** — e.g. `{% stat %}` needs both `label` and `value`.
- **too many rows / items** — show the most useful few, not everything you found.

## Rules that do not bend

1. Exactly one `{% say %}`, first, at most 15 words. It is spoken aloud and is
   never drawn on screen. Put nothing in it that only makes sense written down.
2. Never write a colour, a size, a position or a pixel. You choose the tag;
   the screen decides how it looks.
3. Attributes take strings, numbers, booleans and arrays — **never object
   literals**. Use arrays of arrays.
4. `{% html %}` is a last resort for a layout no tag can express. Every use is
   counted and reviewed. Reach for a real tag first.
5. Do not ask the person to tap, type or choose. The surface is read-only for
   now.
