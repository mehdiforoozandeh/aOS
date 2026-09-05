# Running aOS

Two processes and two symlinks. Fifteen minutes on a clean machine.

## What you need

- **macOS on Apple Silicon.** Hermes does not support Intel macOS.
- **Node 20 or newer.** `gateway/.nvmrc` pins 22.
- **[Hermes Agent](https://hermes-agent.nousresearch.com/docs/)** — the agent
  kernel. aOS is a gateway on top of it.

Claude Code is how this repo is developed, not something it runs on. The
gateway needs Hermes and Node, nothing else.

## 1. Install Hermes

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

Then point it at a model with `hermes model`. **Pick one that is good at
calling tools.** The whole contract runs through a single tool call, so a weak
model produces prose instead of screens and nothing works. A free model that
worked in testing:

```bash
hermes config set model.default meituan/longcat-2.0:free
```

On macOS, launchd strips PATH, so add this to `~/.hermes/config.yaml` before
using `hermes gateway install`:

```yaml
terminal:
  shell_init_files: [~/.zshrc]
```

## 2. Install the aOS plugin and skill

Both are symlinks, so edits in this repo are live without reinstalling.

```bash
mkdir -p ~/.hermes/plugins ~/.hermes/skills
ln -sfn "$(pwd)/gateway-plugin" ~/.hermes/plugins/aos
ln -sfn "$(pwd)/gateway-plugin/skills" ~/.hermes/skills/aos
hermes plugins enable aos
```

Check it loaded:

```bash
hermes plugins doctor aos
```

Expect `manifest: aos 0.1.0 (platform)` and `1 tool(s)`.

## 3. Turn the platform on

```bash
hermes config set gateway.platforms.aos.enabled true
hermes config set gateway.platforms.aos.home_channel.platform aos
hermes config set gateway.platforms.aos.home_channel.chat_id main
hermes config set gateway.platforms.aos.home_channel.name "aOS surface"
```

The home channel is not optional in practice: without it, every new thread
opens by asking you to set one, which blocks the first real turn.

## 4. Start the two processes

The renderer service owns the contract; the dev server serves the page.

```bash
cd gateway && npm install
```

```bash
npm run serve
```

```bash
npm run dev
```

Then start the gateway and open the surface:

```bash
hermes gateway run
```

Open **http://localhost:5273**. The first message pairs the surface; approve it
with the code it prints:

```bash
hermes pairing approve aos <CODE>
```

## Ports

| Port | Process |
| --- | --- |
| 5273 | the page (Vite dev server) |
| 9310 | renderer service — validates documents, holds the screen |
| 9311 | bridge — the Hermes adapter's inbound listener |

Override with `AOS_PORT`, `AOS_BRIDGE_PORT`, `AOS_RENDERER_URL`, `HERMES_DB`.

## Checking it works

```bash
curl -s -X POST localhost:9310/show -H 'content-type: application/json' \
  -d '{"document":"{% say %}Hello.{% /say %}\n\n# It works\n\n{% stat label=\"Ports\" value=\"3\" /%}"}'
```

`{"ok":true,...}` means the contract is live. A screen should appear on the
page. If you get a connection error, the renderer service is not running.

## Where things live

| Path | What it is |
| --- | --- |
| `gateway-plugin/` | the Hermes plugin: adapter, `aos_show` tool, skill |
| `gateway/server.ts` | renderer service — registry, validator, screen state |
| `gateway/src/` | the surface: shell, theme, blocks, trace panel |
| `gateway/README.md` | the contract, the design decisions, the known rough edges |
| `DESIGN.md` | what aOS is and why |
