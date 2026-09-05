import type { ASTNode, ComponentNode } from '@mdocui/core'
import { defaultComponents, type ComponentMap, type ComponentProps } from '@mdocui/react'

/**
 * `{% say %}` is spoken, never drawn. The harness lifts it out of the tree
 * and shows it separately; on screen it renders nothing.
 */
function Say() {
  return null
}

/**
 * The escape hatch.
 *
 * Isolated on purpose: `sandbox=""` gives the frame an opaque origin AND no
 * script execution, so the body can lay itself out but cannot run anything,
 * reach our DOM, phone home, or read storage. The escape hatch buys layout
 * freedom, not capability. A locked-down CSP says the same thing twice.
 */
function EscapeHatch({ props }: ComponentProps) {
  const raw = String(props.__raw ?? '')
  const height = Number(props.height ?? 220)
  const doc = `<!doctype html><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:">
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; font: 15px/1.45 ui-sans-serif, -apple-system, system-ui, sans-serif;
    color: #0d0f12; background: transparent;
  }
  @media (prefers-color-scheme: dark) { body { color: #f2f4f7; } }
  * { box-sizing: border-box; max-width: 100%; }
</style>
${raw}`

  return (
    <div>
      {props.title ? <div className="escape-label">{String(props.title)}</div> : null}
      <iframe
        className="escape-frame"
        sandbox=""
        srcDoc={doc}
        style={{ height }}
        title={String(props.title ?? 'embedded layout')}
      />
    </div>
  )
}

/** The axis view: calendar, timeline and board collapse into this one tag. */
function Timeline({ props }: ComponentProps) {
  const items = Array.isArray(props.items) ? (props.items as unknown[]) : []
  return (
    <div className="timeline">
      {props.title ? <div className="timeline-title">{String(props.title)}</div> : null}
      {items.map((item, i) => {
        const row = Array.isArray(item) ? item.map(String) : [String(item)]
        const [when, what, note] = row
        return (
          <div className="timeline-row" key={i}>
            <div className="timeline-when">{when}</div>
            <div className="timeline-rail"><div className="timeline-dot" /></div>
            <div>
              <div className="timeline-what">{what}</div>
              {note ? <div className="timeline-note">{note}</div> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * mdocUI 0.7.2 applies Callout's inline styles unconditionally — unlike every
 * other component, it ignores the className escape. So the theme cannot reach
 * it and we replace it outright. Worth re-checking on each upgrade.
 */
function Callout({ props, children }: ComponentProps) {
  const type = String(props.type ?? 'info')
  return (
    <div
      data-mdocui-callout
      data-type={type}
      role={type === 'warning' || type === 'error' ? 'alert' : 'status'}
    >
      {props.title ? <div className="callout-title">{String(props.title)}</div> : null}
      {children}
    </div>
  )
}

/** A gap the agent has told us it is still filling. */
function Loading({ props }: ComponentProps) {
  const lines = Math.min(Math.max(Number(props.lines ?? 2), 1), 5)
  return (
    <div className="loading" role="status" aria-live="polite">
      {props.label ? <div className="loading-label">{String(props.label)}</div> : null}
      <div className="loading-lines">
        {Array.from({ length: lines }, (_, i) => (
          <div className="loading-line" key={i} style={{ width: `${100 - i * 17}%` }} />
        ))}
      </div>
    </div>
  )
}

export const components: ComponentMap = {
  ...defaultComponents,
  callout: Callout,
  loading: Loading,
  say: Say,
  html: EscapeHatch,
  timeline: Timeline,
}

/**
 * The body of `{% html %}` arrives as prose nodes, which the renderer would
 * happily print as text. Collapse it back to a raw string first, and drop the
 * children so nothing renders twice.
 */
export function hydrateEscapes(nodes: ASTNode[]): ASTNode[] {
  const rawOf = (children: ASTNode[]): string =>
    children
      .map(c => (c.type === 'prose' ? c.content : rawOf((c as ComponentNode).children)))
      .join('')

  return nodes.map(node => {
    if (node.type !== 'component') return node
    if (node.name === 'html') {
      return { ...node, props: { ...node.props, __raw: rawOf(node.children) }, children: [] }
    }
    return { ...node, children: hydrateEscapes(node.children) }
  })
}

/** Pull the spoken line out of the tree so the harness can show it. */
export function extractSay(nodes: ASTNode[]): string | null {
  for (const node of nodes) {
    if (node.type !== 'component') continue
    if (node.name === 'say') {
      return node.children
        .map(c => (c.type === 'prose' ? c.content : ''))
        .join('')
        .trim()
    }
    const found = extractSay(node.children)
    if (found) return found
  }
  return null
}

/**
 * Whitespace between two tags parses as a prose node. Inside a grid or a
 * stack that blank node becomes a real cell, so a two-column grid renders as
 * one column of gaps and one of content. Drop them.
 */
export function stripBlankProse(nodes: ASTNode[]): ASTNode[] {
  return nodes
    .filter(n => n.type !== 'prose' || n.content.trim().length > 0)
    .map(n => (n.type === 'component' ? { ...n, children: stripBlankProse(n.children) } : n))
}

/**
 * mdocUI's default components fall back to inline layout styles *unless* a
 * className is supplied. Supplying one for every tag switches the inline
 * styles off and hands the whole look to our theme file, which is the point.
 */
export function themeClassNames(tagNames: string[]): Record<string, string> {
  return Object.fromEntries(tagNames.map(n => [n, `aos-${n}`]))
}
