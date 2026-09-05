import { z } from 'zod'
import {
  ComponentRegistry,
  allDefinitions,
  defineComponent,
  type ComponentDefinition,
} from '@mdocui/core'

/**
 * Tags the agent may not use yet.
 * v1 is read-only: the screen shows, it does not collect. Deleting these
 * shrinks the prompt and removes a whole class of thing the agent can get
 * wrong. Flip them back on by emptying this set.
 */
const POSTPONED = new Set([
  'button', 'button-group', 'input', 'textarea',
  'select', 'checkbox', 'toggle', 'form', 'link',
])

/** The one line spoken aloud. Stripped before the screen is drawn. */
const say = defineComponent({
  name: 'say',
  description:
    'The single line spoken aloud to the user. Never appears on screen. Max 15 words. Exactly one per document, first.',
  props: z.object({}),
  children: 'any',
})

/**
 * The escape hatch. Rendered in a sandboxed frame with no access to the page.
 * Every use is logged: a repeated shape here is a missing tag, not a feature.
 */
const html = defineComponent({
  name: 'html',
  description:
    'Escape hatch for a layout no other tag can express. Body is plain HTML, rendered isolated. Use only as a last resort — prefer real tags.',
  props: z.object({
    title: z.string().optional(),
    height: z.coerce.number().optional(),
  }),
  children: 'any',
})

/**
 * The axis view — DataView's calendar/timeline/board shapes, collapsed into
 * one tag. Rows are arrays, not objects: mdocUI's attribute parser does not
 * read object literals.
 */
const timeline = defineComponent({
  name: 'timeline',
  description:
    'Events on an axis. items is an array of ["when", "what"] or ["when", "what", "detail"] pairs, already in order.',
  props: z.object({
    items: z.array(z.array(z.string())),
    title: z.string().optional(),
  }),
  children: 'none',
})

/**
 * Still working on this part.
 *
 * The agent often draws a screen and then keeps going — checking a price,
 * reading a second source. Without a way to say so, a half-finished screen is
 * indistinguishable from a finished one, and the person waits at a screen that
 * is never going to change. This tag is how the agent says "more is coming
 * here", and the surface stays visibly busy while any of them is on it.
 */
const loading = defineComponent({
  name: 'loading',
  description:
    'A placeholder for something you are still working on. Put it where the ' +
    'result will go, say what you are waiting for in `label`, and send the ' +
    'screen again without it once you have the answer.',
  props: z.object({
    label: z.string().optional(),
    lines: z.coerce.number().optional(),
  }),
  children: 'none',
})

export const CUSTOM: ComponentDefinition[] = [say, html, timeline, loading]

export function createRegistry(): ComponentRegistry {
  const registry = new ComponentRegistry()
  registry.registerAll(allDefinitions.filter(d => !POSTPONED.has(d.name)))
  registry.registerAll(CUSTOM)
  return registry
}

export const POSTPONED_TAGS = POSTPONED
