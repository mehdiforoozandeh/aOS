/**
 * The trace: Hermes' own messages, verbatim.
 *
 * Nothing on this panel is written by us. Each row is a record from the agent's
 * message store, so the document you see in an `aos_show` call is the exact
 * string that produced the screen next to it.
 */

interface Message {
  id: number
  role: string
  content: string | null
  tool_name: string | null
  tool_call_id: string | null
  tool_calls: string | null
  reasoning: string | null
  finish_reason: string | null
  timestamp: number | null
}

interface ToolCall {
  name: string
  args: Record<string, unknown> | string
}

/**
 * Tool call payloads arrive as JSON inside JSON, and sometimes inside a second
 * envelope: some models emit `function.name = "tool_call"` with the real name
 * and arguments nested one level down. Hermes unwraps that when it routes the
 * call, so the trace has to as well, or every aos_show reads as an opaque blob
 * named `tool_call` and the document stays hidden.
 */
function parseToolCalls(raw: string | null): ToolCall[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(call => {
      const fn = call?.function ?? {}
      let name = String(fn.name ?? call?.name ?? 'unknown')
      let args: Record<string, unknown> | string = fn.arguments ?? {}
      if (typeof args === 'string') {
        try { args = JSON.parse(args) } catch { /* leave it as the raw string */ }
      }
      // The envelope: {name, arguments} standing in for the real call.
      if (
        args && typeof args === 'object' &&
        typeof (args as Record<string, unknown>).name === 'string' &&
        'arguments' in args
      ) {
        const inner = args as { name: string; arguments: unknown }
        name = inner.name
        args = (inner.arguments ?? {}) as Record<string, unknown>
      }
      return { name, args }
    })
  } catch {
    return []
  }
}

function Copy({ text }: { text: string }) {
  return (
    <button className="copy" onClick={() => navigator.clipboard?.writeText(text)}>
      copy
    </button>
  )
}

/** A long string, shown whole. Truncating the trace would defeat its purpose. */
function Raw({ text, kind }: { text: string; kind?: string }) {
  return (
    <div className={`raw ${kind ?? ''}`}>
      <Copy text={text} />
      <pre>{text}</pre>
    </div>
  )
}

function stamp(t: number | null) {
  return t ? new Date(t * 1000).toLocaleTimeString() : ''
}

function MessageRow({ message }: { message: Message }) {
  const calls = parseToolCalls(message.tool_calls)
  const label = message.role === 'tool' ? `tool result · ${message.tool_name}` : message.role

  return (
    <li className={message.role}>
      <div className="row">
        <span className="kind">{label}</span>
        <time>{stamp(message.timestamp)}</time>
      </div>

      {message.reasoning ? (
        <details className="reasoning">
          <summary>reasoning</summary>
          <pre>{message.reasoning}</pre>
        </details>
      ) : null}

      {message.content ? <Raw text={message.content} /> : null}

      {calls.map((call, i) => {
        const args = call.args
        const doc = typeof args === 'object' && args !== null
          ? (args as Record<string, unknown>).document
          : undefined
        const rest = typeof args === 'object' && args !== null
          ? Object.fromEntries(Object.entries(args).filter(([k]) => k !== 'document'))
          : args

        return (
          <div className="call" key={i}>
            <div className="call-name">{call.name}(…)</div>
            {typeof doc === 'string' ? <Raw text={doc} kind="document" /> : null}
            {Object.keys(rest ?? {}).length || typeof rest === 'string' ? (
              <Raw text={typeof rest === 'string' ? rest : JSON.stringify(rest, null, 2)} />
            ) : null}
          </div>
        )
      })}

      {message.finish_reason ? (
        <div className="finish">finish_reason: {message.finish_reason}</div>
      ) : null}
    </li>
  )
}

export function Trace({
  messages,
  dbError,
  onClear,
}: {
  messages: Message[]
  dbError: string | null
  onClear: () => void
}) {
  return (
    <aside className="trace">
      <header>
        <span>hermes messages</span>
        <button onClick={onClear}>start over</button>
      </header>
      <ol>
        {dbError ? <li className="empty">{dbError}</li> : null}
        {!dbError && messages.length === 0 ? (
          <li className="empty">Nothing yet. Ask for something.</li>
        ) : null}
        {[...messages].reverse().map(m => <MessageRow key={m.id} message={m} />)}
      </ol>
    </aside>
  )
}

export type { Message }
