/**
 * aOS renderer service.
 *
 * Owns the contract. The Hermes plugin is deliberately dumb: it forwards a
 * document here and repeats whatever this says. So the tag registry, the
 * validator and the agent's instructions are all generated from `src/registry.ts`
 * and cannot drift apart.
 *
 *   npm run serve          → http://127.0.0.1:9310
 *
 * Routes
 *   GET  /events           the screen, streamed to the browser (SSE)
 *   GET  /prompt-text      the agent's instructions, for `hermes` to read
 *   POST /prompt           browser → here → Hermes bridge
 *   POST /show             the agent's screen. Validated before it is drawn.
 *   POST /fallback         the agent replied with text. Wrap it; never show nothing.
 *   POST /thinking         mark the screen busy
 *   POST /reset            wipe the screen and start a fresh Hermes thread
 *   POST /reset            wipe the screen and start a fresh Hermes thread
 */
import { createServer, type ServerResponse } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { StreamingParser } from '@mdocui/core'
import { createRegistry } from './src/registry'
import { checkScreen } from './src/validate'
import { systemPrompt } from './src/prompt'

const PORT = Number(process.env.AOS_PORT ?? 9310)
const BRIDGE = process.env.AOS_BRIDGE_URL ?? 'http://127.0.0.1:9311'

const registry = createRegistry()

/**
 * One screen. Not a list.
 *
 * Multiple live surfaces need a structure the agent shares — it has to know
 * what is already open and decide whether to reuse or replace. Until that
 * exists, a second window is only a way to lose the first. So each turn
 * replaces this wholesale, and the document the agent last sent is the screen.
 */
interface Screen {
  document: string
  state: 'idle' | 'thinking' | 'ready'
  /** The agent left a {% loading %} here: more is still coming. */
  working: boolean
}

/**
 * A message exactly as Hermes stored it. Nothing here is summarised or
 * reworded: it is the row, so what you read is what the model saw and said.
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

const IDLE: Screen = { document: '', state: 'idle', working: false }
let screen: Screen = { ...IDLE }

/**
 * Did the agent draw a screen since the last request?
 *
 * With one screen, last write wins — and the agent's closing "done, the screen
 * is up" would overwrite the screen it is describing. So once something is
 * drawn, prose stops being allowed to replace it for the rest of the turn. The
 * words are still counted, and they are still in the trace; they just do not
 * get to erase the answer.
 */
let drewThisTurn = false

/**
 * While a reset is in flight, nothing may draw on the screen.
 *
 * Hermes gates `/reset` behind a confirmation, and that confirmation arrives as
 * ordinary prose — so without this the reset button puts an "Approve Once /
 * Always Approve / Cancel" wall of text where the blank page should be. The
 * button means start over; the screen has to actually be blank.
 */
let quietUntil = 0

