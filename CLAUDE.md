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

### `.notion/` is encrypted — collaborators only

This repo is public, but everything under `.notion/` is encrypted with
[git-crypt](https://github.com/AGWA/git-crypt) (see `.gitattributes`). GitHub
stores ciphertext; only people holding the shared symmetric key can read it.

If `.notion/` files look like binary garbage, the repo is locked. Unlock it:

```bash
git crypt unlock /path/to/aOS-git-crypt.key
```

The key is shared out of band — never commit it, never paste it into a chat, an
issue, or a Notion page. If an agent cannot unlock, it must say the mirror is
unreadable and stop, not fabricate the contents.

Files under `.notion/` are plaintext in the working tree and ciphertext in git.
That is normal — do not "fix" it.

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
- The mirror is read-only downstream. Do not push repo *edits* back into Notion.
  The one exception is capturing new ideas — see the next section.
- If the diff is empty, say "no change since last sync" rather than re-deriving
  the document from scratch.
- Report what changed in plain terms — "they added two use cases and dropped the
  marketplace bullet" — not a raw diff dump.

### Example of the intended flow

> "Go read VISION.md from Notion and write a VISION.md in the repo based on it."

Fetch page `3bea13e24a178057af8ee25310b39749` → overwrite
`.notion/mirror/VISION.md` → `git diff -- .notion/mirror/` to see what the humans
added → write `/VISION.md` from the current Notion content → commit both.

## The IP lives in Notion — capture ideas upstream

**Treat the code as close to free. The intellectual property of aOS is the ideas
behind the code, and those live in Notion.** A good idea that exists only in a
Claude Code chat log is an idea that is effectively lost: the humans cannot see
it, the collaborator cannot build on it, and the next session starts without it.

So: whenever a genuine design idea, mechanism, name, or architectural decision
first appears **here in a chat** rather than in Notion, write the IP part of it
back to Notion, then refresh the mirror.

### What counts as the IP part

Capture the *idea*, not the transcript. The core concept, why it matters, what it
rules in or out, and any decision that would be expensive to rediscover.

Leave behind the implementation detail, the debugging, the file paths, and the
chat back-and-forth. If the idea would still be valuable to someone who never
saw this repo, it is IP. If it only makes sense next to the code, it is not.

### Procedure

1. Draft the entry — a short titled block: the idea, the reasoning, the open
   question it leaves.
2. **Show the draft to the user before writing it.** Notion is shared with a
   second human, so writing there is a change other people see. Get a yes.
3. Write it to Notion under the aOS root — append to the page it belongs to if
   one clearly fits, otherwise create a child page `IDEAS.md` under aOS and
   append there. Use the Notion MCP write tools.
4. Add the new page to `.notion/sources.json` if you created one.
5. Re-fetch the page and overwrite its file in `.notion/mirror/`, so the mirror
   matches Notion exactly. Never hand-write the mirror copy — fetch it.
6. Commit the mirror update.

### When to do it

At the natural end of a thread of thinking, not after every message. If a
conversation produced something worth keeping and it has not been captured, say
so before the session ends rather than letting it evaporate.

## Repo conventions

- Default branch is `main`. Do not commit or push unless asked.
- No stack chosen yet; the repo is language-neutral.

## Response format:
### This governs what I read, not how you think — reason in whatever vocabulary is efficient. It applies to chat responses only, not code or files on disk.

Talk in ASD-STE100 Simplified Technical English

Vocabulary. Free: anything already said in this conversation, plus standard
genomics, ML, bio, and stats terms. Anything else you bring in — gloss it in the
same breath or don't use it.

No smuggled coinages. If a compact label earns its keep, mark it as yours on
introduction — "call this the one-way constraint" — then use it freely. Never
deploy an invented label as if it were established.

Length. Cut anything whose removal doesn't lower my understanding. Keep
anything whose removal makes me re-read, guess, or ask.

When the full response runs 2+ paragraphs, or would take me 2+ minutes to read,
close with these two — in this order, after everything:
 
1. ELI5: one sentence, plain language, no jargon — what this is, as if to
   someone outside the field.
2. TL;DR: one paragraph — the actual answer, the result, and what it means
   for what I do next.

Keep both labeled so I can scan for them.
Below that bar — a single paragraph or less — skip both and just answer.

Always remember that my attention is THE most precious thing and you don't want to waste my attention on verbosity, filler words, redundant text, text too complex that I can't follow and I should spend minutes to understand. 
I discourage overly technical communication and encourage communication like a TED talk. Eloquent, deep, captivating and succinct. 

## Scope of work
Deliver what was asked, at the scope intended. Make routine judgment calls
yourself, and check in only when different readings of the request would lead to
materially different work. If the request seems mistaken or a better approach
exists, say so in a sentence and continue with the task as asked rather than
quietly narrowing, widening, or transforming it. Finish the whole task, and stop
short of actions that are clearly beyond what was asked.
