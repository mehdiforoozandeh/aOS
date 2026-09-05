import type { ASTNode, ComponentNode, ComponentRegistry, ParseMeta } from '@mdocui/core'

/**
 * The screen budget.
 *
 * Markdoc has no idea a screen has edges — a document scrolls forever. These
 * numbers are the missing constraint. They are guesses. Watch them on a real
 * phone and change them; they are an empirical constant, not a design decision.
 */
export const BUDGET = {
  topLevelBlocks: 8,
  // Free-standing prose only. Text inside a card or a callout is not counted,
  // because there it has a role. This budget is for text with no block around
  // it, which is the one thing that turns a screen back into a message. Kept
  // very small on purpose: a heading and a one-line lead-in, no more.
  proseWords: 25,
  tableRows: 6,
  // Measured, not guessed: four columns need 392px and the screen has 372.
  // The column that falls off the edge is always the last one, which is
  // usually the one the person came for.
  tableColumns: 3,
  gridChildren: 6,
}

export interface ScreenReport {
  ok: boolean
  /** Agent-readable. Each string goes straight back in the repair turn. */
  errors: string[]
  stats: {
    proseWords: number
    topLevelBlocks: number
    tags: number
    usedHtml: boolean
    /** True while any {% loading %} is on the screen — the agent is not done. */
    working: boolean
    tagCounts: Record<string, number>
  }
}

const words = (s: string) =>
  s.replace(/[#*_`>|-]/g, ' ').split(/\s+/).filter(Boolean).length

function walk(nodes: ASTNode[], visit: (n: ComponentNode, depth: number) => void, depth = 0) {
  for (const node of nodes) {
    if (node.type !== 'component') continue
    visit(node, depth)
    walk(node.children, visit, depth + 1)
  }
}

/**
 * The gate. Runs after parse, before the screen is drawn. Anything it rejects
 * goes back to the agent as text it can act on, not a stack trace.
 */
export function checkScreen(
  nodes: ASTNode[],
  meta: ParseMeta,
  registry: ComponentRegistry,
): ScreenReport {
  const errors: string[] = []
  const tagCounts: Record<string, number> = {}

  // 1. Parse-level failures: unknown tag, unclosed body, malformed syntax.
  for (const e of meta.errors) {
    errors.push(`${e.code}: ${e.message}${e.raw ? ` — in \`${e.raw}\`` : ''}`)
  }

  // 2. Prop validation. The parser does not do this; the registry does, and
  //    only when asked. Zod's messages are already the right shape to send back.
  let tags = 0
  walk(nodes, node => {
    tags++
    tagCounts[node.name] = (tagCounts[node.name] ?? 0) + 1
    const result = registry.validate(node.name, node.props)
    if (!result.valid) {
      for (const msg of result.errors) errors.push(`{% ${node.name} %} — ${msg}`)
    }
    if (node.name === 'table') {
      const headers = node.props.headers
      if (Array.isArray(headers) && headers.length > BUDGET.tableColumns) {
        errors.push(
          `{% table %} has ${headers.length} columns; ${BUDGET.tableColumns} fit the screen. ` +
            `The rest are cut off the right edge where nobody sees them. Keep the ` +
            `${BUDGET.tableColumns} that decide the answer and drop the others.`,
        )
      }
      const rows = node.props.rows
      if (Array.isArray(rows) && rows.length > BUDGET.tableRows) {
        errors.push(
          `{% table %} has ${rows.length} rows; the screen fits ${BUDGET.tableRows}. Show the most useful ${BUDGET.tableRows}.`,
        )
      }
    }
    if (node.name === 'grid' && node.children.filter(c => c.type === 'component').length > BUDGET.gridChildren) {
      errors.push(
        `{% grid %} holds more than ${BUDGET.gridChildren} items; the screen fits ${BUDGET.gridChildren}.`,
      )
    }
  })

  // 2b. Two mistakes the agent makes constantly, each with an exact fix.
  //
  // A markdown table is invisible: the prose renderer covers headings and
  // lists only, so a pipe table prints as literal pipes. The agent cannot see
  // that, so it has to be told.
  //
  // {% endcard %} is a Liquid habit. Markdoc closes with {% /card %}. The
  // parser drops the unknown tag and the body silently leaks into the page.
  for (const node of nodes) {
    if (node.type !== 'prose') continue
    if (/^[ \t]*\|.*\|/m.test(node.content)) {
      errors.push(
        'There is a markdown table here. Markdown tables are not drawn — they ' +
          'print as literal pipe characters. Use {% table headers=[…] rows=[[…]] /%}.',
      )
    }
  }
  for (const e of meta.errors) {
    const end = /^end([a-z-]+)$/.exec(e.tagName)
    if (end) {
      errors.push(
        `{% ${e.tagName} %} is not a tag. Markdoc closes a block with ` +
          `{% /${end[1]} %}, not {% end${end[1]} %}.`,
      )
    }
  }

  // 3. The screen budget — the part Markdoc cannot know about.
  const proseWords = nodes
    .filter(n => n.type === 'prose')
    .reduce((sum, n) => sum + words((n as { content: string }).content), 0)
  const topLevelBlocks = nodes.filter(
    n => n.type === 'component' || (n.type === 'prose' && n.content.trim()),
  ).length

  // The rule a word count cannot express.
  //
  // A short wall of text slips under any budget you pick, so the budget alone
  // never stops the agent turning the screen back into a message. This does:
  // a screen made only of prose is not a screen. It says so in the terms the
  // agent can act on — name the facts, pick tags for them.
  const drawnTags = tags - (tagCounts.say ?? 0)
  if (drawnTags === 0 && proseWords > 12) {
    errors.push(
      `This screen is ${proseWords} words of prose and not one tag — that is a message, ` +
        `not a screen. Take each fact in it and give the fact a tag: a number is {% stat %}, ` +
        `things to compare are {% card %} in a {% grid %}, rows are {% table %}, a warning is ` +
        `{% callout %}, things in time order are {% timeline %}. Then send it again.`,
    )
  }

  if (proseWords > BUDGET.proseWords) {
    errors.push(
      `There are ${proseWords} words of text sitting loose on the screen; the ` +
        `limit is ${BUDGET.proseWords}. Loose text is a message. Text belongs ` +
        `inside a block that gives it a role: a number in {% stat %}, a warning ` +
        `in {% callout %}, a thing being compared in {% card %}. Move it, do not ` +
        `shorten it.`,
    )
  }
  if (topLevelBlocks > BUDGET.topLevelBlocks) {
    errors.push(
      `The screen has ${topLevelBlocks} top-level blocks; the limit is ${BUDGET.topLevelBlocks}. Show less.`,
    )
  }

  // 4. House rules for our own tags.
  if ((tagCounts.say ?? 0) > 1) errors.push('Exactly one {% say %} per screen.')
  if ((tagCounts.html ?? 0) > 1) errors.push('At most one {% html %} per screen.')

  return {
    ok: errors.length === 0,
    errors,
    stats: {
      proseWords,
      topLevelBlocks,
      tags,
      usedHtml: (tagCounts.html ?? 0) > 0,
      working: (tagCounts.loading ?? 0) > 0,
      tagCounts,
    },
  }
}

/** The repair turn. Sent back to the agent verbatim when the gate rejects. */
export function repairMessage(report: ScreenReport): string {
  return [
    'That screen did not pass. Fix these and send the whole screen again:',
    ...report.errors.map(e => `- ${e}`),
  ].join('\n')
}
