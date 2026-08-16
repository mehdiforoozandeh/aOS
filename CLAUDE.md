# aOS

## What this project is

A GUI layer on top of an agent kernel (OpenClaw / Hermes / Claude Code). Voice as
input, visuals as output — the user never sees a chat. See `VISION.md` when it
exists; until then the source of truth is Notion (below).

## Human workspace: Notion

Mehdi and a Mo write and revise the design documents **live
in Notion**, not in this repo. Notion is upstream. This repo is downstream.

Root page — everything for this project lives under it:

- **aOS** — `3bea13e24a17806da069c8f5ad586f6d`
  - **VISION.md** — `3bea13e24a178057af8ee25310b39749`

Any agent working on this project must be able to read there. Use the Notion MCP
connector (`notion-fetch` with the page ID, `notion-search` with
`page_url` set to the aOS root to search inside the project).

If the connector is not available, say so and stop — do not guess at the contents
of a Notion page or work from a stale mirror without saying it is stale.

## Notion → repo sync (version control on the Notion side)

Notion has no git history that this repo can see, so we keep our own snapshot.
`.notion/mirror/` holds the last content each agent fetched from Notion, one file
per page. It is committed. Git therefore answers the question "what did the humans
change in Notion since Claude last looked?"

`.notion/sources.json` maps Notion page IDs to mirror paths.

### Procedure — always do this before acting on a Notion doc

1. Fetch the page with `notion-fetch` using the ID from `.notion/sources.json`.
2. Overwrite the matching file in `.notion/mirror/` with the fetched content.
   Keep the `<!-- notion-sync -->` header block at the top current.
3. Run:

   ```bash
   git diff -- .notion/mirror/
   ```

   That diff **is** the change set since the last sync. Read it before writing
   anything.
4. Do the work the user asked for, informed by the diff.
5. Commit the mirror update together with the work, so the next agent's diff
   starts from what you actually saw.

### Rules

- Never edit a file in `.notion/mirror/` by hand. It is a machine-written record
  of what Notion said. Editing it corrupts the next diff.
- The mirror is read-only downstream. Do not push repo edits back into Notion
  unless the user explicitly asks.
- If the diff is empty, say "no change since last sync" rather than re-deriving
  the document from scratch.
- Report what changed in plain terms — "they added two use cases and dropped the
  marketplace bullet" — not a raw diff dump.

### Example of the intended flow

> "Go read VISION.md from Notion and write a VISION.md in the repo based on it."

Fetch page `3bea13e24a178057af8ee25310b39749` → overwrite
`.notion/mirror/VISION.md` → `git diff -- .notion/mirror/` to see what the humans
added → write `/VISION.md` from the current Notion content → commit both.

## Repo conventions

- Default branch is `main`. Do not commit or push unless asked.
- No stack chosen yet; the repo is language-neutral.