/** Send a line to Hermes as if the person typed it. */
async function toBridge(text: string): Promise<boolean> {
  try {
    const reply = await fetch(`${BRIDGE}/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    return reply.ok
  } catch {
    return false
  }
}

const pause = (ms: number) => new Promise(done => setTimeout(done, ms))

/** How often the agent reached for the escape hatch, and how often it ignored
 *  the contract and replied with prose. Both are the metrics that matter. */
const tally = { shown: 0, rejected: 0, escapeHatch: 0, fallbacks: 0 }

/**
 * The trace reads Hermes' own message store rather than logging our side of
 * the wire. Everything is already there: the prompt, the assistant text, the
 * aos_show call with its full document argument, and the JSON we returned as
 * the tool result. A second, prettier account of the same events would only be
 * somewhere for the two to disagree.
 *
 * Read-only. Never write to this file.
 */
const DB_PATH = process.env.HERMES_DB ?? join(homedir(), '.hermes', 'state.db')
const MESSAGE_LIMIT = 80

let db: DatabaseSync | null = null
let messages: Message[] = []
let dbError: string | null = null

/**
 * Start over means start over. The trace hides everything from before the
 * reset — by watermark, not by deletion: those rows are Hermes' record, not
 * ours to destroy.
 */
let traceFloor = 0

function readMessages(): boolean {
  try {
    if (!db) db = new DatabaseSync(DB_PATH, { readOnly: true })
    const rows = db
      .prepare(
        `SELECT id, role, content, tool_name, tool_call_id, tool_calls,
                reasoning, finish_reason, timestamp
           FROM messages
          WHERE session_id IN (SELECT id FROM sessions WHERE source = 'aos')
            AND id > ?
          ORDER BY id DESC
          LIMIT ?`,
      )
      .all(traceFloor, MESSAGE_LIMIT) as unknown as Message[]
    const next = rows.reverse()
    const changed =
      next.length !== messages.length ||
      next[next.length - 1]?.id !== messages[messages.length - 1]?.id
    messages = next
    dbError = null
    return changed
  } catch (error) {
    dbError = `Cannot read ${DB_PATH}: ${error}`
    db = null // drop the handle so a restarted gateway is picked up next tick
    return false
  }
}

const clients = new Set<ServerResponse>()


function parse(source: string) {
  const parser = new StreamingParser({ knownTags: registry.knownTags() })
  parser.write(source)
  parser.flush()
  return { nodes: parser.getNodes(), meta: parser.getMeta() }
}

function state() {
  return { screen, tally, messages, dbError }
}

function broadcast() {
  const frame = `data: ${JSON.stringify(state())}\n\n`
  for (const client of clients) client.write(frame)
}

// Hermes writes as the turn runs, so poll rather than wait on our own routes.
setInterval(() => { if (readMessages()) broadcast() }, 700)

function json(res: ServerResponse, status: number, body: unknown) {
  const raw = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
  })
  res.end(raw)
}

function readBody(req: import('node:http').IncomingMessage): Promise<any> {
  return new Promise(resolve => {
    let raw = ''
    req.on('data', chunk => (raw += chunk))
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch { resolve({}) }
    })
  })
}


createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')

  if (req.method === 'OPTIONS') return json(res, 204, {})

  if (url.pathname === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'access-control-allow-origin': '*',
    })
    clients.add(res)
    readMessages()
    res.write(`data: ${JSON.stringify(state())}\n\n`)
    req.on('close', () => clients.delete(res))
    return
  }

  if (url.pathname === '/prompt-text') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' })
    return res.end(systemPrompt(registry))
  }

  if (req.method !== 'POST') return json(res, 404, { ok: false })

  const body = await readBody(req)

  // The browser asks for something. The screen goes busy; the agent replaces
  // it when it answers.
  if (url.pathname === '/prompt') {
    const text = String(body.text ?? '').trim()
    if (!text) return json(res, 400, { ok: false, error: 'text was empty' })
    drewThisTurn = false
    screen = { ...screen, state: 'thinking' }
    broadcast()
    try {
      const reply = await fetch(`${BRIDGE}/prompt`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      return json(res, 200, { ok: reply.ok })
    } catch (error) {
      return json(res, 502, {
        ok: false,
        error: `Hermes bridge unreachable at ${BRIDGE}. Is \`hermes gateway run\` up? (${error})`,
      })
    }
  }

  // The agent's screen. Nothing is drawn until it passes.
  if (url.pathname === '/show') {
    const document = String(body.document ?? '')
    const { nodes, meta } = parse(document)
    const report = checkScreen(nodes, meta, registry)

    if (!report.ok) {
      tally.rejected++
      return json(res, 200, { ok: false, errors: report.errors })
    }

    tally.shown++
    if (report.stats.usedHtml) tally.escapeHatch++

    drewThisTurn = true
    screen = { document, state: 'ready', working: report.stats.working }
    broadcast()
    return json(res, 200, { ok: true, stats: report.stats })
  }

  // The agent answered with prose. Show it anyway, and count it.
  //
  // Replaces the screen, like everything else. A working agent narrates
  // several times per turn, and each line simply overwrites the last.
  if (url.pathname === '/fallback') {
    tally.fallbacks++
    const text = String(body.text ?? '').trim()
    // A screen already answered this. Do not let the closing remark erase it.
    if (drewThisTurn) return json(res, 200, { ok: true, ignored: 'a screen is up' })
    if (Date.now() < quietUntil) return json(res, 200, { ok: true, ignored: 'resetting' })
    const document = `{% callout type="info" title="The agent replied in words" %}\n${text}\n{% /callout %}`
    screen = { document, state: 'ready', working: false }
    broadcast()
    return json(res, 200, { ok: true })
  }

  // Forget everything on screen. Useful while testing.
  if (url.pathname === '/clear') {
    screen = { ...IDLE }
    broadcast()
    return json(res, 200, { ok: true })
  }

  /**
   * Start over: blank screen, empty thread.
   *
   * `/reset` is Hermes' own trigger for dropping a conversation's context, so
   * the thread is cleared where it actually lives rather than only looking
   * cleared here. The screen goes back to idle either way — a reset that left
   * the last screen up would be a lie.
   */
  if (url.pathname === '/reset') {
    screen = { ...IDLE }
    drewThisTurn = false
    // Everything already in the store belongs to the old thread.
    try {
      if (!db) db = new DatabaseSync(DB_PATH, { readOnly: true })
      const top = db.prepare('SELECT MAX(id) AS top FROM messages').get() as { top: number | null }
      traceFloor = top?.top ?? traceFloor
    } catch { /* leave the floor where it is */ }
    messages = []
    quietUntil = Date.now() + 25_000
    broadcast()

    const sent = await toBridge('/reset')
    if (!sent) {
      quietUntil = 0
      // The screen is clear regardless; say plainly that the thread is not.
      return json(res, 200, { ok: true, thread: 'unreachable' })
    }

    // Hermes asks to confirm before discarding history. The person already
    // said so by pressing the button, so answer it for them — once, not
    // "always", because silencing a confirmation permanently is not ours to do.
    await pause(1800)
    await toBridge('/approve')

    // Anything still arriving is the tail of the old thread. Stay blank.
    await pause(1200)
    screen = { ...IDLE }
    broadcast()
    return json(res, 200, { ok: true, thread: 'reset' })
  }

  if (url.pathname === '/thinking') {
    screen = { ...screen, state: 'thinking' }
    broadcast()
    return json(res, 200, { ok: true })
  }

  return json(res, 404, { ok: false })
}).listen(PORT, '127.0.0.1', () => {
  console.log(`aOS renderer service on http://127.0.0.1:${PORT}`)
  console.log(`  bridge → ${BRIDGE}`)
})
