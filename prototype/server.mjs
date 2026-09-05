/* aOS prototype — local agent bridge.  PROTOTYPE, throwaway.
 *
 *   node prototype/server.mjs        →  http://localhost:4173
 *
 * Serves the prototype and proxies every turn to your local Claude Code
 * (`claude -p`), so it runs on the account you are already signed in to —
 * no API key. Claude returns a screen in the aOS block language and the
 * page renders it. Every UI it produces is invented; nothing is connected.
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const MODEL = process.env.AOS_MODEL || 'sonnet';
const SYSTEM = await readFile(join(HERE, 'agent-prompt.md'), 'utf8');

// Run the agent somewhere with no CLAUDE.md — otherwise it loads the project
// context and every turn costs ~60x more.
const SANDBOX = join(HERE, '.agent-cwd');
await import('node:fs/promises').then(fs => fs.mkdir(SANDBOX, { recursive: true }));

const STATS = { turns: 0, ok: 0, badJson: 0, lastMs: 0, lastCost: 0, totalCost: 0 };

function claudeArgs(prompt, session) {
  const a = [
    '-p', prompt,
    '--model', MODEL,
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--verbose',
    '--tools', '',
    '--strict-mcp-config',
    '--mcp-config', '{"mcpServers":{}}',
    '--system-prompt', SYSTEM,
  ];
  if (session) a.push('--resume', session);
  return a;
}

function turnPrompt({ text, event, screen, dropped }) {
  const note = dropped?.length
    ? `\n\nThe display could not fit these tiles last turn and dropped them: ${dropped.join(', ')}. ` +
      `Send fewer or smaller tiles, and do not claim you showed something that was dropped.`
    : '';
  if (event) {
    return `The user acted on the screen.\n\n` +
      `Block: ${event.block}  in tile: ${event.tile}\n` +
      `Action: ${event.action}${event.value ? `  value: ${event.value}` : ''}\n` +
      `Values in that tile: ${JSON.stringify(event.values || {})}\n` +
      `Tiles currently on screen: ${JSON.stringify(screen || [])}${note}\n\n` +
      `Return the next screen.`;
  }
  return `The user said: "${text}"\n` +
    `Tiles currently on screen: ${JSON.stringify(screen || [])}${note}\n\n` +
    `Return the screen.`;
}

const stripFence = s => s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

function readBody(req) {
  return new Promise((res, rej) => {
    let b = ''; req.on('data', c => (b += c));
    req.on('end', () => { try { res(JSON.parse(b || '{}')); } catch (e) { rej(e); } });
  });
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, model: MODEL, stats: STATS }));
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/aos-screen.html')) {
    const html = await readFile(join(HERE, 'aos-screen.html'), 'utf8');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  if (req.method === 'POST' && url.pathname === '/agent') {
    const body = await readBody(req).catch(() => ({}));
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    const send = o => res.write(`data: ${JSON.stringify(o)}\n\n`);

    const started = Date.now();
    STATS.turns++;
    const child = spawn('claude', claudeArgs(turnPrompt(body), body.session), {
      cwd: SANDBOX, env: process.env,
    });

    let text = '', line = '', saidSay = false, session = body.session || null, cost = 0;

    child.stdout.on('data', chunk => {
      line += chunk.toString();
      const parts = line.split('\n'); line = parts.pop();
      for (const p of parts) {
        if (!p.trim()) continue;
        let ev; try { ev = JSON.parse(p); } catch { continue; }

        if (ev.session_id) session = ev.session_id;
        if (ev.type === 'result') { cost = ev.total_cost_usd || 0; }

        const d = ev.type === 'stream_event' && ev.event?.delta;
        if (d?.type === 'thinking_delta') { send({ type: 'thinking' }); continue; }
        if (d?.type !== 'text_delta') continue;
        text += d.text;

        // Surface `say` the moment it closes, so the agent starts talking
        // seconds before the screen is ready.
        if (!saidSay) {
          const m = text.match(/"say"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          if (m) { saidSay = true; send({ type: 'say', v: JSON.parse(`"${m[1]}"`) }); }
        }
      }
    });

    let err = '';
    child.stderr.on('data', c => (err += c.toString()));

    child.on('close', code => {
      const ms = Date.now() - started;
      STATS.lastMs = ms; STATS.lastCost = cost; STATS.totalCost += cost;
      const raw = stripFence(text);
      if (code !== 0 && !raw) {
        STATS.badJson++;
        send({ type: 'error', v: err.slice(0, 400) || `claude exited ${code}`, ms });
        return res.end();
      }
      try {
        const screen = JSON.parse(raw);
        STATS.ok++;
        send({ type: 'screen', screen, session, ms, cost, model: MODEL });
      } catch (e) {
        STATS.badJson++;
        send({ type: 'error', v: 'agent did not return valid JSON', raw: raw.slice(0, 500), ms });
      }
      res.end();
    });

    req.on('close', () => { try { child.kill(); } catch {} });
    return;
  }

  res.writeHead(404); res.end('nope');
}).listen(PORT, () => {
  console.log(`\n  aOS prototype  →  http://localhost:${PORT}`);
  console.log(`  agent: claude -p (${MODEL}), your local login, no API key`);
  console.log(`  every screen is generated; every fact in it is invented\n`);
});
