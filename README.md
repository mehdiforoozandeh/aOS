# aOS

A screen for an agent. You ask for something; the agent answers by **drawing**,
not by writing.

Underneath is [Hermes](https://hermes-agent.nousresearch.com/docs/), which does
the work and remembers. On top is a screen the agent controls through rules it
cannot break: it has no way to send you text, only to call one tool with a
document written in a closed set of blocks. A document that breaks the rules is
refused before anything is drawn, with a message the agent can act on, so the
repair happens inside the same turn and you never see a broken screen.

See [DESIGN.md](DESIGN.md) for what this is and why, and
[SETUP.md](SETUP.md) to run it.

## What is here

| Path | What it is |
| --- | --- |
| [`gateway-plugin/`](gateway-plugin) | the Hermes plugin: platform adapter, the `aos_show` tool, and the skill that teaches the agent to think in blocks |
| [`gateway/`](gateway) | the renderer: contract, validator, theme, surface, and a trace panel showing Hermes' raw messages |
| [`prototype/`](prototype) | the first experiment, superseded. A JSON block language driven by `claude -p`. Kept because it is why the contract looks the way it does |
| [`DESIGN.md`](DESIGN.md) | the decisions |

`gateway/README.md` carries the contract itself: what a screen may contain,
where the design system needed judgement calls, and where mdocUI needed working
around.

## The shape of a turn

```
{% say %}Icelandair is cheapest. Air Canada if you want nonstop.{% /say %}

# Vancouver → London

{% grid cols=2 %}
{% stat label="Cheapest" value="$718" change="Icelandair, via Reykjavik" /%}
{% stat label="Fastest" value="9h 15m" change="Air Canada, nonstop" /%}
{% /grid %}

{% table headers=["Airline", "Duration", "Price"] rows=[["Icelandair", "12h 40m", "$718"], ["Air Canada", "9h 15m", "$847"]] /%}
```

Markdoc syntax, a fixed set of tags, no styling the agent can express. The
theme is ours and it cannot see it.

## Status

Early. One screen, replaced each turn. Read-only: it shows, it does not yet
collect. Known gaps are listed at the end of `gateway/README.md`.

## License

Not yet chosen.
