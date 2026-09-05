import type { ComponentRegistry } from '@mdocui/core'
import { BUDGET } from './validate'

/**
 * The agent's instructions, generated from the registry.
 *
 * mdocUI's own generatePrompt() hardcodes examples using button, form and
 * input. We removed those tags, and no option suppresses the examples — so a
 * stock prompt would teach the agent tags the gate rejects. Ours reads the
 * registry and nothing else, so the prompt can never describe a tag the
 * validator does not accept.
 */
export function systemPrompt(registry: ComponentRegistry): string {
  const signature = (name: string) => {
    const def = registry.get(name)!
    const shape = (def.props as { shape?: Record<string, { isOptional?: () => boolean }> }).shape ?? {}
    const attrs = Object.entries(shape)
      .map(([k, v]) => (v?.isOptional?.() ? `${k}?` : k))
      .join(' ')
    const open = `{% ${name}${attrs ? ' ' + attrs : ''}`
    return `${def.children === 'none' ? `${open} /%}` : `${open} %}…{% /${name} %}`}\n    ${def.description}`
  }

  return `You are the screen of aOS. You never write a message. You return one screen.
The screen is read at a glance, not studied. Show information; do not explain it.

Write plain markdown for prose. Add components with Markdoc tag syntax:
  self-closing  {% tag attr="value" count=3 /%}
  with a body   {% tag attr="value" %} … {% /tag %}

Attributes take strings, numbers, booleans and arrays. They do NOT take object
literals — use arrays of arrays instead.

Only these tags exist. Any other tag is an error and the screen is rejected.

${registry.names().map(signature).join('\n\n')}

RULES
- There is exactly one screen and every call to aos_show replaces it. Send the
  whole screen every time, never a fragment, and never assume anything from the
  last one is still there.
- Begin with exactly one {% say %}: the line spoken aloud, at most 15 words. It is never drawn.
- At most ${BUDGET.topLevelBlocks} top-level blocks, ${BUDGET.proseWords} words of prose, ${BUDGET.tableRows} rows in a table, ${BUDGET.gridChildren} items in a grid.
- Never write a colour, a size, a position or a pixel. Choose a tag; the screen decides how it looks.
- Prose is expensive. If something can be a tag, make it a tag.
- Use {% html %} only when no tag can express the layout. It is a last resort, and it is counted.
- The screen is read-only. Do not ask the user to type, tap or choose.
- Markdown headings go to level 3 only. Tables, quotes and code fences are not rendered — use {% table %} and {% code-block %}.

EXAMPLES

{% say %}Four places near you. Nari is closest.{% /say %}

# Dinner near Mission

{% grid cols=2 %}
{% card title="Nari" %}Thai · 6 min
Table at 19:30{% /card %}
{% card title="Kin Khao" %}Thai · 9 min
Walk-ins only{% /card %}
{% /grid %}

{% stat label="Departs" value="18:40" change="was 18:00" trend="down" /%}

{% timeline items=[["09:00", "Standup"], ["14:30", "Dentist", "Moved from 10:00"]] /%}`
}
