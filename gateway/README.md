# aOS gateway — renderer

The screen half of the Hermes gateway. A turn from the agent is **one Markdoc
document**; this parses it, checks it, and only then draws it.

    npm install && npm run dev     # needs Node 20+ (see .nvmrc)

Open the page. Left is the workbench, right is a 390 × 844 phone.

## The pieces

| File | What it decides |
| --- | --- |
| `src/registry.ts` | Which tags exist. mdocUI's 24 minus the interactive ones, plus `say`, `html`, `timeline`. |
| `src/validate.ts` | The gate. Parse errors, prop errors, and the screen budget. Rejected screens never reach the phone. |
| `src/prompt.ts` | The agent's instructions, generated from the registry so the two cannot drift. |
| `src/index.css` | The whole visual identity. The agent cannot see or express any of it. |
| `src/components.tsx` | Renderers for our own tags, plus the sandbox for `{% html %}`. |
| `src/fixtures.ts` | Hand-written turns, standing in for Hermes. |
| `src/Trace.tsx` | The trace panel. Renders Hermes' own message rows verbatim. |

    npx tsx scripts-prompt.mjs     # print what the agent is told (~800 tokens)

## The trace

The panel beside the phone is not our log. `server.ts` opens
`~/.hermes/state.db` read-only and streams the `messages` rows for the `aos`
session: the prompt, the assistant text, the reasoning, every tool call with
its full arguments, and each tool result as the model received it. So the
document shown under an `aos_show` call is the exact string that produced the
screen next to it.

One shape to know about: some models wrap a call as
`function.name = "tool_call"` with the real name and arguments nested one level
down. Hermes unwraps that when routing, and `parseToolCalls` does the same, or
every `aos_show` would read as an opaque blob.

Override the path with `HERMES_DB` if your install is elsewhere.

## The look

The theme conforms to the **mindmap.io DESIGN.md (alpha)**. Variable names in
`src/index.css` mirror its token keys, so a spec written as `{colors.accent}` or
`{elevation.node-active}` maps to exactly one variable here. Paper canvas,
teal as the only chromatic colour, hairline borders, state recolours rather
than thickens, and only transform and opacity animate.

Six places where conforming meant a judgement call. Each is a finding, not a
silent choice:

1. **Dark mode removed.** DESIGN.md § 12 lists it as unspecified. The rule is
   propose, do not invent, so the scheme I had written is gone. The screen is
   light only until that spec exists.
2. **Satoshi is not loaded.** The font stack is set per the spec, but the
   self-hosted woff2 files are not in this repo, so it falls back to
   `-apple-system`. Drop the woff2 into `public/` and preload it to close this.
3. **No gradients, so no shimmer.** The loading skeleton was a sweeping
   gradient and the busy indicator a gradient rail. Both are banned outright.
   The skeleton is now flat canvas fill breathing on opacity, and a working
   surface takes the `node-card-active` treatment instead — accent border,
   accent glow. That is the system's own word for "the living thing".
4. **The loading breath loops past 300ms.** The app ceiling is a hard 300ms.
   An ambient indicator is not a transition, so it runs at 1.4s. Deliberate
   carve-out; worth a token if it recurs.
5. **Stat trends stay ink.** Up and down are not error and warning, and there
   is no second chromatic colour to spend. They read as `ink-muted` until the
   system says otherwise.
6. **No graphene backdrop, no dot grid.** Those are mindmap.io's brand motif,
   not a neutral token. Borrowing the system is not the same as borrowing the
   mark, so aOS keeps its own.

## Notes for whoever picks this up

- **Interactivity is off**, not missing. `POSTPONED` in `registry.ts` holds the
  eight input tags. Empty that set and they come back.
- **The budget in `validate.ts` is a guess.** Watch it on a real phone and
  change the numbers. It is an empirical constant, not a design decision.
- **`{% html %}` runs no scripts.** `sandbox=""` plus a locked CSP: the escape
  hatch buys layout freedom, not capability.
- **Escape-hatch use is the metric.** A shape that keeps appearing there is a
  tag we have not built. The workbench counts it.

## Where mdocUI 0.7.2 needed working around

It is alpha, and three things bit:

1. `Callout` applies inline styles unconditionally, ignoring the `className`
   escape every other component honours. We replace the component outright.
2. `generatePrompt()` hardcodes examples using `button`, `form` and `input`,
   with no option to suppress them — so a stock prompt teaches tags the gate
   rejects. `src/prompt.ts` replaces it.
3. Whitespace between two tags parses as a prose node and becomes a real grid
   cell. `stripBlankProse()` removes them.

Also worth knowing: attribute values do **not** parse object literals, only
arrays; and mdocUI's prose renderer covers headings 1–3, `ul` and `ol` only —
no tables, quotes, code fences or images. Those come from tags instead.

## Known gaps

Honest state, as of this commit.

- **No way to say "this one".** `{% table %}` has no per-row emphasis and
  `card variant` offers only `default | outlined | elevated` — presentation
  words, not meaning. So the agent can show six flights but cannot recommend
  one, and the verdict ends up stranded in the spoken line. This is the first
  properly evidenced missing block: visible in the schema, not guessed from
  output.
- **No way to ask a question.** Interactivity is postponed, so when the agent
  wants to ask something it falls out into prose. Hermes' own `clarify` tool is
  worse: the gateway intercepts it before any adapter sees it, so the question
  is never drawn and the person's next message is silently eaten as the answer.
  `clarify` is therefore removed from this platform's toolset — see
  `toolsets_for_source` in `gateway-plugin/adapter.py`.
- **The agent still narrates.** Prose replies outnumber drawn screens. They no
  longer damage anything (a screen already drawn cannot be overwritten by a
  closing remark) but the fallback count is the number to watch.
- **`{% say %}` is not spoken.** There is no voice yet, in or out. The line is
  parsed and shown in the trace only.
- **One screen, no history.** Each turn replaces the last. Multiple live
  surfaces need a structure the agent shares, and that is not designed yet.
