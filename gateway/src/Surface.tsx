import { useMemo } from 'react'
import { StreamingParser, type ComponentRegistry } from '@mdocui/core'
import { Renderer } from '@mdocui/react'
import { components, hydrateEscapes, stripBlankProse, themeClassNames } from './components'

/** The flower that means the agent is working. */
export function Thinking() {
  return (
    <div className="thinking">
      <svg viewBox="0 0 100 100" width="52" height="52" aria-hidden="true">
        <g fill="var(--accent)">
          {Array.from({ length: 6 }, (_, i) => (
            <ellipse key={i} cx="50" cy="26" rx="12" ry="21"
                     transform={`rotate(${i * 60} 50 50)`} />
          ))}
        </g>
      </svg>
      <span>thinking...</span>
    </div>
  )
}

export function ScreenView({
  document,
  registry,
}: {
  document: string
  registry: ComponentRegistry
}) {
  const { nodes, meta } = useMemo(() => {
    const parser = new StreamingParser({ knownTags: registry.knownTags() })
    parser.write(document)
    parser.flush()
    return { nodes: parser.getNodes(), meta: parser.getMeta() }
  }, [document, registry])

  const tree = useMemo(() => stripBlankProse(hydrateEscapes(nodes)), [nodes])
  const classNames = useMemo(() => themeClassNames(registry.names()), [registry])

  return (
    <div className="screen">
      <Renderer
        nodes={tree}
        components={components}
        registry={registry}
        meta={meta}
        classNames={classNames}
      />
    </div>
  )
}

/** The three ways in. Line icons, to sit quietly under the screen. */
export function Icon({ name }: { name: 'keyboard' | 'mic' | 'image' }) {
  const common = {
    width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.7,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  if (name === 'keyboard') {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="2" y="6" width="20" height="12" rx="3" />
        <path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M6 13.6h.01M9.5 13.6h.01M13 13.6h.01M16.5 13.6h.01" />
      </svg>
    )
  }
  if (name === 'mic') {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="9.5" y="2.5" width="5" height="11" rx="2.5" />
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
      </svg>
    )
  }
  return (
    <svg {...common} aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
      <circle cx="16" cy="9" r="1.4" />
      <path d="M3 16.5l4.8-4.6a2 2 0 0 1 2.8 0l5.2 5.1" />
    </svg>
  )
}
