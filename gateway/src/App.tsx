import { useCallback, useEffect, useRef, useState } from 'react'
import { createRegistry } from './registry'
import { Icon, ScreenView, Thinking } from './Surface'
import { Trace, type Message } from './Trace'
import { FIXTURES } from './fixtures'
import './shell.css'

const SERVICE = import.meta.env.VITE_AOS_SERVICE ?? 'http://127.0.0.1:9310'
const registry = createRegistry()

interface Screen {
  document: string
  state: 'idle' | 'thinking' | 'ready'
  working: boolean
}

const IDLE: Screen = { document: '', state: 'idle', working: false }

export default function App() {
  const [screen, setScreen] = useState<Screen>(IDLE)
  const [messages, setMessages] = useState<Message[]>([])
  const [dbError, setDbError] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)

  /** Blank screen, empty thread. The only way back to a clean start. */
  const reset = useCallback(() => {
    setScreen(IDLE); setDraft(''); setTyping(false)
    fetch(`${SERVICE}/reset`, { method: 'POST' }).catch(() => {})
  }, [])

  // One screen, held by the service. The browser keeps no state of its own.
  useEffect(() => {
    const stream = new EventSource(`${SERVICE}/events`)
    stream.onopen = () => setLive(true)
    stream.onerror = () => setLive(false)
    stream.onmessage = event => {
      const data = JSON.parse(event.data)
      setScreen(data.screen ?? IDLE)
      setMessages(data.messages ?? [])
      setDbError(data.dbError ?? null)
    }
    return () => stream.close()
  }, [])

  useEffect(() => { if (typing) input.current?.focus() }, [typing])

  const ask = useCallback(async (text: string) => {
    if (!text.trim()) return
    setDraft(''); setTyping(false)
    if (!live) {
      // Local fallback so the renderer stays testable with the service down.
      const key = Object.keys(FIXTURES).find(k => k.includes(text.trim().toLowerCase()))
      setScreen({
        document: FIXTURES[key ?? Object.keys(FIXTURES)[0]],
        state: 'ready',
        working: false,
      })
      return
    }
    await fetch(`${SERVICE}/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    }).catch(() => setLive(false))
  }, [live])

  return (
    <div className="stage">
      <div className="column">
        <div className={`phone ${screen.working ? 'is-working' : ''}`}>
          <div className="notch" />

          <div className="body">
            {screen.state === 'idle' && (
              <div className="idle">
                <div className="sup">Sup?</div>
                {!live && (
                  <div className="offline">
                    Renderer service not connected. Local screens only.
                  </div>
                )}
              </div>
            )}
            {screen.state === 'thinking' && <Thinking />}
            {screen.state === 'ready' && (
              <ScreenView document={screen.document} registry={registry} />
            )}
          </div>

          <div className="bar">
            {typing ? (
              <form className="compose" onSubmit={e => { e.preventDefault(); ask(draft) }}>
                <input
                  ref={input}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onBlur={() => !draft && setTyping(false)}
                  placeholder="Ask for something"
                />
              </form>
            ) : (
              <>
                <button onClick={() => setTyping(true)} aria-label="Type"><Icon name="keyboard" /></button>
                <button aria-label="Speak"><Icon name="mic" /></button>
                <button aria-label="Send a picture"><Icon name="image" /></button>
              </>
            )}
          </div>
        </div>
        <div className="device">
          <span>{live ? 'connected to Hermes' : 'offline'} · 390 × 844</span>
          <button className="reset" onClick={reset}>start over</button>
        </div>
      </div>

      {/* Hermes' own messages, verbatim. Not part of aOS. */}
      <Trace
        messages={messages}
        dbError={dbError}
        onClear={reset}
      />
    </div>
  )
}
